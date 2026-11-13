// 4.7.4 harness: job move/shift — geometry transport, rotation lock, cancel.
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync(process.argv[2]||'./index.html','utf8');
const lines=src.split('\n');
const a=lines.findIndex(l=>l.startsWith('let _jobAdjust=false,'));
const b=lines.findIndex((l,i)=>i>a && l.startsWith('function _deedAdjustStart'));
const body=lines.slice(a,b).join('\n');

let pass=0,fail=0;
const t=(n,c,x)=>{if(c){pass++;console.log("  ok   "+n);}else{fail++;console.log("  FAIL "+n+(x!==undefined?"  -> "+JSON.stringify(x).slice(0,200):");"));}};

const env={
  points:[], plotConnections:[], _polylines:[], _areaLabels:[], _snapshots:[], _redoStack:[],
  units:"ft", Math, JSON, console, isFinite, Map, Set,
  _deedPointNumberSet:()=>new Set(env._deedNums||[]),
  _rotateEN:(E,N,px,py,c,s)=>({E:px+(E-px)*c+(N-py)*s, N:py-(E-px)*s+(N-py)*c}),
  _takeSnapshot:()=>{env._snapshots.push({label:"x"});}, _updateUndoBtn:()=>{}, plotPoints:()=>{},
  saveData:()=>{env._saved=(env._saved||0)+1;}, showResult:(t2,r)=>{env._res=r;},
  openModal:()=>{}, confirmDialog:()=>{}, alert:m=>{env._alert=m;},
  fmtBrg:d=>"AZ"+d.toFixed(2), toDMS:d=>"D"+d.toFixed(4),
  navigator:{}, window:{}
};
const ctx=vm.createContext(env);
vm.runInContext(body+";this.__api={_jobAdjustStart,_jobAdjustEnd,_jobTranslate,_jobRotateAbout,_jobMovablePts,get DE(){return _jobAdjDE},get DN(){return _jobAdjDN},get ROT(){return _jobAdjROT},get ON(){return _jobAdjust}};",ctx);
const A=env.__api;

const reset=()=>{
  env._snapshots.length=0; env._redoStack.length=0;
  env.points=[{Point:1,Easting:1000,Northing:5000,Elevation:0},
              {Point:2,Easting:1100,Northing:5000,Elevation:0},
              {Point:9,Easting:2000,Northing:9000,Elevation:0}];   // 9 = deed point
  env._deedNums=[9];
  env.plotConnections=[{from:1,to:2,style:"solid"},
    {type:"arc",centerE:1050,centerN:5050,R:50,startAngle:0,endAngle:1},
    {type:"spiral",startE:1000,startN:5000,endE:1100,endN:5100,startAz:10,endAz:20,chordAz:15,samples:[{E:1000,N:5000},{E:1050,N:5050}]}];
  env._polylines=[{name:"PL-1",verts:[{E:1000,N:5000},{E:1100,N:5000}],segs:[{type:"arc",centerE:1050,centerN:5040,R:40,dir:"cw"}]}];
  env._areaLabels=[{E:1050,N:5025,label:"1.0 ac"}];
};

console.log("— what moves —");
reset(); A._jobAdjustStart(false); A._jobTranslate(10,-20);
t("observed points move", env.points[0].Easting===1010 && env.points[0].Northing===4980, env.points[0]);
t("deed points are held fixed", env.points[2].Easting===2000 && env.points[2].Northing===9000, env.points[2]);
t("arc connection centre travels", env.plotConnections[1].centerE===1060 && env.plotConnections[1].centerN===5030);
t("spiral ends and samples travel", env.plotConnections[2].startE===1010 && env.plotConnections[2].samples[1].E===1060);
t("polyline vertices travel", env._polylines[0].verts[0].E===1010 && env._polylines[0].verts[0].N===4980);
t("polyline arc centre travels", env._polylines[0].segs[0].centerE===1060);
t("area labels travel", env._areaLabels[0].E===1060 && env._areaLabels[0].N===5005);
t("running delta tracked", A.DE===10 && A.DN===-20, [A.DE,A.DN]);

console.log("— shape is preserved by a slide —");
const d0=Math.hypot(env.points[1].Easting-env.points[0].Easting, env.points[1].Northing-env.points[0].Northing);
t("distance between points unchanged", Math.abs(d0-100)<1e-9, d0);
const az0=Math.atan2(env.points[1].Easting-env.points[0].Easting, env.points[1].Northing-env.points[0].Northing)*180/Math.PI;
t("bearing between points unchanged", Math.abs(az0-90)<1e-9, az0);

