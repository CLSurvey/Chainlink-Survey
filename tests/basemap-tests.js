// 4.7.8 harness: basemap set, zoom cap, Wayback release parsing and caching.
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync(process.argv[2]||'./index.html','utf8');
const lines=src.split('\n');
const a=lines.findIndex(l=>l.startsWith('const _WAYBACK_CAPS='));
const b=lines.findIndex((l,i)=>i>a && l.startsWith('function _satSetupFlow'));
const wb=lines.slice(a,b).join('\n');

let pass=0,fail=0;
const t=(n,c,x)=>{if(c){pass++;console.log("  ok   "+n);}else{fail++;console.log("  FAIL "+n+(x!==undefined?"  -> "+JSON.stringify(x).slice(0,240):""));}};

const store={};
const env={
  _lsGet:k=>store[k]==null?null:store[k], _lsSet:(k,v)=>{store[k]=v;},
  satBasemap:"esri", satOn:false, saveData:()=>{}, _syncSatBtn:()=>{}, plotPoints:()=>{},
  openModal:()=>{}, _esc:v=>String(v==null?"":v), document:{}, DOMParser:function(){},
  AbortController, setTimeout, clearTimeout, Date, Math, JSON, console, isFinite, parseInt, String, Map, Set, Array,
  fetch:async()=>{throw new Error("offline");}
};
const ctx=vm.createContext(env);
vm.runInContext(wb+";this.__api={_waybackParse,_waybackFetch,_waybackSet,_waybackRestore,_waybackCacheLoad,get REL(){return _waybackRel},get LBL(){return _waybackLabel},get TPL(){return _waybackTpl},get LIST(){return _waybackList},set LIST(v){_waybackList=v}};",ctx);
const A=env.__api;

// A capabilities document shaped like Esri's: ows-prefixed titles, ResourceURL
// templates carrying the release number in the /tile/ segment.
const CAPS=`<?xml version="1.0" encoding="UTF-8"?>
<Capabilities xmlns="http://www.opengis.net/wmts/1.0" xmlns:ows="http://www.opengis.net/ows/1.1">
<Contents>
<Layer>
  <ows:Title>World Imagery (Wayback 2023-12-07)</ows:Title>
  <ows:Identifier>WB_2023_R11</ows:Identifier>
  <ResourceURL format="image/jpeg" resourceType="tile" template="https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/56102/{TileMatrix}/{TileRow}/{TileCol}"/>
</Layer>
<Layer>
  <ows:Title>World Imagery (Wayback 2014-02-20)</ows:Title>
  <ows:Identifier>WB_2014_R01</ows:Identifier>
  <ResourceURL format="image/jpeg" resourceType="tile" template="https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/10/{TileMatrix}/{TileRow}/{TileCol}"/>
</Layer>
<Layer>
  <ows:Title>World Imagery (Wayback 2023-05-10)</ows:Title>
  <ResourceURL format="image/jpeg" resourceType="tile" template="https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/45231/{TileMatrix}/{TileRow}/{TileCol}"/>
</Layer>
</Contents>
</Capabilities>`;

