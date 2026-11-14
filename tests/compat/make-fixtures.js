#!/usr/bin/env node
/* Writes the compatibility fixtures: for each listed version in the repo's own
   history, the app of that version builds the scenario job with its own code,
   saves it, and the phone storage it leaves behind, its CSV copy and its own
   record of the job are written to fixtures/<version>.json.
   Run from the repository root:  node tests/compat/make-fixtures.js
   (needs git history). Fixtures are committed; re-running only adds versions. */
const fs=require('fs'),path=require('path'),{execSync}=require('child_process');
const {makeApp}=require('./sandbox.js');
const scenario=require('./scenario.js');
const VERSIONS=[["4.4.21","8686e98"],["4.5.7","a95a513"],["4.6.9","5527314"],["4.7.15","3ceb205"],["4.7.20","ef9a3b1"],
  ["4.7.37","05ae7ba"],["4.8.5","1f74cd9"],["4.8.9","59401c1"],["4.8.13","577beb5"],["4.8.14","4a16e8d"]];
const out=path.join(__dirname,'fixtures');
for(const [ver,commit] of VERSIONS){
  const file=path.join(out,ver+'.json');
  if(fs.existsSync(file)&&!process.argv.includes('--force')){console.log('keep  '+ver);continue;}
  const html=execSync('git show '+commit+':index.html',{maxBuffer:1<<26}).toString();
  const app=makeApp(html,{});
  if(app.loadError){console.log('FAIL  '+ver+' did not load: '+app.loadError.message);continue;}
  try{ app.run('loadData()'); }catch(e){ console.log('warn  '+ver+' boot: '+e.message); }
  try{ app.run(scenario); }catch(e){ console.log('FAIL  '+ver+' scenario: '+e.message); continue; }
  let csv=null,capture=null;
  try{ csv=app.run('typeof _buildCSV==="function"?_buildCSV():null'); }catch(e){}
  try{ capture=app.run('typeof _jobCapture==="function"?JSON.parse(JSON.stringify(_jobCapture())):null'); }catch(e){}
  const fx={version:ver,commit,written:new Date().toISOString().slice(0,10),storage:app.store,csv,capture};
  fs.writeFileSync(file,JSON.stringify(fx,null,1));
  console.log('wrote '+ver+'  keys:'+Object.keys(app.store).length+'  csv:'+(csv?csv.length:0)+'  capture:'+(capture?Object.keys(capture).length:'none')+
    '  anchor saved:'+(/geoAnchor/.test(JSON.stringify(app.store))));
}
setTimeout(()=>process.exit(0),50);
