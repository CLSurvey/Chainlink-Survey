#!/usr/bin/env node
/* =============================================================================
   ChainLink Survey — angle-right + shot-form regression suite (needs index.html >= 4.8.6;
   the shot-form checks run on >= 4.8.7, the rectangle checks on >= 4.8.8)
   Usage:  node angleright-tests.js [path/to/index.html]   (default ./index.html)
   Loads the whole app with DOM stubs (same sandbox as app-smoke.js) and drives
   the real functions: backsight azimuth, angle right -> azimuth, shot storage,
   two-face parsing, fieldbook rows, CSV backup, unit conversion.
   EXPECTED: every line "ok", final line "ANGLE RIGHT: N pass / 0 fail".
   ============================================================================= */
process.on('uncaughtException',e=>{console.log('LATE THROW ->',e.message);process.exit(1)});
const fs=require('fs');const vm=require('vm');
const htmlPath=process.argv[2]||'./index.html';
const html=fs.readFileSync(htmlPath,'utf8');
const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
const store={};const alerts=[];
const el=()=>new Proxy(function(){},{get:(t,k)=>{
  if(k==='style')return {};
  if(k==='classList')return {add(){},remove(){},toggle(){},contains(){return false}};
  if(k==='getContext')return ()=>{
    const bag=new Proxy({},{get:(t2,k2)=>{if(k2==='canvas')return el();return (...a)=>bag;},set:()=>true});
    return new Proxy({},{get:(t2,k2)=>{
      if(k2==='measureText')return ()=>({width:10});
      if(k2==='getImageData')return ()=>({data:new Uint8ClampedArray(4),width:1,height:1});
      return (...a)=>bag;
    },set:()=>true});
  };
  if(k==='appendChild'||k==='removeChild'||k==='insertBefore')return x=>x;
  if(k==='addEventListener'||k==='removeEventListener'||k==='setAttribute'||k==='focus'||k==='click'||k==='select'||k==='remove')return ()=>{};
  if(k==='querySelector'||k==='getElementById')return ()=>el();
  if(k==='querySelectorAll')return ()=>[];
  if(k==='children')return [];
  return el();
},set:()=>true});
const sandbox={
  console, setTimeout, setInterval, clearTimeout, clearInterval,
  localStorage:{getItem:k=>(k in store?store[k]:null),setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},key:i=>Object.keys(store)[i],get length(){return Object.keys(store).length}},
  navigator:{onLine:true,geolocation:{getCurrentPosition(){},watchPosition(){return 1},clearWatch(){}},clipboard:{writeText:()=>Promise.resolve()},canShare:()=>false,share:()=>Promise.resolve(),serviceWorker:{register:()=>Promise.resolve({})}},
  fetch:()=>new Promise(()=>{}),
  alert:m=>alerts.push(String(m)),
  confirm:()=>true, prompt:()=>null,
  Image:function(){return el()},
  FileReader:function(){this.readAsText=()=>{};this.readAsArrayBuffer=()=>{}},
  Blob:function(p,o){this.type=(o&&o.type)||''}, File:function(p,n,o){this.name=n;this.type=(o&&o.type)||''},
  URL:{createObjectURL:()=>'blob:x',revokeObjectURL:()=>{}},
  requestAnimationFrame:f=>setTimeout(f,0),
  screen:{width:400,height:800}, devicePixelRatio:2,
  performance:{now:()=>Date.now()},
  atob:s=>Buffer.from(s,'base64').toString('binary'), btoa:s=>Buffer.from(s,'binary').toString('base64'),
};
sandbox.addEventListener=()=>{}; sandbox.removeEventListener=()=>{}; sandbox.dispatchEvent=()=>true;
sandbox.matchMedia=()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}});
sandbox.innerWidth=400; sandbox.innerHeight=800; sandbox.location={href:'https://app.test/',search:'',hash:'',reload(){}};
sandbox.history={replaceState(){},pushState(){}};
sandbox.window=sandbox; sandbox.self=sandbox; sandbox.globalThis=sandbox;
sandbox.document=new Proxy({},{get:(t,k)=>{
  if(k==='getElementById'||k==='querySelector'||k==='createElement'||k==='createElementNS')return ()=>el();
  if(k==='querySelectorAll')return ()=>[];
  if(k==='addEventListener'||k==='removeEventListener')return ()=>{};
  if(k==='body'||k==='head'||k==='documentElement')return el();
  if(k==='visibilityState')return 'visible';
  return el();
},set:()=>true});
store['cl_hzMode']='ar';                       // must be picked up by loadData
const ctx=vm.createContext(sandbox);
vm.runInContext(code,ctx,{filename:'app.js'});
ctx.alert=m=>alerts.push(String(m));          // the app swaps in its own alert at load — take it back
const R=src=>vm.runInContext(src,ctx);         // run inside the app's scope (sees its let/const)
console.log('App loaded from '+htmlPath+' | app version: '+R('APP_VERSION'));
if(R('typeof _bsAzimuth')!=='function'){console.log('FATAL: no angle-right code in this file (needs >= 4.8.6)');process.exit(1);}