console.log("— rotation is off unless asked for —");
reset(); A._jobAdjustStart(false);
const beforeE=env.points[0].Easting, beforeN=env.points[0].Northing;
A._jobRotateAbout(1000,5000,45);
t("rotate is a no-op in slide-only mode", env.points[0].Easting===beforeE && env.points[0].Northing===beforeN);
t("no rotation accumulated", A.ROT===0);
reset(); A._jobAdjustStart(true); A._jobRotateAbout(1000,5000,90);
t("rotate works when enabled", Math.abs(env.points[1].Easting-1000)<1e-6 && Math.abs(env.points[1].Northing-4900)<1e-6, env.points[1]);
t("deed points still held fixed under rotation", env.points[2].Easting===2000);
t("rotation accumulated for the report", A.ROT===90);
t("spiral azimuths rotate with the geometry", env.plotConnections[2].startAz===100);

console.log("— cancel restores exactly —");
reset(); const snapE=env.points[0].Easting, snapN=env.points[0].Northing;
const snapPl=env._polylines[0].verts[0].E, snapAr=env._areaLabels[0].E;
A._jobAdjustStart(false); A._jobTranslate(500,500); A._jobRotateAbout(0,0,10);
t("moved before cancel", env.points[0].Easting!==snapE);
A._jobAdjustEnd(false);
t("points restored", env.points[0].Easting===snapE && env.points[0].Northing===snapN);
t("polylines restored", env._polylines[0].verts[0].E===snapPl);
t("area labels restored", env._areaLabels[0].E===snapAr);
t("mode exited", A.ON===false);
t("cancel leaves no snapshot behind", env._snapshots.length===0, env._snapshots.length);

console.log("— lock in —");
reset(); env._saved=0; A._jobAdjustStart(false); A._jobTranslate(3,4); A._jobAdjustEnd(true);
t("lock keeps the move", env.points[0].Easting===1003 && env.points[0].Northing===5004);
t("lock saves", env._saved>0);
t("lock keeps the undo snapshot", env._snapshots.length===1);
t("report states the shift", !!env._res && env._res.some(r=>/5\.000/.test(r.val)), env._res&&env._res.map(r=>r.val));
t("report states rotation was not applied", env._res.some(r=>/preserved/.test(r.val)));
t("report names what was held fixed", env._res.some(r=>/deed/i.test(r.val)&&/NGS/i.test(r.val)));

console.log("— guards —");
reset(); env.points=[]; env._polylines=[]; env._alert=null; A._jobAdjustStart(false);
t("refuses with no geometry at all", A.ON===false && /No geometry/.test(env._alert||""), env._alert);
reset(); env.points=[]; env._alert=null; A._jobAdjustStart(false);
t("polylines alone are still movable", A.ON===true, env._alert);
A._jobAdjustEnd(false);
reset(); A._jobAdjustStart(false); A._jobTranslate(NaN,5);
t("NaN drag is ignored", env.points[0].Easting===1000, env.points[0]);

console.log("— wiring —");
t("COGO entry present", /Move \/ Shift Job \(drag\)/.test(src));
t("mouse drag branch", /if\(_jobAdjust\)\{[\s\S]{0,200}_jobTranslate\(b\.E-a\.E,b\.N-a\.N\)/.test(src));
t("touch branch", /if\(_jobAdjust\)\{[\s\S]{0,2000}_jobAdjAllowRot/.test(src));
t("lock and cancel hit test", /window\._jobLockBtn/.test(src)&&/window\._jobCancelBtn/.test(src));
t("undo chrome hidden while dragging", /\(!_deedAdjust\)&&\(!_jobAdjust\)/.test(src));
t("long-press disabled while dragging", /if\(_deedAdjust\|\|_jobAdjust(\|\|_imgCal)?\)return;/.test(src));
const vA=(src.match(/const APP_VERSION = "([^"]+)";/)||[])[1];
const vB=(src.match(/content="ChainLink-v([^"]+)"/)||[])[1];
const vC=(src.match(/<title>ChainLink Survey v([^<]+)<\/title>/)||[])[1];
t("all three version sites agree", vA&&vA===vB&&vA===vC, [vA,vB,vC]);

console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
