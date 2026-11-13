// 4.7.6 harness: KML import -> polylines, and shifting one import in isolation.
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync(process.argv[2]||'./index.html','utf8');
const lines=src.split('\n');
const grab=(startsWith,stopStartsWith)=>{
  const a=lines.findIndex(l=>l.startsWith(startsWith));
  const b=lines.findIndex((l,i)=>i>a && l.startsWith(stopStartsWith));
  return lines.slice(a,b).join('\n');
};
const kml=grab('let _kmlBatchSeq','function importLandXML');
const move=grab('let _jobAdjust=false,','function _deedAdjustStart');

let pass=0,fail=0;
const t=(n,c,x)=>{if(c){pass++;console.log("  ok   "+n);}else{fail++;console.log("  FAIL "+n+(x!==undefined?"  -> "+JSON.stringify(x).slice(0,200):""));}};

// job coords = metres east/north of the anchor, near enough for a fixture
const ANCH={lat:34.0143,lon:-86.0066,E:1000,N:5000};
const env={
  units:"ft", points:[], _polylines:[], plotConnections:[], _areaLabels:[],
  _snapshots:[], _redoStack:[], pointCounter:1,
  Math, JSON, console, isFinite, parseFloat, String, Map, Set, Array, Number,
  _gpsToJob:(lat,lon)=>({E:ANCH.E+(lon-ANCH.lon)*364000*Math.cos(lat*Math.PI/180), N:ANCH.N+(lat-ANCH.lat)*364000}),
  _ptExists:n=>env.points.some(p=>p.Point===n),
  _deedPointNumberSet:()=>new Set(env._deedNums||[]),
  _rotateEN:(E,N,px,py,c,s)=>({E:px+(E-px)*c+(N-py)*s, N:py-(E-px)*s+(N-py)*c}),
  _takeSnapshot:()=>{env._snapshots.push(1);}, _updateUndoBtn:()=>{}, plotPoints:()=>{},
  saveData:()=>{}, showResult:(ti,r,act)=>{env._res={ti,r,act};}, openModal:()=>{},
  alert:m=>{env._alert=m;}, confirmDialog:()=>{}, _esc:v=>String(v==null?"":v),
  fmtBrg:d=>"AZ"+d.toFixed(1), toDMS:d=>"D"+d.toFixed(3), navigator:{}, geoAnchor:ANCH,
  requirePro:()=>true, _pickImportFile:()=>{}, _jobMovablePts:null
};
const ctx=vm.createContext(env);
vm.runInContext(kml+"\n"+move+";this.__api={_kmlCoords,_kmlSimplify,_kmlDoImport,_kmlBatches,_jobAdjustStart,_jobAdjustEnd,_jobTranslate,_jobRotateAbout,_jobScopeHasPt,_jobScopeHasPoly,_jobScopeLabel,get SCOPE(){return _jobAdjScope}};",ctx);
const A=env.__api;

console.log("— coordinate parsing —");
const c1=A._kmlCoords("-86.0066,34.0143,0 -86.0060,34.0150,12.5");
t("lon,lat,alt order honoured", c1.length===2 && c1[0].lon===-86.0066 && c1[0].lat===34.0143, c1[0]);
t("altitude read", c1[1].z===12.5);
t("whitespace and newlines tolerated", A._kmlCoords("\n  -86.1,34.1,0\n  -86.2,34.2,0\n ").length===2);
t("garbage tuples dropped", A._kmlCoords("-86.1,34.1 notacoord 999,999").length===1, A._kmlCoords("-86.1,34.1 notacoord 999,999"));
t("out-of-range lat/lon rejected", A._kmlCoords("200,95,0").length===0);

