// 4.7.3 harness: point action dock, shared connect flow, polyline labels.
const fs=require('fs');
const src=fs.readFileSync(process.argv[2]||'./index.html','utf8');
let pass=0,fail=0;
const t=(n,c,x)=>{if(c){pass++;console.log("  ok   "+n);}else{fail++;console.log("  FAIL "+n+(x!==undefined?"  -> "+JSON.stringify(x).slice(0,180):""));}};

console.log("— point action dock —");
const dock=src.match(/function _showPointQuickActions\(p\)\{.*/);
t("dock found", !!dock);
const D=dock?dock[0]:"";
t("Flag removed from the dock", !/\["Flag"/.test(D), D.slice(-160));
t("Connect added to the dock", /\["Connect"/.test(D));
t("Details still first", D.indexOf('"Details"')<D.indexOf('"Occupy"'));
t("Occupy and Stake untouched", /\["Occupy"/.test(D)&&/\["Stake"/.test(D));
t("dock clears the selection before entering tap mode", /selectedPoint=null;_connectFromPoint\(p\)/.test(D));

console.log("— Flag still reachable under Details —");
const ctx=src.match(/function _pointContextMenu\(p\)\{[\s\S]*?\n\}\n\nfunction flagPoint_pt/);
const C=ctx?ctx[0]:"";
t("context menu found", !!ctx);
t("Flag / Mark lives in Details", /Flag \/ Mark/.test(C)&&/flagPoint_pt\(p\)/.test(C));
t("flagPoint_pt still defined", /function flagPoint_pt\(p\)\{/.test(src));

console.log("— shared connect flow —");
t("_connectFromPoint defined once", (src.match(/function _connectFromPoint\(/g)||[]).length===1);
t("context menu delegates to it", /mk\("↔ Connect to Another Point","blue",\(\)=>_connectFromPoint\(p\)\)/.test(C));
t("no duplicated inline connect handler", (src.match(/window\._connClickHandler=function\(toPt\)/g)||[]).length===1);
t("connect flow arms tap mode", /_connClickActive=true/.test(src));
t("connect result now reports bearing and distance", /\{lbl:"Bearing:",val:fmtBrg\(azimuth\(p,toPt\)\)\}/.test(src));

console.log("— polyline labels —");
const dp=src.match(/const _drawPolyline=\(pl,col,lw,rings\)=>\{[\s\S]*?\n  \};/);
const P=dp?dp[0]:"";
t("_drawPolyline found", !!dp);
// 4.7.28: map labels share one suffix helper, _dU() ("'" or " m")
t("straight segments labelled with distance", /hd\.toFixed\(2\)\+(units|_dU\(\))/.test(P));
t("straight segments labelled with bearing", /fmtBrg\(_plBearing\(A\.E,A\.N,B\.E,B\.N\)\)/.test(P));
t("arcs report arc length and radius", /arcLen\.toFixed\(2\)/.test(P)&&/R="\+Number\(s\.R\)/.test(P));
t("arc sweep respects direction", /s\.dir==="ccw"\)\?\(sB-eB\):\(eB-sB\)/.test(P));
t("labels honour the LBL toggle", /if\(showLabels\)labels\.forEach/.test(P));
t("short on-screen segments stay clean", /L\.px>60/.test(P));
t("label helper defined", /const _plLabel=/.test(src));
t("labels use the shared collision registry", /_annoOverlaps\(bb\)/.test(src.match(/const _plLabel=[\s\S]*?\n  \};/)[0]));
t("bearing format follows the quad/DMS toggle", /fmtBrg/.test(P));

console.log("— version —");
// version-agnostic: the three sites must simply agree with one another
const vA=(src.match(/const APP_VERSION = "([^"]+)";/)||[])[1];
const vB=(src.match(/content="ChainLink-v([^"]+)"/)||[])[1];
const vC=(src.match(/<title>ChainLink Survey v([^<]+)<\/title>/)||[])[1];
t("APP_VERSION present", !!vA, vA);
t("all three version sites agree", vA&&vA===vB&&vA===vC, [vA,vB,vC]);

console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
