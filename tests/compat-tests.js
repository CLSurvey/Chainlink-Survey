#!/usr/bin/env node
/* ChainLink — compatibility and round-trip tests.
   Usage: node tests/compat-tests.js [path/to/index.html]   (default ./index.html)

   1. Round trips with this version: every field the app saves for a job
      (read from _jobCapture itself, so a new field is covered automatically)
      must survive (a) save and reopen, (b) its CSV copy written and loaded,
      even when another anchored job was open at the time.
   2. Phone storage left by older versions (fixtures/<version>.json, written by
      that version's own code — see compat/make-fixtures.js) must open in this
      version with nothing lost.
   3. CSV copies written by older versions must load with everything they
      carried; what they did not carry must not be borrowed from the job that
      was open; State Plane jobs with no anchor must be recoverable from their
      own grid, landing exactly where the old version had them.
   4. The real BAC.csv that exposed the missing anchor (4.8.13 copy).
   A field that is deliberately not round-tripped must be listed in NOT_KEPT
   with the reason — otherwise the test fails. */
const fs=require('fs'),path=require('path');
const {makeApp}=require('./compat/sandbox.js');
const scenario=require('./compat/scenario.js');
const htmlPath=process.argv[2]||'./index.html';
const html=fs.readFileSync(htmlPath,'utf8');
const FX=path.join(__dirname,'compat','fixtures');
const NOT_KEPT={v:"format number, rewritten on every save",id:"a CSV loaded as a new job gets a new id",updatedAt:"time of the save"};

let pass=0,fail=0;
const t=(n,c,x)=>{if(c){pass++;console.log("  ok   "+n);}else{fail++;console.log("  FAIL "+n+(x!==undefined?"  -> "+JSON.stringify(x).slice(0,300):""));}};
const isNum=v=>typeof v==="number";
// differences between what was saved (want) and what came back (got); keys absent from want are not checked
function diff(want,got,tol,at,out){
  out=out||[];at=at||"";
  if(want===undefined)return out;
  if(isNum(want)&&isNum(got)){ if(!(Math.abs(want-got)<=(tol||0)||(isNaN(want)&&isNaN(got))))out.push(at+": "+want+" → "+got); return out; }
  if(want===null||typeof want!=="object"){ if(want!==got)out.push(at+": "+JSON.stringify(want)+" → "+JSON.stringify(got)); return out; }
  if(got===null||typeof got!=="object"){ out.push(at+": "+JSON.stringify(want).slice(0,60)+" → "+JSON.stringify(got)); return out; }
  if(Array.isArray(want)&&(!Array.isArray(got)||got.length!==want.length)){ out.push(at+": "+want.length+" items → "+(Array.isArray(got)?got.length:typeof got)); return out; }
  for(const k of Object.keys(want)) diff(want[k],got[k],tol,at+(Array.isArray(want)?"["+k+"]":"."+k),out);
  return out;
}
// an area label's text is worked out again from its corners when a job opens, so the
// label is compared by where it sits and which corners it measures
const areaKey=L=>(L||[]).map(l=>({E:l.E,N:l.N,ptNums:l.ptNums}));
// the CSV writes coordinates to 4 decimals
const ptTol=(k)=>/^(Northing|Easting|Elevation)$/.test(k)?6e-5:1e-9;
function diffPoints(want,got){
  const out=[];
  if(!Array.isArray(got)||got.length!==want.length)return ["points: "+want.length+" → "+(got&&got.length)];
  want.forEach((p,i)=>{const g=got.find(q=>q.Point===p.Point); if(!g){out.push("point "+p.Point+" missing");return;}
    for(const k of Object.keys(p)) diff(p[k],g[k],ptTol(k),"point "+p.Point+"."+k,out);});
  return out;
}
const boot=(storage)=>{const a=makeApp(html,storage||{}); if(a.loadError)throw a.loadError; a.run('loadData()'); return a;};
const cap=a=>a.run('JSON.parse(JSON.stringify(_jobCapture()))');
// another job, anchored far away with imagery, area labels and NGS marks — what a loaded file must never inherit
const OTHER=`(function(){ if(typeof _stageNewJob==="function")_stageNewJob(); _jobPendingNew=true; jobName="OTHER";
  points=[{Point:1,Northing:10000,Easting:10000,Elevation:0,Type:"Setup",Description:"",Flag:""}]; plotConnections=[]; _polylines=[];
  _setAnchor(37.4,-83.85,_SPC_ZONES.find(z=>/^KY/.test(z.name))||_SPC_ZONES[0],10000,10000); satOn=true; satRotNudge=1.5;
  _areaLabels=[{E:1,N:1,label:"x",ptNums:[],u:"ft"}]; _ngsMarks=[{pid:"ZZ9999",lat:37.4,lon:-83.85,E:1,N:1}]; saveData(); })()`;
const loadCsv=(a,csv,name)=>a.run('_jobFileAsNew=true; _parseCSV('+JSON.stringify(csv)+','+JSON.stringify(name)+'); try{closeAllModals();}catch(e){}');