console.log("— simplify —");
const straight=[{E:0,N:0},{E:10,N:0.05},{E:20,N:0},{E:30,N:0.02},{E:40,N:0}];
t("collinear noise removed at 1 ft", A._kmlSimplify(straight,1).length===2, A._kmlSimplify(straight,1).length);
t("real corners kept", A._kmlSimplify([{E:0,N:0},{E:10,N:0},{E:10,N:10}],1).length===3);
t("endpoints always kept", A._kmlSimplify(straight,1)[0].E===0 && A._kmlSimplify(straight,1)[1].E===40);
t("tolerance 0 is a no-op", A._kmlSimplify(straight,0).length===5);

console.log("— import —");
const L1={name:"Big Wills Creek",coords:A._kmlCoords("-86.0066,34.0143,0 -86.0060,34.0150,0 -86.0055,34.0158,0"),closed:false};
const L2={name:"Pond",coords:A._kmlCoords("-86.0070,34.0140,0 -86.0068,34.0140,0 -86.0068,34.0142,0 -86.0070,34.0140,0"),closed:true};
A._kmlDoImport([L1,L2],[{name:"Culvert",c:A._kmlCoords("-86.0064,34.0146,0")[0]}],0,"creeks.kml");
t("polylines created", env._polylines.length===2, env._polylines.length);
t("segment count = vertices - 1", env._polylines[0].segs.length===env._polylines[0].verts.length-1);
t("segments are lines", env._polylines[0].segs.every(s=>s.type==="line"));
t("placemark name used", /Big Wills Creek/.test(env._polylines[0].name), env._polylines[0].name);
t("ring closed back to its first vertex",
  Math.abs(env._polylines[1].verts[0].E-env._polylines[1].verts[env._polylines[1].verts.length-1].E)<1e-9);
t("point imported and typed KML", env.points.length===1 && env.points[0].Type==="KML");
t("batch stamped on polylines", env._polylines.every(p=>p.kmlBatch===1));
t("batch stamped on points", env.points[0].kmlBatch===1);
t("source file recorded", env._polylines[0].kmlSrc==="creeks");
t("coordinates are in job space", env._polylines[0].verts[0].E>900 && env._polylines[0].verts[0].N>4900, env._polylines[0].verts[0]);
t("import offers an immediate shift", !!env._res.act && /Shift this import/.test(env._res.act[0].txt));
t("batch list reports one import", A._kmlBatches().length===1 && A._kmlBatches()[0].name==="creeks");

console.log("— vertex points —");
env.points=[]; env._polylines=[]; env.pointCounter=1;
A._kmlDoImport([L1,L2],[{name:"Culvert",c:A._kmlCoords("-86.0064,34.0146,0")[0]}],0,"creeks.kml",true);
t("a point per line vertex plus the placemark",
  env.points.length===(env._polylines[0].verts.length+env._polylines[1].verts.length-1)+1, env.points.length);
t("all vertex points typed KML", env.points.every(p=>p.Type==="KML"));
const bId=env._polylines[0].kmlBatch;
t("all carry the same batch stamp as their polyline", env.points.every(p=>p.kmlBatch===bId), [bId,env.points.map(p=>p.kmlBatch)]);
t("descriptions name the feature and vertex", /Big Wills Creek 1/.test(env.points[0].Description), env.points[0].Description);
t("point numbers are unique", new Set(env.points.map(p=>p.Point)).size===env.points.length);
t("a ring's closing vertex does not double up",
  env.points.filter(p=>Math.hypot(p.Easting-env._polylines[1].verts[0].E,p.Northing-env._polylines[1].verts[0].N)<0.01).length===1);
t("vertex point sits exactly on its polyline vertex",
  env.points.some(p=>Math.abs(p.Easting-env._polylines[0].verts[0].E)<1e-9 && Math.abs(p.Northing-env._polylines[0].verts[0].N)<1e-9));
t("result reports the split", /from line vertices/.test(env._res.r.find(r=>/Points/.test(r.lbl)).val), env._res.r.find(r=>/Points/.test(r.lbl)));

