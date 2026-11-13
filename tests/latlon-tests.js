// 4.7.12 harness: lat/lon paste parsing.
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync(process.argv[2]||'./index.html','utf8');
const lines=src.split('\n');
const a=lines.findIndex(l=>l.startsWith('function _llNorm('));
const b=lines.findIndex((l,i)=>i>a && l.startsWith('function _latLonEntry('));
const body=lines.slice(a,b).join('\n');

let pass=0,fail=0;
const t=(n,c,x)=>{if(c){pass++;console.log("  ok   "+n);}else{fail++;console.log("  FAIL "+n+(x!==undefined?"  -> "+JSON.stringify(x):""));}};

const ctx=vm.createContext({Math,String,isFinite,parseFloat,console});
vm.runInContext(body+";this.__api={_parseLatLon,_llCheck,_llNorm,_llFmt};",ctx);
const P=ctx.__api._parseLatLon;

const near=(r,lat,lon,tol)=>r && Math.abs(r.lat-lat)<(tol||1e-4) && Math.abs(r.lon-lon)<(tol||1e-4);
const LAT=34.0143, LON=-86.0066;

console.log("— decimal —");
t("comma separated", near(P("34.0143, -86.0066"),LAT,LON), P("34.0143, -86.0066"));
t("space separated", near(P("34.0143 -86.0066"),LAT,LON));
t("no space after comma", near(P("34.0143,-86.0066"),LAT,LON));
t("leading/trailing space", near(P("  34.0143 , -86.0066  "),LAT,LON));
t("full precision from Maps", near(P("34.014300, -86.006600"),LAT,LON));
t("positive lon preserved (not forced west)", near(P("48.8584, 2.2945"),48.8584,2.2945));

console.log("— hemisphere letters —");
t("trailing letters", near(P("34.0143 N, 86.0066 W"),LAT,LON), P("34.0143 N, 86.0066 W"));
t("letters attached to the number", near(P("34.0143N 86.0066W"),LAT,LON));
t("southern/eastern", near(P("33.8688 S, 151.2093 E"),-33.8688,151.2093));
t("lon given first is reordered", near(P("86.0066 W, 34.0143 N"),LAT,LON), P("86.0066 W, 34.0143 N"));

console.log("— degrees / minutes / seconds —");
t("DMS with symbols", near(P("34\u00b000'51.5\"N 86\u00b000'23.8\"W"),34.014306,-86.006611,1e-5), P("34\u00b000'51.5\"N 86\u00b000'23.8\"W"));
t("DMS bare numbers", near(P("34 0 51.5 N 86 0 23.8 W"),34.014306,-86.006611,1e-5));
t("degrees and decimal minutes", near(P("34\u00b000.858'N 86\u00b000.396'W"),34.0143,-86.0066,1e-4));
t("DMS with no letters splits evenly", near(P("34 0 51.5 -86 0 23.8"),34.014306,-86.006611,1e-4), P("34 0 51.5 -86 0 23.8"));
t("curly quotes tolerated", near(P("34\u00b000\u203251.5\u2033N 86\u00b000\u203223.8\u2033W"),34.014306,-86.006611,1e-5));

console.log("— Google Maps links —");
t("place link uses !3d/!4d not the viewport",
  near(P("https://www.google.com/maps/place/Gadsden,+AL/@34.10,-86.10,14z/data=!3d34.0143!4d-86.0066"),LAT,LON),
  P("https://www.google.com/maps/place/x/@34.10,-86.10,14z/data=!3d34.0143!4d-86.0066"));
t("@ viewport link when that is all there is", near(P("https://www.google.com/maps/@34.0143,-86.0066,17z"),LAT,LON));
t("q= link", near(P("https://maps.google.com/?q=34.0143,-86.0066"),LAT,LON));
t("ll= link", near(P("https://maps.google.com/?ll=34.0143,-86.0066&z=17"),LAT,LON));

console.log("— rejection —");
[["empty",""],["prose","somewhere near the creek"],["one number","34.0143"],
 ["both values out of range","95.0, 200.0"],["lon out of range","34.0, -200.0"],
 ["null island","0, 0"],["letters only","N W"]].forEach(([n,v])=>t("rejects "+n, P(v)===null, P(v)));

console.log("— order inference —");
// Unambiguous: the first value cannot be a latitude, so it must be the longitude.
t("lon-first is reordered when the first value exceeds 90", near(P("-120.5, 45.2"),45.2,-120.5), P("-120.5, 45.2"));
// Ambiguous: both are legal latitudes, so the parser must NOT guess a locale.
// It takes lat-first as written and the live preview is what catches a mistake.
t("an ambiguous pair is not silently reordered", near(P("-86.0066, 34.0143"),-86.0066,34.0143), P("-86.0066, 34.0143"));
t("ambiguous pair keeps lat first", near(P("34.0143, 33.0000"),34.0143,33.0));

console.log("— wiring —");
t("start menu entry", /Paste Lat \/ Lon \(Google Maps\)/.test(src));
t("start flow defined", /function _latLonStartFlow\(jn\)\{/.test(src));
t("re-anchor uses the pasteable field", /_latLonEntry\("Anchor Position"/.test(src));
t("old two-step numeric lat\/lon entry removed", !/Longitude \(decimal deg, W is/.test(src));
t("real text input, not a tap grid", /inp\.type="text"/.test(src.match(/function _latLonEntry[\s\S]*?\n\}/)[0]));
t("clipboard button present", /navigator\.clipboard\.readText/.test(src));
t("live preview of what it parsed", /Reads as:/.test(src));
t("zone shown before committing", /_spcCandidates\(r\.lat,r\.lon\)\[0\]/.test(src));
const vA=(src.match(/const APP_VERSION = "([^"]+)";/)||[])[1];
const vB=(src.match(/content="ChainLink-v([^"]+)"/)||[])[1];
const vC=(src.match(/<title>ChainLink Survey v([^<]+)<\/title>/)||[])[1];
t("all three version sites agree", vA&&vA===vB&&vA===vC, [vA,vB,vC]);

console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