console.log("— this version: every saved field survives save → reopen —");
const A=boot({}); A.run(scenario);
const c1=cap(A), FIELDS=Object.keys(c1).filter(k=>!(k in NOT_KEPT));
t("the scenario job is complete ("+FIELDS.length+" fields)", c1.points.length>=4&&c1.geoAnchor&&c1.deedPlot&&c1.polylines.length&&c1.areaLabels.length&&c1.ngsMarks.length, FIELDS);
const B=boot(A.store), c2=cap(B);
FIELDS.forEach(k=>{const d=k==="areaLabels"?diff(areaKey(c1[k]),areaKey(c2[k]),1e-9,k):diff(c1[k],c2[k],1e-9,k); t("reopen keeps "+k, !d.length, d.slice(0,3));});

console.log("— this version: every saved field survives its CSV copy —");
const csv=A.run('_buildCSV()');
t("CSV point rows keep the 7-column format", /^Point,Northing,Easting,Elevation,Description,Type,Flag\n/.test(csv)&&csv.split("\n").filter(l=>/^\d/.test(l)).length===c1.points.length);
const C=boot({}); C.run(OTHER); loadCsv(C,csv,"COMPAT.csv"); const c3=cap(C);
FIELDS.forEach(k=>{
  const d=k==="points"?diffPoints(c1.points,c3.points):k==="areaLabels"?diff(areaKey(c1[k]),areaKey(c3[k]),1e-9,k):diff(c1[k],c3[k],1e-9,k);
  t("CSV keeps "+k, !d.length, d.slice(0,3));
});
t("loaded CSV is its own job, not the one that was open", C.run('_jobIndex().length')===2&&c3.name==="COMPAT");

