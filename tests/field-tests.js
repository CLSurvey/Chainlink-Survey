// field-tests.js — regression checks for the 4.8.19 field-session findings
// and the 4.8.20 curve / offset-staking findings.
// Runs the whole app in the compat sandbox (no browser).
//   node tests/field-tests.js [path/to/index.html]
'use strict';
const fs=require('fs'), path=require('path');
const {makeApp}=require('./compat/sandbox.js');
const APP=process.argv[2]||path.join(__dirname,'..','index.html');
const html=fs.readFileSync(APP,'utf8');
let pass=0,fail=0;
const t=(name,ok,info)=>{console.log((ok?'ok   ':'FAIL ')+name+(ok||info===undefined?'':'  → '+JSON.stringify(info)));ok?pass++:fail++;};
const boot=()=>{const a=makeApp(html,{});if(a.loadError)throw a.loadError;a.run('loadData()');return a;};
const sr=(a,code)=>{try{return a.run(code);}catch(e){return 'ERR '+e.message;}};

// A small closed traverse in angle-right mode, occupied at #4 with backsight #3.
const SETUP=`(function(){
  units="ft"; surveyMode="3D"; distMode="SD"; hzMode="ar";
  points=[
    {Point:1,Northing:5000,Easting:5000,Elevation:100,Type:"Setup",Description:"START",Flag:"",ih:5},
    {Point:2,Northing:5100,Easting:5000,Elevation:100,Type:"Shot",Description:"A",Flag:"",ih:5,From:1},
    {Point:3,Northing:5100,Easting:5100,Elevation:100,Type:"Shot",Description:"B",Flag:"",ih:5,From:2},
    {Point:4,Northing:5000,Easting:5100,Elevation:100,Type:"Shot",Description:"C",Flag:"",ih:5,From:3},
    {Point:5,Northing:5000.04,Easting:5000.03,Elevation:100,Type:"Shot",Description:"CLOSE ON 1",Flag:"",From:4},
    {Point:6,Northing:5150,Easting:5050,Elevation:100,Type:"Shot",Description:"SIDESHOT",Flag:"",From:1}];
  pointCounter=7; plotConnections=[]; currentPoint=points[3]; currentPoint.bsPt=3;
  window.__rows=null; showResult=function(title,rows){window.__title=title;window.__rows=rows;};
})()`;
const rowsText=a=>sr(a,'(window.__rows||[]).map(r=>r.lbl+" "+r.val).join(" | ")');