// elevation carried from the KML altitude
env.points=[]; env._polylines=[]; env.pointCounter=1;
A._kmlDoImport([{name:"Z",coords:A._kmlCoords("-86.006,34.014,1086 -86.005,34.015,1090"),closed:false}],[],0,"z.kml",true);
t("altitude becomes elevation", env.points[0].Elevation===1086 && env.points[1].Elevation===1090, env.points.map(p=>p.Elevation));

// a KML vertex must never adopt an existing observed point
env.points=[]; env._polylines=[]; env.pointCounter=1;
const home=A._kmlCoords("-86.0066,34.0143,0")[0];
const hq=env._gpsToJob(home.lat,home.lon);
env.points.push({Point:500,Easting:hq.E,Northing:hq.N,Elevation:0,Type:"Shot"});
A._kmlDoImport([L1],[],0,"creeks.kml",true);
t("a coincident observed point is never adopted", env.points.filter(p=>p.Type==="Shot").length===1 && env.points.some(p=>p.Type==="KML"&&Math.abs(p.Easting-hq.E)<1e-9));
t("the observed point kept no batch stamp", env.points.find(p=>p.Type==="Shot").kmlBatch===undefined);

console.log("— vertex points move with their import —");
env.points.push({Point:900,Easting:2000,Northing:9000,Type:"Shot"});
A._jobAdjustStart(false,{kmlBatch:env._polylines[0].kmlBatch,label:"creeks"});
const kp=env.points.find(p=>p.Type==="KML"), kpE=kp.Easting;
A._jobTranslate(12,0);
t("KML vertex points shift with the polyline", Math.abs(kp.Easting-(kpE+12))<1e-9);
t("observed points still held", env.points.find(p=>p.Point===900).Easting===2000);
A._jobAdjustEnd(false);