console.log("— phone storage left by older versions opens with nothing lost —");
const fixtures=fs.readdirSync(FX).filter(f=>/^\d.*\.json$/.test(f)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
for(const f of fixtures){
  const fx=JSON.parse(fs.readFileSync(path.join(FX,f),'utf8')), v=fx.version;
  let a,c; try{ a=boot(fx.storage); c=cap(a); }catch(e){ t(v+": opens", false, e.message); continue; }
  let want=fx.capture;
  if(!want){ // pre-library storage: the job lived in separate keys
    const S=fx.storage, J=k=>{try{return JSON.parse(S[k]);}catch(e){return undefined;}};
    want={name:S.cl_jobName,points:J("cl_points"),plotConnections:J("cl_connections"),polylines:J("cl_polylines"),geoAnchor:J("cl_geoAnchor"),
      satOn:S.cl_satOn==="true",satOpacity:parseFloat(S.cl_satOpacity),satRotNudge:parseFloat(S.cl_satRot),satBasemap:S.cl_satBase,
      units:S.cl_units,surveyMode:S.cl_surveyMode,distMode:S.cl_distMode,prismConstant:parseFloat(S.cl_prismK),combinedScaleFactor:parseFloat(S.cl_csf),
      areaLabels:(J("cl_areaLabels")||[]).map(l=>({E:l.E,N:l.N,label:l.label}))};
  }
  const bad=[];
  for(const k of Object.keys(want)){ if(k in NOT_KEPT)continue;
    if(k==="deedPlot"){ if(want.deedPlot&&!c.deedPlot)bad.push("deed lost"); continue; }
    if(k==="areaLabels"){ bad.push(...diff(want[k].map(l=>({E:l.E,N:l.N})),(c[k]||[]).map(l=>({E:l.E,N:l.N})),1e-9,k)); if((c[k]||[]).some(l=>!l.label))bad.push("area label text missing"); continue; }
    bad.push(...diff(want[k],c[k],1e-9,k)); }
  if(!fx.capture&&fx.storage.cl_deedPlot&&!c.deedPlot)bad.push("deed lost");
  if(fx.capture&&fx.capture.deedPlot&&c.deedPlot){
    const nw=fx.capture.deedPlot.figures.map(g=>g.calls.length).join(), ng=c.deedPlot.figures.map(g=>g.calls.length).join();
    if(nw!==ng)bad.push("deed calls "+nw+" → "+ng);
  }
  t(v+": opens with every saved field intact", !bad.length, bad.slice(0,4));
  t(v+": anchor kept and imagery on", !!(c.geoAnchor&&c.satOn), [!!c.geoAnchor,c.satOn]);
  t(v+": job is on the Job Manager list", a.run('_jobIndex().some(j=>j.id===_activeJobId)&&!(typeof _jobIsHidden==="function"&&_jobIsHidden(_activeJobId))'));
  a.run('saveData()'); const again=JSON.parse(a.store["cl_job_"+a.run('_activeJobId')]);
  t(v+": saving it again in this version keeps the anchor", !!again.geoAnchor&&!diff(c.geoAnchor,again.geoAnchor,1e-12).length);
  t(v+": taking it off the list changes nothing saved", (()=>{if(a.run('typeof _jobHide')!=="function")return false;const id=a.run('_activeJobId'),k="cl_job_"+id,before=a.store[k];a.run('_jobHide('+JSON.stringify(id)+')');return a.store[k]===before&&a.run('_jobIsHidden('+JSON.stringify(id)+')');})(), "this build has no take-off-the-list");
}

console.log("— CSV copies written by older versions —");
for(const f of fixtures){
  const fx=JSON.parse(fs.readFileSync(path.join(FX,f),'utf8')), v=fx.version;
  if(!fx.csv){ t(v+": has a CSV copy", false); continue; }
  const meta=JSON.parse(fx.csv.split("\n").find(l=>l.startsWith("#CHAINLINK:")).slice(11));
  const want=fx.capture||{points:JSON.parse(fx.storage.cl_points),geoAnchor:JSON.parse(fx.storage.cl_geoAnchor||"null")};
  const a=boot({}); a.run(OTHER); loadCsv(a,fx.csv,"COMPAT.csv"); const c=cap(a);
  const bad=diffPoints(want.points,c.points);
  bad.push(...diff(meta.connections,c.plotConnections,1e-9,"connections"));
  if(meta.polylines)bad.push(...diff(meta.polylines,c.polylines,1e-9,"polylines"));
  if(meta.deed&&!c.deedPlot)bad.push("deed lost");
  if(meta.deed&&c.deedPlot&&meta.deed.figures.map(g=>g.calls.length).join()!==c.deedPlot.figures.map(g=>g.calls.length).join())bad.push("deed calls changed");
  if(meta.units!==c.units)bad.push("units "+meta.units+" → "+c.units);
  if(meta.surveyMode!==c.surveyMode)bad.push("surveyMode "+meta.surveyMode+" → "+c.surveyMode);
  t(v+" CSV: points, raw observations, lines, polylines, deed, units and mode come back", !bad.length, bad.slice(0,4));
  if(meta.job&&meta.job.geoAnchor){
    t(v+" CSV: carries its anchor and it comes back", !diff(want.geoAnchor,c.geoAnchor,1e-12).length&&c.satOn);
  }else{
    t(v+" CSV: no anchor in the file, none borrowed from the open job", !c.geoAnchor&&!c.satOn&&!c.areaLabels.length&&!c.ngsMarks.length, [!!c.geoAnchor,c.satOn,c.areaLabels.length,c.ngsMarks.length]);
    if(a.run('typeof _gridZoneGuess')!=="function"){ t(v+" CSV: grid recovery exists in this build", false); continue; }
    const hits=a.run('_gridZoneGuess().map(h=>h.z.name)');
    t(v+" CSV: grid recovery offers AL East", hits.some(n=>/^AL East/.test(n)), hits);
    a.run('_anchorFromGrid(_SPC_ZONES.find(z=>/^AL East/.test(z.name)))'); const g=a.run('JSON.parse(JSON.stringify(geoAnchor))');
    t(v+" CSV: recovered anchor is where "+v+" had it", g&&Math.abs(g.lat-want.geoAnchor.lat)<1e-9&&Math.abs(g.lon-want.geoAnchor.lon)<1e-9&&g.E===want.geoAnchor.E&&g.N===want.geoAnchor.N,
      g&&[g.lat,g.lon,want.geoAnchor.lat,want.geoAnchor.lon]);
  }
}

console.log("— BAC.csv, the real file (4.8.13 copy) —");
{
  const bac=fs.readFileSync(path.join(FX,'BAC-4.8.13.csv'),'utf8');
  const a=boot({}); a.run(OTHER); loadCsv(a,bac,"BAC.csv"); const c=cap(a);
  t("3 points at their exact coordinates", c.points.length===3&&c.points[0].Northing===1271228.583&&c.points[0].Easting===665013.9634&&c.points[2].Easting===664958.9634, c.points.map(p=>[p.Point,p.Northing,p.Easting]));
  t("raw observations restored", c.points[1].From===1&&c.points[1].HorizDist===100&&c.points[2].RawAz==="270°00'00\"");
  t("2 lines", c.plotConnections.length===2);
  t("no anchor borrowed", !c.geoAnchor&&!c.satOn);
  if(a.run('typeof _anchorFromGrid')==="function")a.run('_anchorFromGrid(_SPC_ZONES.find(z=>/^AL East/.test(z.name)))'); const g=a.run('JSON.parse(JSON.stringify(geoAnchor))');
  t("recovered on AL East at 33.99429, -85.80414", g&&g.lat.toFixed(5)==="33.99429"&&g.lon.toFixed(5)==="-85.80414", g&&[g.lat,g.lon]);
  const again=a.run('_buildCSV()');
  t("its next CSV copy carries the anchor", /"job":\{[^\n]*"geoAnchor":\{/.test(again));
}

console.log("\n"+pass+" passed, "+fail+" failed");
setTimeout(()=>process.exit(fail?1:0),20);
