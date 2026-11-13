// ChainLink smoke test: evaluates the whole app at top level with DOM stubs
// and calls the startup functions. Catches load-time runtime errors that
// syntax checks cannot (e.g. the 4.4.8 orphaned-async bug).
// Usage: node app-smoke.js   (expects /home/claude/index.html or edit path)
process.on('uncaughtException',e=>{console.log('LATE THROW ->',e.message);process.exit(1)});
setTimeout(()=>{console.log('done (render loop timeboxed)');process.exit(0)},8000);
const fs=require('fs');const vm=require('vm');
const html=fs.readFileSync('/home/claude/index.html','utf8');
const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
const store={};
const el=()=>new Proxy(function(){},{get:(t,k)=>{
  if(k==='style')return {};
  if(k==='classList')return {add(){},remove(){},toggle(){},contains(){return false}};
  if(k==='getContext')return ()=>{
    const bag=new Proxy({},{get:(t2,k2)=>{
      if(k2==='canvas')return el();
      return (...a)=>bag;   // every ctx method returns a permissive object (gradients, patterns, metrics)
    },set:()=>true});
    return new Proxy({},{get:(t2,k2)=>{
      if(k2==='measureText')return ()=>({width:10});
      if(k2==='getImageData')return ()=>({data:new Uint8ClampedArray(4),width:1,height:1});
      return (...a)=>bag;
    },set:()=>true});
  };
  if(k==='appendChild'||k==='removeChild'||k==='insertBefore')return x=>x;
  if(k==='addEventListener'||k==='removeEventListener'||k==='setAttribute'||k==='focus'||k==='click'||k==='select')return ()=>{};
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
  alert:m=>console.log('[alert]',String(m).slice(0,120)),
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
try{
  vm.runInNewContext(code,sandbox,{filename:'app.js'});
  console.log('TOP-LEVEL EVAL: completed');
  for(const fn of ['loadData','updateStatus','saveData','plotPoints']){
    try{ if(typeof sandbox[fn]==='function'){sandbox[fn]();console.log(fn+': OK');} else console.log(fn+': not a function');}
    catch(e){ console.log(fn+': THREW ->',e.message); }
  }
}catch(e){
  console.log('TOP-LEVEL EVAL THREW ->',e.message);
  console.log((e.stack||'').split('\n').slice(0,5).join('\n'));
}