console.log("— import screen —");
t("points are their own button, not a toggle", /Import lines \+ a point at every vertex/.test(src));
t("lines-only is also its own button", /Import lines only \(no points\)/.test(src));
t("no OFF-by-default vertex toggle remains", !/Vertex points: /.test(src));
t("detail level is the only cycling control", /Detail: "\+tolLbl/.test(src));
t("dense full-detail import warns", /At full detail that is up to/.test(src));
t("batch-local dedupe documented", /BATCH-LOCAL/.test(src));

console.log("— a second import is a separate batch —");
env._res=null; env.points=[]; env._polylines=[]; env.pointCounter=1;
A._kmlDoImport([L1,L2],[{name:"Culvert",c:A._kmlCoords("-86.0064,34.0146,0")[0]}],0,"creeks.kml");
A._kmlDoImport([{name:"Fence",coords:A._kmlCoords("-86.008,34.012,0 -86.007,34.013,0"),closed:false}],[],0,"fence.kml");
const B1=env._polylines[0].kmlBatch, B2=env._polylines[2].kmlBatch;
t("second import gets its own batch id", B2!==B1 && B2>B1, [B1,B2]);
t("two batches listed", A._kmlBatches().length===2, A._kmlBatches());

console.log("— scoped shift moves only that import —");
env.points.push({Point:900,Easting:2000,Northing:9000,Type:"Shot"});
const snap=JSON.stringify({p:env.points.map(p=>[p.Easting,p.Northing]),l:env._polylines.map(pl=>pl.verts.map(v=>[v.E,v.N]))});
A._jobAdjustStart(false,{kmlBatch:B1,label:"creeks"});
t("scope armed", A.SCOPE && A.SCOPE.kmlBatch===B1);
t("banner names the import", /creeks/.test(A._jobScopeLabel()), A._jobScopeLabel());
A._jobTranslate(25,-40);
t("batch 1 polyline moved", Math.abs(env._polylines[0].verts[0].E-(JSON.parse(snap).l[0][0][0]+25))<1e-9);
t("batch 1 point moved", Math.abs(env.points[0].Easting-(JSON.parse(snap).p[0][0]+25))<1e-9);
t("batch 2 polyline did NOT move", env._polylines[2].verts[0].E===JSON.parse(snap).l[2][0][0], env._polylines[2].verts[0].E);
t("observed shot did NOT move", env.points[1].Easting===2000 && env.points[1].Northing===9000);
A._jobAdjustEnd(true);
t("report states the scope", env._res.r.some(r=>/creeks/.test(r.val)), env._res.r.map(r=>r.val));
t("report states what was held", env._res.r.some(r=>/every other point/.test(r.val)));
t("scope cleared after lock", A.SCOPE===null);

console.log("— cancel restores a scoped drag —");
const before=env._polylines[0].verts[0].E;
A._jobAdjustStart(false,{kmlBatch:B1,label:"creeks"});
A._jobTranslate(500,500);
A._jobAdjustEnd(false);
t("scoped cancel restores", env._polylines[0].verts[0].E===before, env._polylines[0].verts[0].E);

console.log("— unscoped drag still moves everything —");
A._jobAdjustStart(false);
t("no scope", A.SCOPE===null);
const b2=env._polylines[2].verts[0].E, s2=env.points[1].Easting;
A._jobTranslate(7,0);
t("other import moves too", Math.abs(env._polylines[2].verts[0].E-(b2+7))<1e-9);
t("observed point moves too", Math.abs(env.points[1].Easting-(s2+7))<1e-9);
A._jobAdjustEnd(false);

console.log("— scoped rotate —");
A._jobAdjustStart(true,{kmlBatch:1,label:"creeks"});
const otherBefore=env._polylines[2].verts[0].E;
A._jobRotateAbout(env._polylines[0].verts[0].E,env._polylines[0].verts[0].N,15);
t("rotation confined to the import", env._polylines[2].verts[0].E===otherBefore);
A._jobAdjustEnd(false);

console.log("— guards —");
env._alert=null;
A._jobAdjustStart(false,{kmlBatch:99,label:"gone"});
t("refuses a batch with nothing left", A.SCOPE===null && /Nothing from that import/.test(env._alert||""), env._alert);

console.log("— wiring —");
// 4.8.11: the old "Import KML (Google Earth)" label lived in a menu nothing opened (removed
// in 4.8.10); the import menu people actually use is projectImportMenu
t("import menu entry", /importKML\(\)/.test((src.match(/function projectImportMenu\(\)\{[\s\S]*?\n\}/)||[""])[0]));
t("workspace entry", /_wsButton\(modal,"Import KML"/.test(src));
t("kmz rejected with instructions", /Save Place As/.test(src));
t("anchor required", /KML is latitude\/longitude, so the job must be anchored first/.test(src));
t("move menu lists imports", /Shift only the import/.test(src));
// 4.7.20+: polylines live in the job slot too; the legacy cl_polylines mirror was removed in 4.8.10
t("polylines persist whole (batch survives save)", /polylines: JSON\.parse\(JSON\.stringify\(/.test(src.match(/function _jobCapture\(\)\{[\s\S]*?\n\}/)[0]));
// 4.7.20+: points live in the job slot (cl_job_<id>), not the legacy cl_points key
t("points persist whole (job slot)", /points: JSON\.parse\(JSON\.stringify\(points\|\|\[\]\)\)/.test(src.match(/function _jobCapture\(\)\{[\s\S]*?\n\}/)[0]));
const vA=(src.match(/const APP_VERSION = "([^"]+)";/)||[])[1];
const vB=(src.match(/content="ChainLink-v([^"]+)"/)||[])[1];
const vC=(src.match(/<title>ChainLink Survey v([^<]+)<\/title>/)||[])[1];
t("all three version sites agree", vA&&vA===vB&&vA===vC, [vA,vB,vC]);
t("imagery calibration is absent (4.7.4 line)", !/imgDE|_imgCalMenu/.test(src));

console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
