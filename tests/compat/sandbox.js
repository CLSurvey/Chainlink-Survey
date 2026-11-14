// Runs a whole ChainLink index.html in a Node vm with DOM stubs and a real
// in-memory localStorage — the same approach as app-smoke.js. Used by the
// compatibility tests and the fixture generator.
const vm=require('vm');
function el(){return new Proxy(function(){},{get:(t,k)=>{
  if(k==='style')return {};
  if(k==='classList')return {add(){},remove(){},toggle(){},contains(){return false}};
  if(k==='dataset')return {};
  if(k==='getContext')return ()=>{const bag=new Proxy({},{get:(t2,k2)=>k2==='canvas'?el():((...a)=>bag),set:()=>true});
    return new Proxy({},{get:(t2,k2)=>k2==='measureText'?(()=>({width:10})):k2==='getImageData'?(()=>({data:new Uint8ClampedArray(4),width:1,height:1})):((...a)=>bag),set:()=>true});};
  if(k==='appendChild'||k==='removeChild'||k==='insertBefore'||k==='append'||k==='prepend')return x=>x;
  if(k==='addEventListener'||k==='removeEventListener'||k==='setAttribute'||k==='removeAttribute'||k==='focus'||k==='blur'||k==='click'||k==='select'||k==='remove'||k==='scrollIntoView')return ()=>{};
  if(k==='getAttribute')return ()=>null;
  if(k==='querySelector'||k==='getElementById'||k==='closest')return ()=>el();
  if(k==='querySelectorAll')return ()=>[];
  if(k==='children'||k==='childNodes')return [];
  if(k==='getBoundingClientRect')return ()=>({left:0,top:0,right:400,bottom:800,width:400,height:800});
  if(k===Symbol.toPrimitive)return ()=>"";
  return el();
},set:()=>true});}
function makeApp(html,storage){
  const store=Object.assign({},storage||{});
  const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
  const timers=[];
  const sb={console:{log(){},warn(){},error(){},info(){}},
    setTimeout:(f,ms)=>{const h=setTimeout(()=>{try{f()}catch(e){}},Math.min(ms||0,5));timers.push(h);return h;},
    clearTimeout, setInterval:()=>0, clearInterval:()=>{},
    localStorage:{getItem:k=>(k in store?store[k]:null),setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]},
      key:i=>Object.keys(store)[i]||null,get length(){return Object.keys(store).length},clear:()=>{for(const k in store)delete store[k];}},
    navigator:{onLine:true,userAgent:"node",geolocation:{getCurrentPosition(){},watchPosition(){return 1},clearWatch(){}},clipboard:{writeText:()=>Promise.resolve()},
      canShare:()=>false,share:()=>Promise.resolve(),serviceWorker:{register:()=>Promise.resolve({})},storage:{persist:()=>Promise.resolve(true)}},
    fetch:()=>new Promise(()=>{}), alert:()=>{}, confirm:()=>true, prompt:()=>null,
    Image:function(){return el()}, FileReader:function(){this.readAsText=()=>{};this.readAsArrayBuffer=()=>{}},
    Blob:function(p,o){this.type=(o&&o.type)||''}, File:function(p,n,o){this.name=n;this.type=(o&&o.type)||''},
    URL:{createObjectURL:()=>'blob:x',revokeObjectURL:()=>{}}, requestAnimationFrame:()=>0, cancelAnimationFrame:()=>{},
    screen:{width:400,height:800}, devicePixelRatio:2, performance:{now:()=>Date.now()},
    atob:s=>Buffer.from(s,'base64').toString('binary'), btoa:s=>Buffer.from(s,'binary').toString('base64'),
    MutationObserver:function(){this.observe=()=>{};this.disconnect=()=>{};}, ResizeObserver:function(){this.observe=()=>{};this.disconnect=()=>{};},
    matchMedia:()=>({matches:false,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){}}),
    addEventListener:()=>{}, removeEventListener:()=>{}, dispatchEvent:()=>true,
    innerWidth:400, innerHeight:800, location:{href:'https://app.test/',search:'',hash:'',reload(){}}, history:{replaceState(){},pushState(){}},
    Event:function(t){this.type=t;}, CustomEvent:function(t){this.type=t;}, DOMParser:function(){this.parseFromString=()=>el();}};
  sb.window=sb; sb.self=sb; sb.globalThis=sb;
  sb.document=new Proxy({},{get:(t,k)=>{
    if(k==='getElementById'||k==='querySelector'||k==='createElement'||k==='createElementNS'||k==='createTextNode')return ()=>el();
    if(k==='querySelectorAll'||k==='getElementsByClassName'||k==='getElementsByTagName')return ()=>[];
    if(k==='addEventListener'||k==='removeEventListener')return ()=>{};
    if(k==='body'||k==='head'||k==='documentElement')return el();
    if(k==='visibilityState')return 'visible'; if(k==='hidden')return false; if(k==='readyState')return 'complete';
    return el();},set:()=>true});
  const ctx=vm.createContext(sb);
  let loadError=null;
  try{ vm.runInContext(code,ctx,{filename:'index.html'}); }catch(e){ loadError=e; }
  const run=src=>vm.runInContext(src,ctx);
  return {run,store,loadError,ctx};
}
module.exports={makeApp};