let pass=0,fail=0;
const T=(n,ok,info)=>{console.log((ok?'ok  ':'FAIL')+' '+n.padEnd(58)+(info==null?'':info));ok?pass++:fail++;};
const near=(a,b,t)=>typeof a==='number'&&Math.abs(a-b)<(t||1e-6);
const nearAz=(a,b,t)=>typeof a==='number'&&!isNaN(a)&&Math.abs(((a-b+540)%360)-180)<(t||1e-6);

// A clean 2D job: station 1 at 10000/10000, control around it.
const reset=()=>R(`
  surveyMode="2D"; units="ft"; prismConstant=0; _ppmEnabled=false; bearingMode="az"; hzMode="az";
  points=[
    {Point:1,Northing:10000,Easting:10000,Elevation:100,Type:"Setup",Description:"Start",Flag:"",ih:0},
    {Point:2,Northing:10100,Easting:10000,Elevation:100,Type:"Import",Description:"N",Flag:""},
    {Point:3,Northing:10000,Easting:10100,Elevation:100,Type:"Import",Description:"E",Flag:""},
    {Point:4,Northing:10100,Easting:10100,Elevation:100,Type:"Import",Description:"NE",Flag:""},
    {Point:5,Northing:10000,Easting:10000,Elevation:100,Type:"Import",Description:"on station",Flag:""},
  ];
  pointCounter=6; currentPoint=points[0]; plotConnections=[]; recentShots=[]; undefined`);
const shoot=(f)=>{alerts.length=0;return R(`(function(){
  const f=Object.assign({pt:String(pointCounter),desc:"T",az:"",dist:"",va:"90.0000",th:"0.000",ih:"0.000",line:"none",offLat:"0",offVert:"0"},${JSON.stringify(f)});
  const n=points.length; _processShot(f,surveyMode==="3D",currentPoint.ih||0,currentPoint);
  return points.length>n?JSON.parse(JSON.stringify(points[points.length-1])):null;})()`);};

console.log('\n=== SETTING ===');
R('loadData()');
T('hzMode restored from storage (cl_hzMode=ar)',R('hzMode')==='ar');

console.log('\n=== BACKSIGHT AZIMUTH ===');
reset();
T('no backsight -> NaN',isNaN(R('_bsAzimuth(currentPoint)')));
T('no backsight -> empty label',R('_bsLabel(currentPoint)')==='');
R('currentPoint.bsPt=2'); T('BS point due north -> 0',nearAz(R('_bsAzimuth(currentPoint)'),0));
R('currentPoint.bsPt=3'); T('BS point due east -> 90',nearAz(R('_bsAzimuth(currentPoint)'),90));
R('currentPoint.bsPt=4'); T('BS point NE -> 45',nearAz(R('_bsAzimuth(currentPoint)'),45));
T('label names the point and azimuth',R('_bsLabel(currentPoint)')==='#4 · Az 45°00\'00"',R('_bsLabel(currentPoint)'));
R('points[3].Easting=10000;points[3].Northing=9900');
T('BS point moved -> azimuth follows (180)',nearAz(R('_bsAzimuth(currentPoint)'),180));
R('currentPoint.bsPt=99'); T('BS point missing -> NaN',isNaN(R('_bsAzimuth(currentPoint)')));
R('currentPoint.bsPt=1');  T('BS = station itself -> NaN',isNaN(R('_bsAzimuth(currentPoint)')));
R('currentPoint.bsPt=5');  T('BS on top of station -> NaN',isNaN(R('_bsAzimuth(currentPoint)')));
R('delete currentPoint.bsPt;currentPoint.bsAz=300'); T('typed BS azimuth 300',nearAz(R('_bsAzimuth(currentPoint)'),300));
R('currentPoint.bsAz=-30'); T('typed BS azimuth normalised (-30 -> 330)',nearAz(R('_bsAzimuth(currentPoint)'),330));

