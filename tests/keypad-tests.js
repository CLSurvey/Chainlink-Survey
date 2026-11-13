// 4.7.15 harness: surveyor keypad — insertion, delete, echo, wiring.
const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync(process.argv[2]||'./index.html','utf8');
const lines=src.split('\n');
const a=lines.findIndex(l=>l.startsWith('function _padKey('));
const b=lines.findIndex((l,i)=>i>a && l.startsWith('function _deedEditCall('));
const body=lines.slice(a,b).join('\n');

let pass=0,fail=0;
const t=(n,c,x)=>{if(c){pass++;console.log("  ok   "+n);}else{fail++;console.log("  FAIL "+n+(x!==undefined?"  -> "+JSON.stringify(x):""));}};

// minimal DOM
const mkEl=tag=>({tag,children:[],style:{cssText:""},_html:"",
  appendChild(c){this.children.push(c);return c;},
  setAttribute(k,v){this[k]=v;},getAttribute(k){return this[k];},
  addEventListener(ev,fn){(this._l=this._l||{})[ev]=(this._l[ev]||[]).concat(fn);},
  dispatchEvent(e){(this._l&&this._l[e.type]||[]).forEach(f=>f(e));return true;},
  setSelectionRange(s,e){this.selectionStart=s;this.selectionEnd=e;},
  focus(){},blur(){},
  set innerHTML(v){this._html=v;this.children=[];},get innerHTML(){return this._html;},
  insertAdjacentHTML(){}});
const env={document:{createElement:mkEl},Event:function(t2,o){this.type=t2;Object.assign(this,o);},
  Math,JSON,console,String,_esc:v=>String(v==null?"":v),
  _deedNormalize:s2=>String(s2||"").toUpperCase().trim(),
  _deedParseBearing:s2=>/^N\s*47.*E$/.test(s2)?{q1:"N",deg:47,min:23,sec:10,q2:"E"}:null,
  _deedBearingToAz:()=>47.386111,
  _deedAzToBearingStr:()=>"N 47\u00b023'10\" E"};
const ctx=vm.createContext(env);
vm.runInContext(body+";this.__api={_padIns,_padDel,_attachKeypad,_bearingEcho,_padKey,_padRow};",ctx);
const A=env.__api;
const inputEl=()=>{const e=mkEl("input");e.value="";e.selectionStart=0;e.selectionEnd=0;return e;};

console.log("— insertion at the caret —");
let i1=inputEl(); A._padIns(i1,"N"); A._padIns(i1,"4"); A._padIns(i1,"7");
t("appends in order", i1.value==="N47", i1.value);
t("caret tracks the insert", i1.selectionStart===3, i1.selectionStart);
i1.setSelectionRange(1,1); A._padIns(i1," ");
t("inserts mid-string, not at the end", i1.value==="N 47", i1.value);
i1.setSelectionRange(0,4); A._padIns(i1,"S");
t("replaces a selection", i1.value==="S", i1.value);

console.log("— delete —");
let i2=inputEl(); ["N","4","7","\u00b0"].forEach(k=>A._padIns(i2,k));
A._padDel(i2); t("backspace removes one char", i2.value==="N47", i2.value);
i2.setSelectionRange(0,0); A._padDel(i2);
t("backspace at position 0 is a no-op", i2.value==="N47", i2.value);
i2.setSelectionRange(1,3); A._padDel(i2);
t("backspace deletes a selection", i2.value==="N", i2.value);
let i3=inputEl(); A._padDel(i3); t("backspace on empty is safe", i3.value==="");

console.log("— pad layout —");
const host=mkEl("div"); const inp=inputEl();
A._attachKeypad(inp,host,"bearing");
t("system keyboard suppressed", inp.getAttribute("inputmode")==="none", inp.getAttribute("inputmode"));
const pad=host.children[0];
const keys=[]; pad.children.forEach(r=>r.children.forEach(k=>keys.push(k.textContent)));
["N","S","E","W","\u00b0","'",'"',"0","1","9",".","\u232b","CLR","\u2328"].forEach(k=>
  t("bearing pad has "+(k==="\u232b"?"backspace":k==="\u2328"?"keyboard toggle":k), keys.includes(k), keys));
t("curve shortcuts present", keys.includes("CURVE L")&&keys.includes("CURVE R"));
t("no alphabet beyond the quadrant letters",
  keys.filter(k=>/^[A-Z]$/.test(k)).sort().join("")==="ENSW", keys.filter(k=>/^[A-Z]$/.test(k)));

const host2=mkEl("div"); const inp2=inputEl();
A._attachKeypad(inp2,host2,"distance");
const dk=[]; host2.children[0].children.forEach(r=>r.children.forEach(k=>dk.push(k.textContent)));
t("distance pad is numeric", ["0","1","5","9","."].every(k=>dk.includes(k)), dk);
t("distance pad has no quadrant letters", !dk.includes("N")&&!dk.includes("W"));
t("legacy units offered", dk.some(k=>/^CHa|CHAINS/i.test(k))&&dk.some(k=>/^POl|POLES/i.test(k)), dk);
t("00 shortcut", dk.includes("00"));

console.log("— keys fire without stealing the caret —");
const r=A._padRow(host); let fired=0;
const k=A._padKey(r,"N","",()=>fired++);
let prevented=false; k.onmousedown({preventDefault(){prevented=true;}});
t("mousedown is prevented (caret stays put)", prevented);
k.onclick({preventDefault(){}}); t("click inserts", fired===1);

console.log("— live echo —");
const host3=mkEl("div"); const inp3=inputEl();
const echo=A._bearingEcho(inp3,host3);
t("empty shows a dash", /\u2014/.test(echo.innerHTML), echo.innerHTML);
inp3.value="N 47\u00b023'10\" E"; inp3.dispatchEvent(new env.Event("input"));
t("valid bearing echoes back with azimuth", /47\u00b023'10" E/.test(echo.innerHTML)&&/az /.test(echo.innerHTML), echo.innerHTML);
inp3.value="N 4"; inp3.dispatchEvent(new env.Event("input"));
t("partial input says so instead of guessing", /not a bearing yet/.test(echo.innerHTML), echo.innerHTML);
inp3.value="CURVE L R=250 ARC=130.9"; inp3.dispatchEvent(new env.Event("input"));
t("curve syntax passes through", /CURVE L/.test(echo.innerHTML), echo.innerHTML);

console.log("— wiring —");
t("bearing field gets the bearing pad", /"bearing"\);/.test(src));
t("distance field gets the numeric pad", /"distance"\);/.test(src));
t("fld only attaches when a kind is given", /if\(kind\)\{ if\(kind==="bearing"\)_bearingEcho/.test(src));
const vA=(src.match(/const APP_VERSION = "([^"]+)";/)||[])[1];
const vB=(src.match(/content="ChainLink-v([^"]+)"/)||[])[1];
const vC=(src.match(/<title>ChainLink Survey v([^<]+)<\/title>/)||[])[1];
t("all three version sites agree", vA&&vA===vB&&vA===vC, [vA,vB,vC]);

console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