console.log("— capabilities parsing —");
const list=A._waybackParse(CAPS);
t("three releases parsed", list && list.length===3, list&&list.length);
t("release number read from the tile path", list[0].rel===56102, list[0]);
t("date label extracted", list[0].label==="2023-12-07", list[0].label);
t("year extracted", list[0].year===2023);
t("template kept verbatim", /tile\/56102\//.test(list[0].tpl));
t("sorted newest first", list.map(x=>x.label).join(",")==="2023-12-07,2023-05-10,2014-02-20", list.map(x=>x.label));
t("namespace prefixes tolerated", list.every(x=>x.label.length===10));

console.log("— parser robustness —");
t("unprefixed titles work", A._waybackParse(CAPS.replace(/ows:/g,"")).length===3);
t("duplicate releases collapse", A._waybackParse(CAPS+CAPS).length===3);
t("non-capabilities input rejected", A._waybackParse("<html><body>nope</body></html>")===null);
t("empty input rejected", A._waybackParse("")===null);
t("layers without a template are skipped",
  A._waybackParse('<Layer><ows:Title>World Imagery (Wayback 2020-01-01)</ows:Title></Layer>')===null);
t("a title with no date still yields a usable label",
  A._waybackParse('<Layer><ows:Title>World Imagery</ows:Title><ResourceURL template="https://h/tile/77/{TileMatrix}/{TileRow}/{TileCol}"/></Layer>')[0].label.length>0);
t("escaped ampersands unescaped in the template",
  /a&b/.test(A._waybackParse('<Layer><ows:Title>x</ows:Title><ResourceURL template="https://h/tile/9/{TileMatrix}/{TileRow}/{TileCol}?a&amp;b"/></Layer>')[0].tpl));

console.log("— selection and persistence —");
A._waybackSet(list[0]);
t("release applied", A.REL===56102 && A.LBL==="2023-12-07");
t("template applied", /56102/.test(A.TPL));
t("basemap switched and imagery turned on", env.satBasemap==="wayback" && env.satOn===true);
t("choice persisted", JSON.parse(store["cl_waybackRel"]).rel===56102);
// simulate a cold start
env.__api.LIST=null;
vm.runInContext("_waybackRel=null;_waybackLabel='';_waybackTpl=null;",ctx);
A._waybackRestore();
t("release restored on load", A.REL===56102 && A.LBL==="2023-12-07");

console.log("— offline behaviour —");
store["cl_waybackList"]=JSON.stringify({at:Date.now(),list});
env.__api.LIST=null;
t("cached list loads without network", A._waybackCacheLoad()===true && A.LIST.length===3);
(async()=>{
  env.__api.LIST=null; delete store["cl_waybackList"];
  let threw=false;
  try{ await A._waybackFetch(true); }catch(e){ threw=true; }
  t("a failed fetch surfaces as an error rather than silence", threw);

  console.log("— basemaps and zoom —");
  const bm=src.match(/const _BASEMAPS=\{[\s\S]*?\n\};/)[0];
  // 4.7.9: caps must stay at real cache depth. Past it Esri serves a
  // "Map data not yet available" JPEG that loads fine, so the parent-tile
  // fallback never fires and the view goes blank instead of soft.
  t("esri capped at its real cache depth", /esri:\{[\s\S]*?maxZ:19/.test(bm), (bm.match(/esri:\{[\s\S]*?maxZ:\d+/)||[])[0]);
  t("usgs capped at its real cache depth", /usgs:\{[\s\S]*?maxZ:16/.test(bm));
  t("wayback capped like the live basemap", /wayback:\{[\s\S]*?maxZ:19/.test(bm));
  t("no basemap asks past 19", !/maxZ:(2[0-9]|1[9]\d)/.test(bm), (bm.match(/maxZ:\d+/g)||[]));
  t("beyond maxZ the view clamps and stretches rather than blanking", /z=Math\.max\(3,Math\.min\(_bm\.maxZ,z\)\)/.test(src));
  t("USGS imagery added", /usgs:\{[\s\S]*?USGSImageryOnly/.test(bm));
  t("wayback basemap added", /wayback:\{/.test(bm));
  t("USGS topo retained", /topo:\{[\s\S]*?USGSTopo/.test(bm));
  t("attribution may be a function", /attr:\(\)=>/.test(bm));
  t("attribution call site handles both", /typeof _bm\.attr==="function"\?_bm\.attr\(\):_bm\.attr/.test(src));
  t("tile cache key carries the release", /function _bmCacheKey\(\)\{return satBasemap==="wayback"/.test(src));
  t("cache key actually used by _getTile", /const key=_bmCacheKey\(\)\+"\/"\+z/.test(src));
  t("parent-tile fallback still present (makes deeper zoom safe)", /while\(!img&&zz>3&&z-zz<3\)/.test(src));

  console.log("— wiring —");
  t("basemap picker", /function _basemapMenu\(\)/.test(src));
  t("historical entry in the satellite menu", /Historical imagery \(Wayback\)/.test(src));
  t("release list restored at load", /_waybackRestore\(\);/.test(src));
  t("no release numbers hardcoded in the app",
    !/tile\/(?!\{)(?!0)\d{2,}\//.test(src.replace(/const _WAYBACK_CAPS[\s\S]*?;/,"")), "found a baked release number");
  const vA=(src.match(/const APP_VERSION = "([^"]+)";/)||[])[1];
  const vB=(src.match(/content="ChainLink-v([^"]+)"/)||[])[1];
  const vC=(src.match(/<title>ChainLink Survey v([^<]+)<\/title>/)||[])[1];
  t("all three version sites agree", vA&&vA===vB&&vA===vC, [vA,vB,vC]);

  console.log("\n"+pass+" passed, "+fail+" failed");
  process.exit(fail?1:0);
})();