console.log('\n=== ANGLE RIGHT -> AZIMUTH ===');
reset(); R('currentPoint.bsAz=300');
T('BS 300 + 120 right = 60 (wraps)',nearAz(R('_arToAz(currentPoint,120)'),60));
T('BS 300 + 0 = 300 (on the backsight)',nearAz(R('_arToAz(currentPoint,0)'),300));
T('BS 300 + 359.9997 right',nearAz(R('_arToAz(currentPoint,parseDMS("359.5959"))'),299.99972,1e-4));
T('negative angle = angle left (300 - 30 = 270)',nearAz(R('_arToAz(currentPoint,-30)'),270));
T('360 or more rejected',isNaN(R('_arToAz(currentPoint,360)'))&&isNaN(R('_arToAz(currentPoint,3600)')));
T('unparseable angle rejected',isNaN(R('_arToAz(currentPoint,parseDMS("45.6100"))')));
T('form field: DDD.MMSS 30.3000 from BS 300 = 330.5',nearAz(R('_hzFormAz({_ar:true,az:"30.3000"},currentPoint)'),330.5));
T('form field: azimuth entry untouched by backsight',nearAz(R('_hzFormAz({az:"30.3000"},currentPoint)'),30.5));
R('bearingMode="quad"');
T('form field: quadrant entry untouched',nearAz(R('_hzFormAz({az:"x",_azDec:135},currentPoint)'),135));
T('form field: angle right ignores quadrant mode',nearAz(R('_hzFormAz({_ar:true,az:"90.0000",_azDec:135},currentPoint)'),30));
R('bearingMode="az"');

console.log('\n=== STORED SHOTS (2D) ===');
reset(); R('currentPoint.bsPt=2');
let p=shoot({_ar:true,az:"90.0000",dist:"100"});
T('BS north, 90 right, 100 ft -> due east',p&&near(p.Northing,10000,1e-6)&&near(p.Easting,10100,1e-6),p&&p.Northing.toFixed(4)+' / '+p.Easting.toFixed(4));
T('record: HzMode AR, BSPt 2, BSAz 0',p&&p.HzMode==='AR'&&p.BSPt===2&&near(p.BSAz,0));
T('record: raw reading kept, TrueAz 90',p&&p.InstReading==='90.0000'&&p.TrueAz==='90°00\'00"'&&p.RawAz==='90°00\'00"');
T('record: From station, HorizDist',p&&p.From===1&&near(p.HorizDist,100));
R('currentPoint.bsPt=3');
p=shoot({_ar:true,az:"90.0000",dist:"100"});
T('BS east, 90 right -> due south',p&&near(p.Northing,9900,1e-6)&&near(p.Easting,10000,1e-6));
p=shoot({_ar:true,az:"270.0000",dist:"50"});
T('BS east, 270 right -> due north',p&&near(p.Northing,10050,1e-6)&&near(p.Easting,10000,1e-6));
R('currentPoint.bsPt=4');
p=shoot({_ar:true,az:"30.3000",dist:"200"});
{const a=75.5*Math.PI/180;
T('BS NE (45), 30°30\' right, 200 ft -> az 75.5',p&&near(p.Northing,10000+200*Math.cos(a),1e-6)&&near(p.Easting,10000+200*Math.sin(a),1e-6));}
p=shoot({_ar:true,az:"0.0000",dist:"141.4214"});
T('0 right lands on the backsight line',p&&near(p.Northing,10100,1e-3)&&near(p.Easting,10100,1e-3));
R('delete currentPoint.bsPt;currentPoint.bsAz=300');
p=shoot({_ar:true,az:"120.0000",dist:"100"});
T('typed BS 300 + 120 -> az 60; no BSPt on record',p&&p.TrueAz==='60°00\'00"'&&!('BSPt' in p)&&near(p.BSAz,300));
p=shoot({_ar:true,az:"90.0000",dist:"100",offLat:"10"});
{const a=30*Math.PI/180,b=120*Math.PI/180;
T('lateral offset is square to the worked-out azimuth',p&&near(p.Northing,10000+100*Math.cos(a)+10*Math.cos(b),1e-6)&&near(p.Easting,10000+100*Math.sin(a)+10*Math.sin(b),1e-6));}