console.log('— Stakeout in angle-right mode —');
{
  const a=boot(); sr(a,SETUP);
  sr(a,'_doStakeout(points.find(p=>p.Point===2),"#2")');
  const r=rowsText(a);
  // from #4 (5000,5100) to #2 (5100,5000): az 315°; backsight #3 is az 0° → turn 315° right
  t('Set Inst to = angle right from the backsight (315°00\'00" ∠ right)', /Set Inst to: 315°00'00" ∠ right/.test(r), r);
  t('the backsight is shown', /Backsight: #3/.test(r), r);
  sr(a,'hzMode="az"; _doStakeout(points.find(p=>p.Point===2),"#2")');
  const r2=rowsText(a);
  t('azimuth mode still sets the azimuth', /Set Inst to: (315°00'00"|N ?45°00'00" ?W)/.test(r2)&&!/∠ right/.test(r2), r2);
}

console.log('— Bowditch on a closed loop —');
{
  const a=boot(); sr(a,SETUP);
  sr(a,'(function(){const P=n=>points.find(p=>p.Point===n);const poly=[P(1),P(2),P(3),P(4),P(5)];let sN=0,sE=0,D=0;for(let i=0;i<poly.length-1;i++){sN+=poly[i+1].Northing-poly[i].Northing;sE+=poly[i+1].Easting-poly[i].Easting;D+=Math.hypot(poly[i+1].Easting-poly[i].Easting,poly[i+1].Northing-poly[i].Northing);}_bowditchAdjust(poly,sN,sE,D);})()');
  const p1=JSON.parse(sr(a,'JSON.stringify(points.find(p=>p.Point===1))')), p5=JSON.parse(sr(a,'JSON.stringify(points.find(p=>p.Point===5))'));
  t('start point #1 is held', p1.Northing===5000&&p1.Easting===5000, p1);
  t('closing shot #5 lands on #1', Math.abs(p5.Northing-5000)<1e-9&&Math.abs(p5.Easting-5000)<1e-9, p5);
  t('labelled a closed loop', /Traverse type: Closed loop — #5 held to #1/.test(rowsText(a)), rowsText(a));
}

console.log('— Stacked points: the tap asks which one —');
{
  // The sheet itself is DOM (checked in the browser run); here: the tap handler
  // groups points within 6 px and hands a group of 2+ to the chooser.
  const a=boot();
  t('chooser exists', sr(a,'typeof _pickChooser')==='function');
  t('tap handler routes stacked points to it', /grp\.length>1\)\{ _pickChooser\(grp\)/.test(html));
}

console.log('— FIT centres the job —');
{
  const a=boot(); sr(a,SETUP);
  const T=JSON.parse(sr(a,'(()=>{viewScale=1;viewOffsetX=0;viewOffsetY=0;const T=_viewTransform(400,800);const xs=points.map(p=>p.Easting*T.scale+T.offX);return JSON.stringify({l:Math.min(...xs),r:400-Math.max(...xs)})})()'));
  t('equal left and right margins', Math.abs(T.l-T.r)<0.5&&T.l>=40, T);
}

console.log('— Deed placement is its own undo step —');
{
  const a=boot(); sr(a,SETUP);
  sr(a,'_deedSet(parseDeedText("Beginning; thence North 100 feet; thence East 100 feet; thence South 100 feet; thence West 100 feet to the beginning."),5300,5300)');
  t('undo is labelled "Plot deed"', /Plot deed/.test(sr(a,'(_snapshots[_snapshots.length-1]||{}).label')), sr(a,'(_snapshots[_snapshots.length-1]||{}).label'));
  sr(a,'undo()');
  t('undo removes the deed and keeps the shots', sr(a,'!_deedPlot&&points.length')===6, sr(a,'points.length'));
}

console.log('— Far-away import asks first —');
{
  const a=boot(); sr(a,SETUP);
  t('nearby coordinates go straight in', sr(a,'_importFarGate([{N:5050,E:5050}],"x",()=>{})')===true);
  t('State Plane into an assumed job asks', sr(a,'_importFarGate([{N:1271000,E:665000}],"x",()=>{})')===false);
}

console.log('— Check shot in 3D asks slope distance and VA —');
{
  const a=boot(); sr(a,SETUP);
  // #4 → #1 is az 270°, 100 ft. Backsight #3 is az 0°, so 270° right. SD 100.0152 at VA 89°00'00" = 100.000 HD
  sr(a,`(function(){const answers=["1","270.0000","100.0152","89.0000"];window.__prompts=[];
    calculatorInput=function(label,def,cb){window.__prompts.push(label);cb(answers.shift());};})()`);
  sr(a,'checkShot()');
  const pr=sr(a,'JSON.stringify(window.__prompts)'), r=rowsText(a);
  t('prompts for slope distance and VA', /Slope distance/.test(pr)&&/Vertical angle VA/.test(pr), pr);
  t('HD reduced from SD and VA', /Measured HD: 100\.000/.test(r), r);
  t('angle error in degrees-minutes-seconds', /Az Error: [+−]0°00'00"/.test(r), r);
}

console.log('— Two-face keeps the description —');
{
  const a=boot(); sr(a,SETUP); sr(a,'hzMode="az"');
  sr(a,`(function(){let n=0;_shotForm=function(pre,auto,cb){n++;
    if(n===1)cb({pt:"7",desc:"IPF CHECK",az:"45.0000",dist:"100",va:"90.0000",th:"5",ih:"5"});
    else cb({pt:"7",desc:pre,az:"225.0004",dist:"100.02",va:"270.0000",th:"5",ih:"5"});};
    const D=document; document=new Proxy({},{get:(t,k)=>k==="createElement"?(()=>({style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},appendChild(){},setAttribute(){}})):D[k]});
    openModal=function(build){const btns=[];const m={appendChild(b){btns.push(b);},classList:{add(){}},style:{}};build(m,()=>{});const b=btns.find(x=>/Face 2/.test(x.textContent||""));if(b)b.onclick();};
    showResult=function(title,rows,acts){window.__title=title;window.__rows=rows;const s=(acts||[]).find(x=>/Store/.test(x.txt));if(s)s.fn();};})()`);
  sr(a,'_twoFaceCapture(currentPoint,true)');
  t('stored point keeps "IPF CHECK"', sr(a,'(points[points.length-1]||{}).Description')==='IPF CHECK', sr(a,'(points[points.length-1]||{}).Description'));
}

console.log('— GeoJSON is lon/lat on an anchored job —');
{
  const a=boot(); sr(a,SETUP);
  sr(a,'Blob=function(p,o){this.parts=p;this.type=(o&&o.type)||""};_deliverFile=function(b,n){window.__gj=b.parts.join("")};');
  sr(a,'_setAnchor(34.0,-85.8,_SPC_ZONES.find(z=>/^AL East/.test(z.name)),5000,5000)');
  sr(a,'exportGeoJSON()');
  const g=JSON.parse(sr(a,'window.__gj'));
  const c=g.features[0].geometry.coordinates;
  t('point #1 at lon -85.8, lat 34.0', Math.abs(c[0]+85.8)<1e-6&&Math.abs(c[1]-34.0)<1e-6, c);
  t('grid values kept as properties', g.features[0].properties.N===5000&&g.features[0].properties.E===5000, g.features[0].properties);
  sr(a,'geoAnchor=null;exportGeoJSON()');
  const g2=JSON.parse(sr(a,'window.__gj'));
  t('unanchored job stays on the grid, labelled', g2.features[0].geometry.coordinates[0]===5000&&!!g2.crs_note);
}

// ---- 4.8.20: a 3-point curve, offset 10 ft outside, staked ----
// Center N10000 E10100, R 50, clockwise PC (N10050 E10100) → PT (N10000 E10150).
const CURVE=`(function(){
  units="ft"; surveyMode="3D"; distMode="SD"; hzMode="ar"; isPro=true; prismConstant=0;
  points=[
    {Point:1,Northing:10000,Easting:10000,Elevation:100,Type:"Setup",Description:"OCC",Flag:"",ih:5},
    {Point:2,Northing:10050,Easting:10100,Elevation:95,Type:"Shot",Description:"PC",Flag:"",From:1},
    {Point:3,Northing:10035.3553,Easting:10135.3553,Elevation:96,Type:"Shot",Description:"POC",Flag:"",From:1},
    {Point:4,Northing:10000,Easting:10150,Elevation:97,Type:"Shot",Description:"PT",Flag:"",From:1},
    {Point:5,Northing:10000,Easting:10200,Elevation:100,Type:"Shot",Description:"BS",Flag:"",From:1}];
  pointCounter=6; plotConnections=[]; currentPoint=points[0]; currentPoint.bsPt=5;
  _polylines=[{name:"CL",verts:[{E:10100,N:10050},{E:10150,N:10000}],segs:[{type:"arc",centerE:10100,centerN:10000,R:50,dir:"cw"}]}];
  window.__rows=null; showResult=function(title,rows){window.__title=title;window.__rows=rows;};
  window.__ans=[]; window.__prompts=[];
  calculatorInput=function(label,def,cb){window.__prompts.push(label);cb(window.__ans.shift());};
})()`;

console.log('— Curve: forward tangent on a clockwise arc —');
{
  const a=boot(); sr(a,CURVE);
  const az=Number(sr(a,'_plPointAtStaOff(_polylines[0],0,0).az'));
  t('tangent at the PC is 90° (was 270°)', Math.abs(az-90)<1e-6, az);
}

console.log('— Curve: Offset Polyline puts LEFT outside a clockwise arc —');
{
  const a=boot(); sr(a,CURVE);
  sr(a,'window.__ans=["-10"]; _offsetPolyline(_polylines[0],0)');
  const o=JSON.parse(sr(a,'JSON.stringify(_polylines[1]||null)'));
  t('−10 (left) on a clockwise arc → R 60', o&&Math.abs(o.segs[0].R-60)<1e-9, o&&o.segs[0]);
  t('PC moved out to N10060', o&&Math.abs(o.verts[0].N-10060)<1e-6&&Math.abs(o.verts[0].E-10100)<1e-6, o&&o.verts[0]);
  const z=JSON.parse(sr(a,'JSON.stringify(points.filter(p=>p.Description==="OFS").map(p=>p.Elevation))'));
  t('offset points keep the curve elevations (95, 97)', z.length===2&&z[0]===95&&z[1]===97, z);
}

console.log('— Curve: Point at Sta/Offset —');
{
  const a=boot(); sr(a,CURVE);
  const half=Number(sr(a,'_plTotalLen(_polylines[0])'))/2;
  sr(a,'window.__ans=["'+half+'","-10"]; _plSetPointAtSta(_polylines[0])');
  const r=rowsText(a);
  t('mid-curve 10 L lands at N10042.426 E10142.426', /Northing: 10042\.426/.test(r)&&/Easting: 10142\.426/.test(r), r);
  t('elevation interpolated from the PC/PT (96.000)', /Elevation: 96\.000/.test(r), r);
}

console.log('— Curve: Stake to Arc, 10 ft outside, angle right + 3D —');
{
  const a=boot(); sr(a,CURVE);
  // rod exactly on the R 60 offset at mid-curve; backsight #5 is az 90°
  const rod={N:10042.42641,E:10142.42641};
  const az=Math.atan2(rod.E-10000,rod.N-10000)*180/Math.PI, hd=Math.hypot(rod.E-10000,rod.N-10000);
  const ar=(az-90+360)%360, d=Math.floor(ar), mm=Math.floor((ar-d)*60), ss=((ar-d)*60-mm)*60;
  const dms=d+'.'+String(mm).padStart(2,'0')+String(Math.round(ss*100)).padStart(4,'0');
  const sd=hd/Math.sin(89*Math.PI/180);
  sr(a,'_stlOff=10; window.__ans=["'+dms+'","'+sd.toFixed(4)+'","89.0000"]; _stlMeasure({kind:"arc",conn:{type:"arc",centerE:10100,centerN:10000,R:50,startAngle:Math.PI/2,endAngle:0,delta:-90,arcLen:78.54,from:2,to:4}})');
  const pr=sr(a,'JSON.stringify(window.__prompts)'), r=rowsText(a);
  t('asks angle right from the backsight', /Angle right to rodman, backsight/.test(pr), pr);
  t('3D slope mode asks slope distance and VA', /Slope distance/.test(pr)&&/Vertical angle VA/.test(pr), pr);
  t('stakes to R 60 (10 ft outside)', /staking R 60\.000/.test(r), r);
  const off=(r.match(/Off target: ([\d.]+)/)||[])[1];
  t('rod is on the offset', off===undefined?/ON OFFSET/.test(r):Number(off)<0.01, r);
  t('reports 10.000 ft outside the arc', /From the arc: 10\.000 ft outside/.test(r), r);
}

console.log('— Curve: delta shown in d-m-s —');
t('no decimal-degree delta left', !/Delta:"?,\s*val:[^}]*toFixed\(4\)\+"(°|\\u00b0)"/.test(html));

console.log('\n'+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