console.log('\n=== REFUSALS ===');
reset();
let n0=R('points.length'); p=shoot({_ar:true,az:"90.0000",dist:"100"});
T('no backsight -> nothing stored, says so',p===null&&R('points.length')===n0&&alerts.some(a=>/No backsight/.test(a)),alerts[0]);
R('hzMode="az";currentPoint.bsPt=2');
p=shoot({_ar:true,az:"90.6000",dist:"100"});
T('bad angle (60 minutes) -> nothing stored',p===null&&alerts.some(a=>/Bad angle right/.test(a)),alerts[0]);
p=shoot({_ar:true,az:"400",dist:"100"});
T('angle >= 360 -> nothing stored',p===null&&alerts.some(a=>/Bad angle right/.test(a)));

console.log('\n=== AZIMUTH SHOTS UNCHANGED ===');
reset(); R('currentPoint.bsPt=3');   // a backsight on the station must not touch azimuth entry
p=shoot({az:"90.0000",dist:"100"});
T('azimuth 90 -> due east, backsight ignored',p&&near(p.Northing,10000,1e-6)&&near(p.Easting,10100,1e-6));
T('azimuth record carries no AR fields',p&&!('HzMode' in p)&&!('BSAz' in p)&&!('BSPt' in p));
R('bearingMode="quad"');
p=shoot({az:"S45E",_azDec:135,dist:"100"});
T('quadrant S45E -> az 135',p&&p.TrueAz==='135°00\'00"'&&!('HzMode' in p));
R('bearingMode="az"');

console.log('\n=== 3D ===');
reset(); R('surveyMode="3D";distMode="SD";currentPoint.ih=5;currentPoint._hiSet=true;currentPoint.bsPt=2');
p=shoot({_ar:true,az:"90.0000",dist:"100",va:"90.0000",th:"5.000",ih:"5.000"});
T('level 3D shot, 90 right of north -> east, Z = station',p&&near(p.Easting,10100,1e-6)&&near(p.Northing,10000,1e-6)&&near(p.Elevation,100,1e-6));
p=shoot({_ar:true,az:"180.0000",dist:"100",va:"60.0000",th:"5.000",ih:"5.000"});
T('zenith 60, 180 right -> south, HD 86.603, dZ +50',p&&near(p.Northing,10000-86.6025404,1e-5)&&near(p.Elevation,150,1e-6)&&p.HzMode==='AR'&&p.ZenithAngle==='60.0000');
R('surveyMode="2D"');

console.log('\n=== TWO-FACE ===');
reset(); R('currentPoint.bsPt=3');
let f=R('JSON.parse(JSON.stringify(_twoFaceParse({_ar:true,az:"45.0000",dist:"100"},false,currentPoint)))');
T('face 1: 45 right of east -> az 135, angle kept',f&&nearAz(f.az,135)&&near(f.ar,45)&&near(f.hd,100));
let f2=R('JSON.parse(JSON.stringify(_twoFaceParse({_ar:true,az:"225.0010",dist:"100"},false,currentPoint)))');
T('face 2: 225°00\'10" right -> az 315.0028',f2&&nearAz(f2.az,315.0027778,1e-6));
T('faces average to 135°00\'05"',nearAz(R(`_circMean(${f.az},_f2AzCorr(${f.az},${f2.az}))`),135.0013889,1e-6));
f=R('JSON.parse(JSON.stringify(_twoFaceParse({az:"45.0000",dist:"100"},false,currentPoint)))');
T('azimuth faces unchanged (az 45, no angle)',f&&nearAz(f.az,45)&&f.ar===null);
T('missing reading -> null',R('_twoFaceParse({_ar:true,az:"",dist:"100"},false,currentPoint)')===null);

console.log('\n=== FIELDBOOK ===');
reset(); R('currentPoint.bsPt=2');
shoot({_ar:true,az:"90.0000",dist:"100"}); shoot({_ar:true,az:"100.0000",dist:"100"});
R('currentPoint.bsPt=3'); shoot({_ar:true,az:"10.0000",dist:"100"});
shoot({az:"10.0000",dist:"100"});
let rows=R('JSON.parse(JSON.stringify(_fieldbookRows()))');
let kinds=rows.map(r=>r.kind).join(',');
T('backsight noted once per backsight',kinds==='setup,bs,shot,shot,bs,shot,shot',kinds);
T('backsight rows carry point and azimuth',rows[1].bsPt===2&&near(rows[1].bsAz,0)&&rows[4].bsPt===3&&near(rows[4].bsAz,90));
T('shot rows flagged AR / not AR',rows[2].ar===true&&rows[5].ar===true&&rows[6].ar===false);

console.log('\n=== CSV BACKUP ===');
let csv=R('_buildCSV()');
let meta=JSON.parse(csv.split('\n').find(l=>l.startsWith('#CHAINLINK:')).slice(11));
T('station backsight rides in the CSV',meta.raw&&meta.raw['1']&&meta.raw['1'].bsPt===3);
T('shot AR fields ride in the CSV',meta.raw['6']&&meta.raw['6'].HzMode==='AR'&&meta.raw['6'].BSPt===2&&meta.raw['6'].BSAz===0&&meta.raw['6'].InstReading==='90.0000');
T('azimuth shot has no AR fields in the CSV',meta.raw['9']&&!('HzMode' in meta.raw['9']));

console.log('\n=== UNIT CONVERSION ===');
reset(); R('currentPoint.bsPt=4'); shoot({_ar:true,az:"45.0000",dist:"100"});
R('_convertLinearUnits(0.3048)');
p=R('JSON.parse(JSON.stringify(points[points.length-1]))');
T('ft -> m leaves angles and point numbers alone',p.BSPt===4&&near(p.BSAz,45)&&R('points[0].bsPt')===4&&near(p.HorizDist,30.48,1e-9));
T('backsight azimuth unchanged by scaling',nearAz(R('_bsAzimuth(points[0])'),45,1e-9));

if(R('typeof _shotFormCheck')==='function'){
console.log('\n=== SHOT FORM CHECK (4.8.7) ===');
reset(); R('currentPoint.bsPt=2');
const chk=(f,is3D)=>R('JSON.stringify(_shotFormCheck(Object.assign({pt:String(pointCounter),desc:"",az:"",dist:"",va:"90.0000"},'+JSON.stringify(f)+'),'+(!!is3D)+',currentPoint,false))');
const fieldOf=j=>j==='null'?null:JSON.parse(j).field;
T('complete azimuth shot passes',chk({az:"45.3015",dist:"100"})==='null');
T('complete angle-right shot passes',chk({_ar:true,az:"90.0000",dist:"100"})==='null');
T('empty angle -> angle field',fieldOf(chk({dist:"100"}))==='az');
T('bad angle (61 minutes) -> angle field',fieldOf(chk({az:"45.6100",dist:"100"}))==='az');
T('angle right over 360 -> angle field',fieldOf(chk({_ar:true,az:"400",dist:"100"}))==='az');
T('missing distance -> distance field',fieldOf(chk({az:"45",dist:""}))==='dist');
T('zero / negative distance -> distance field',fieldOf(chk({az:"45",dist:"0"}))==='dist'&&fieldOf(chk({az:"45",dist:"-5"}))==='dist');
T('existing point number -> point field',fieldOf(chk({pt:"2",az:"45",dist:"10"}))==='pt');
T('point number 0 -> point field',fieldOf(chk({pt:"0",az:"45",dist:"10"}))==='pt');
T('3D: zenith 400 -> zenith field',fieldOf(chk({az:"45",dist:"10",va:"400"},true))==='va');
T('3D: reverse-face zenith 271 allowed',chk({az:"45",dist:"10",va:"271.0010"},true)==='null');
T('2D ignores the zenith field',chk({az:"45",dist:"10",va:"400"},false)==='null');
R('delete currentPoint.bsPt');
T('angle right with no backsight says so',/No backsight/.test(chk({_ar:true,az:"90.0000",dist:"100"})));
// whatever the check passes, _processShot must store — and whatever it rejects, _processShot must refuse
R('currentPoint.bsPt=2');
[{az:"45.3015",dist:"100"},{_ar:true,az:"90.0000",dist:"100"},{az:"45.6100",dist:"100"},{az:"45",dist:""},{az:"45",dist:"0"},{_ar:true,az:"400",dist:"5"},{pt:"1",az:"10",dist:"5"}].forEach((f,i)=>{
  const okc=chk(f)==='null'; const stored=shoot(f)!==null;
  T('check agrees with _processShot, case '+(i+1)+' ('+(okc?'accept':'reject')+')',okc===stored);
});
R('rapidShots=true'); const nb=R('points.length'); const pr=shoot({az:"10.0000",dist:"5"});
T('rapid shots: still stores the point',pr!==null&&R('points.length')===nb+1&&R('pointCounter')===pr.Point+1);
R('rapidShots=false');
}

if(R('typeof _rectCorners')==='function'){
console.log('\n=== RECTANGLE LAYOUT (4.8.8) ===');
reset();
const rc=(az,L1,L2,side)=>R('JSON.parse(JSON.stringify(_rectCorners(points[0],'+az+','+L1+','+L2+',"'+side+'")))');
const at=(q,N,E)=>near(q.Northing,N,1e-6)&&near(q.Easting,E,1e-6);
let r=rc(0,100,100,"R");
T('square north then right: corners N, NE, E',at(r.c2,10100,10000)&&at(r.c3,10100,10100)&&at(r.c4,10000,10100));
T('square: diagonal 141.4214, area 10000, perimeter 400',near(r.diag,141.4213562,1e-6)&&near(r.area,10000)&&near(r.perim,400));
T('square right: angles right 45 and 90, second side az 90',near(r.ar3,45)&&near(r.ar4,90)&&nearAz(r.sideAz,90));
r=rc(0,100,100,"L");
T('square left: corners N, NW, W',at(r.c2,10100,10000)&&at(r.c3,10100,9900)&&at(r.c4,10000,9900));
T('square left: angles right 315 and 270, second side az 270',near(r.ar3,315)&&near(r.ar4,270)&&nearAz(r.sideAz,270));
r=rc(90,50,30,"R");
T('50 x 30 east then right (south)',at(r.c2,10000,10050)&&at(r.c3,9970,10050)&&at(r.c4,9970,10000)&&near(r.diag,58.30951895,1e-6));
r=rc(33.5,60,80,"R");
{const A={Northing:10000,Easting:10000},d=(a,b)=>Math.hypot(a.Northing-b.Northing,a.Easting-b.Easting),
   dot=(a,b,c)=>(b.Northing-a.Northing)*(c.Northing-b.Northing)+(b.Easting-a.Easting)*(c.Easting-b.Easting);
 T('skewed 60 x 80: sides 60/80/60/80',near(d(A,r.c2),60,1e-9)&&near(d(r.c2,r.c3),80,1e-9)&&near(d(r.c3,r.c4),60,1e-9)&&near(d(r.c4,A),80,1e-9));
 T('skewed 60 x 80: all four corners square',[dot(A,r.c2,r.c3),dot(r.c2,r.c3,r.c4),dot(r.c3,r.c4,A),dot(r.c4,A,r.c2)].every(v=>Math.abs(v)<1e-6));
 T('skewed 60 x 80: both diagonals 100',near(d(A,r.c3),100,1e-9)&&near(d(r.c2,r.c4),100,1e-9)&&near(r.diag,100,1e-9));
 T('angle right to corner 3 = 53.1301',near(r.ar3,53.13010235,1e-6));}
// the layout angles must agree with angle-right shots: zero on corner 2, turn, shoot the distance
['R','L'].forEach(side=>{
  reset(); const q=rc(33.5,60,80,side);
  R('points.push({Point:50,Northing:'+q.c2.Northing+',Easting:'+q.c2.Easting+',Elevation:100,Type:"COGO",Description:"C2",Flag:""});currentPoint.bsPt=50;pointCounter=60');
  const s3=shoot({_ar:true,az:R('_toDDMMSS('+q.ar3+')'),dist:String(q.diag)}), s4=shoot({_ar:true,az:R('_toDDMMSS('+q.ar4+')'),dist:"80"});
  T('side '+side+': AR shot to corner 3 lands on it (within 0.001)',s3&&near(s3.Northing,q.c3.Northing,1e-3)&&near(s3.Easting,q.c3.Easting,1e-3),s3&&(s3.Northing-q.c3.Northing).toExponential(1)+' / '+(s3.Easting-q.c3.Easting).toExponential(1));
  T('side '+side+': AR shot to corner 4 lands on it',s4&&near(s4.Northing,q.c4.Northing,1e-6)&&near(s4.Easting,q.c4.Easting,1e-6));
});
}

console.log('\n=== HELP ===');
T('help has an angle-right topic',/\{ id:"angle-right", section:"Shots"/.test(html));
{const ids=[...html.matchAll(/\{ id:"([a-z0-9-]+)", section:"/g)].map(m=>m[1]);
 const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);
 T('help topic ids unique ('+ids.length+')',dup.length===0,dup.join(','));}

console.log('\n=== ANGLE RIGHT: '+pass+' pass / '+fail+' fail ===');
process.exit(fail?1:0);
