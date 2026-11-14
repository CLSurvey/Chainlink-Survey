// 4.7.2 harness: turned-angle geometry + blunder detection.
// 4.8.11: + 65 deed phrasings (one row per wording) and their geometry.
// 4.8.12: + 19 real published descriptions from eight states, as printed.
// 4.8.13: + bridging a gap, solving incomplete courses by closure and acreage, source tags.
const fs=require('fs');
const html=fs.readFileSync(process.argv[2]||'./index.html','utf8');
global.window={};
const p1=html.indexOf('const _DEED_UNIT_FT'), p2=html.indexOf('function _deedPasteModal');
const M=new module.constructor();
M._compile('let units="ft";var window=global.window;'
  +'function _esc(v){return String(v==null?"":v)}function showResult(){}function openModal(){}function alert(){}'
  +html.slice(p1,p2)
  .replace(/function _deedSyncPoints[\s\S]*?\n}\n/,'function _deedSyncPoints(){}\n')
  .replace(/function _deedRemovePoints[\s\S]*?\n}\n/,'function _deedRemovePoints(){}\n')
  +';module.exports={parseDeedText,parseDeedFigures,computeDeed,_deedBlunders,_deedArea,_deedBearingToAz,_deedAzToBearingStr,_deedGapSolve,_deedGapApply,_deedSrcTag,_deedPolyCalls,_deedRevertCalls};','h.js');
const P=M.exports;

let pass=0,fail=0;
const t=(n,c,x)=>{if(c){pass++;console.log("  ok   "+n);}else{fail++;console.log("  FAIL "+n+(x!==undefined?"  -> "+JSON.stringify(x).slice(0,200):""));}};
const fig=(txt)=>{const calls=P.parseDeedText(txt);const f={calls,pobE:0,pobN:0,kind:"boundary",name:"B"};
  f.computed=P.computeDeed(calls,0,0,0);return f;};
const diag=(f)=>P._deedBlunders(f,0);
const codes=(f)=>diag(f).map(d=>d.code);

console.log("— turned angles produce geometry —");
// A square walked with interior angles of 90°: N100, turn, E100, turn, S100, turn, W100
const sq='Begin; thence North 100 feet; thence turning an interior angle of 90 degrees a distance of 100 feet; thence turning an interior angle of 90 degrees a distance of 100 feet; thence turning an interior angle of 90 degrees a distance of 100 feet to the point of beginning.';
const F=fig(sq);
t("4 courses parsed", F.calls.filter(c=>c.type==="line").length===4, F.calls.map(c=>c.type));
t("interior-angle square closes", F.computed.closeDist<0.01, F.computed.closeDist);
t("turn side resolved and reported", F.computed.turnSide==="R"||F.computed.turnSide==="L", F.computed.turnSide);
t("area is 10,000 sq ft", Math.abs(P._deedArea(F.computed)-10000)<1, P._deedArea(F.computed));
t("turn-side note surfaces in diagnostics", codes(F).includes("turn-side"));

console.log("— a turned angle is never silently a bearing —");
const one=P.parseDeedText("thence turning an interior angle of 88 degrees 30 minutes, 100 feet")[0];
t("no fabricated bearing", one.bearing==null, one);
t("carries a deflection instead", !!one.defl && one.defl.kind==="interior", one.defl);
t("deflection = 180 - interior", Math.abs(one.defl.ang-91.5)<1e-9, one.defl.ang);
const bare=P.parseDeedText("thence an angle of 75 degrees, a distance of 100 feet")[0];
t("bare angle flagged as an assumption", bare.defl && bare.defl.assumed===true, bare.defl);
const cen=P.parseDeedText("thence through a central angle of 26 degrees 53 minutes 07 seconds, a distance of 168.93 feet")[0];
t("a curve's central angle is not turned into a line", cen.type==="partial", cen.type);
const wcb=P.parseDeedText("thence 127 degrees 30 minutes 45.2 metres")[0];
t("real whole-circle bearings still parse", wcb.type==="line"&&wcb.bearing&&wcb.bearing._wcb, wcb);

console.log("— geometry is produced even when it does not close —");
const bad=fig('Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 60 feet to the point of beginning.');
t("misclosing deed still yields vertices", bad.computed.verts.length===5, bad.computed.verts.length);
t("misclosure reported not hidden", bad.computed.closeDist>39 && bad.computed.closeDist<41, bad.computed.closeDist);

console.log("— blunder detection —");
t("distance blunder identified", codes(bad).includes("distance"), diag(bad));
const dfix=diag(bad).filter(d=>d.code==="distance");
t("correct distance is among the candidates", dfix.some(d=>Math.abs(d.fix.dist-100)<0.01), dfix.map(d=>d.fix));
t("ambiguity is stated, not hidden", dfix.length<2||dfix.every(d=>/cannot choose/.test(d.detail)));

// digit transposition: 132.45 keyed as 123.45 in a closed figure
const tr=fig('Begin; thence N 0-0-0 E 132.45 feet; thence S 90-0-0 E 200 feet; thence S 0-0-0 W 123.45 feet; thence N 90-0-0 W 200 feet to the point of beginning.');
t("transposed digits caught as a repair", codes(tr).includes("repair")||codes(tr).includes("distance"), diag(tr).map(d=>d.msg));

// quadrant flip: third course written S 0 E instead of S 0 W
const qf=fig('Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 E 100 feet to the point of beginning.');
t("quadrant transposition caught", diag(qf).some(d=>d.code==="repair"||d.code==="distance"||d.code==="angle"), diag(qf).map(d=>d.code));

console.log("— stated acreage cross-check —");
const acTxt='Begin; thence N 0-0-0 E 208.71 feet; thence S 90-0-0 E 208.71 feet; thence S 0-0-0 W 208.71 feet; thence N 90-0-0 W 208.71 feet to the point of beginning, containing 1.00 acres more or less.';
const figs=P.parseDeedFigures(acTxt);
t("stated acreage captured", figs[0] && figs[0].statedAcres===1, figs[0]&&figs[0].statedAcres);
const af={...figs[0],pobE:0,pobN:0};af.computed=P.computeDeed(af.calls,0,0,0);
t("acreage agreement reported", diag(af).some(d=>d.code==="acreage"&&d.sev==="info"), diag(af).filter(d=>d.code==="acreage"));
const wrongAc={...af,statedAcres:5};
t("acreage disagreement flagged", diag(wrongAc).some(d=>d.code==="acreage"&&d.sev!=="info"));

console.log("— misspelt degree words (real recorded deeds) —");
const spell=[["degres","thence run North 86 degres30 West a distance of 297.32 feet"],
             ["degrees","thence run North 86 degrees 30 West a distance of 297.32 feet"],
             ["degre","thence run North 86 degre 30 West a distance of 297.32 feet"],
             ["deg.","thence run North 86 deg. 30 West a distance of 297.32 feet"],
             ["degs","thence run North 86 degs 30 West a distance of 297.32 feet"],
             ["no space","thence run North 86 degrees30 West a distance of 297.32 feet"]];
spell.forEach(([n,txt])=>{
  const c=P.parseDeedText(txt)[0]||{};
  t("\""+n+"\" reads as N 86-30 W, 297.32", c.type==="line"&&c.bearing&&c.bearing.deg===86&&c.bearing.min===30&&c.bearing.q2==="W"&&Math.abs(c.dist-297.32)<0.01,
    [c.type,c.bearing,c.dist]);
});
const card=P.parseDeedText("thence North 100 feet to a point in the West line of said road")[0]||{};
t("a genuine due-north call still reads as cardinal", card.bearing&&card.bearing.card==="N"&&card.dist===100, [card.bearing,card.dist]);
const mangled=P.parseDeedText("thence North 86 d3grees 30 West a distance of 297.32 feet")[0]||{};
t("an unreadable bearing never publishes as due north", !(mangled.bearing&&mangled.bearing.card), mangled.bearing);
const distN=P.parseDeedText("thence North 1168.9' to a point in the West line of the road")[0]||{};
t("a foot-marked due-north distance still reads as cardinal", distN.bearing&&distN.bearing.card==="N"&&Math.abs(distN.dist-1168.9)<0.01, [distN.bearing,distN.dist]);

console.log("— DMS display carries —");
const B=P._deedAzToBearingStr;
t("54 minutes prints as 54, not 53'60\"", B(1+54/60)==="N 1\u00b054'00\" E", B(1+54/60));
t("31 minutes prints as 31", B(17+31/60)==="N 17\u00b031'00\" E", B(17+31/60));
t("west quadrant carries too", B(360-(2+54/60))==="N 2\u00b054'00\" W", B(360-(2+54/60)));
t("no minute field ever reaches 60", [1+54/60,17+31/60,213.5166666,357.1,44.99999,0,90].every(a=>!/'60"/.test(B(a))));

console.log("— the final corner of an unclosed deed gets a point —");
// A description ending "...to an iron pin; thence N 61 E to the point of
// beginning" cannot run the closing call, so the traverse stops at the pin.
// That pin is a real corner and must be plotted.
const openDeed='Begin at the POB; thence North 0 degrees 0 minutes East 100.00 feet; thence South 90 degrees 0 minutes East 100.00 feet; thence South 0 degrees 0 minutes West 100.00 feet to an iron pin; thence North 90 degrees 0 minutes West to the point of beginning.';
const of_=P.parseDeedFigures(openDeed)[0];
of_.pobE=0;of_.pobN=0;of_.computed=P.computeDeed(of_.calls,0,0,0);
t("traverse stops at the pin, not the POB", of_.computed.verts.length===4, of_.computed.verts.length);
t("misclosure equals the missing course", Math.abs(of_.computed.closeDist-100)<0.01, of_.computed.closeDist);
const lastUsable=(of_.computed.usable||[]).slice(-1)[0];
t("the last usable call is not marked as arriving at the POB", !(lastUsable&&lastUsable._pob), lastUsable&&lastUsable._pob);
t("sync keeps the open end", /returnsToPob/.test(html)&&/open end/.test(html));
// and a properly closed deed must NOT gain a duplicate corner on the POB
const cd=P.parseDeedFigures(openDeed.replace("North 90 degrees 0 minutes West to the point","North 90 degrees 0 minutes West 100.00 feet to the point"))[0];
cd.pobE=0;cd.pobN=0;cd.computed=P.computeDeed(cd.calls,0,0,0);
t("a closed deed still returns to the POB", cd.computed.closeDist<0.01, cd.computed.closeDist);
const lu2=(cd.computed.usable||[]).slice(-1)[0];
t("its last call IS marked as arriving at the POB", !!(lu2&&lu2._pob));

console.log("— unreadable courses are reported —");
const pf=fig('Begin; thence N 0-0-0 E 100 feet; thence with the meanders of Big Wills Creek 300 feet; thence S 0-0-0 W 100 feet to the point of beginning.');
t("partials counted", codes(pf).includes("partial"), diag(pf).map(d=>d.msg));

console.log("— deed phrasings (4.8.11) —");
/* One row per way a recorded deed writes a course: [name, deed text, expected].
   Expected is the reading, one course per " | ":
     N45-30-15E 250.52     quadrant bearing (deg-min-sec) and distance in feet
     N 210                 cardinal course         turn90R 210   turned angle
     compass0 300          direction word only     partial …     flagged for review
     curve R500 A120 D13.751 CBN50-0-0E CD119.71 R rad320
                           radius, arc, delta, chord bearing, chord, side, radial azimuth
   A change in any row means the reader now reads that wording differently. */
const _r3=v=>+(+v).toFixed(3);
const _sig=x=>{const b=x.bearing;const br=b?(b.card?b.card:b.q1+b.deg+"-"+b.min+"-"+_r3(b.sec)+b.q2):(x.defl?"turn"+_r3(x.defl.ang)+(x.defl.dir||""):(x.compassAz!=null?"compass"+x.compassAz:"?"));
  if(x.type==="curve")return "curve R"+x.radius+" A"+x.arc+" D"+(x.delta==null?null:_r3(x.delta))+" CB"+(x.chordB?x.chordB.q1+x.chordB.deg+"-"+x.chordB.min+"-"+_r3(x.chordB.sec)+x.chordB.q2:null)+" CD"+x.chordD+" "+(x.dir||"-")+(x.radialAz!=null?" rad"+_r3(x.radialAz):"");
  return (x.type==="partial"?"partial ":"")+br+" "+(x.dist==null?"?":_r3(x.dist))+(x._pob?" POB":"");};
const PHRASINGS=[
  ["quadrant, marks","thence N 45°30'15\" E 250.52 feet; thence S 44°29'45\" E 100.00 feet","N45-30-15E 250.52 | S44-29-45E 100"],
  ["degree/minute/second words","thence North 45 degrees 30 minutes 15 seconds East a distance of 250.52 feet; thence South 44 degrees 29 minutes East, 100 feet","N45-30-15E 250.52 | S44-29-0E 100"],
  ["dashes","thence N45-30-15E 250.52'; thence S44-29-45E 100.00'","N45-30-15E 250.52 | S44-29-45E 100"],
  ["spaces only","thence N 45 30 15 E 250.52 ft; thence S 44 29 45 E 100 ft.","N45-30-15E 250.52 | S44-29-45E 100"],
  ["decimal minutes","thence N 45°30.25' E 250.52 feet","N45-30.25-0E 250.52"],
  ["d m s letters","thence N45d30m15sE 250.52 feet; thence S 44d 29m 45s E 100 feet; thence N 45d30m E 100 feet","N45-30-15E 250.52 | S44-29-45E 100 | N45-30-0E 100"],
  ["typographic primes","thence N 45°30′15″ E 250.52 feet; thence S 44º29’45” E 100.00 feet","N45-30-15E 250.52 | S44-29-45E 100"],
  ["seconds as two apostrophes","thence N 45° 30' 15'' E 250.52 feet","N45-30-15E 250.52"],
  ["colon-separated","thence N 45:30:15 E 100 feet; thence S 44:30 E 50 feet","N45-30-15E 100 | S44-30-0E 50"],
  ["abbreviated words","thence N. 45 deg. 30 min. E. 250.52 ft.; thence S. 44 deg. 29 min. 45 sec. E. 100 ft.","N45-30-0E 250.52 | S44-29-45E 100"],
  ["cardinals close a rectangle","thence North 210 feet; thence East 420 feet; thence South 210 feet; thence West 420 feet to the point of beginning","N 210 | E 420 | S 210 | W 420 POB"],
  ["due and run","thence due North along the west line of said forty 210.0 feet; thence run East 420 feet, more or less, to the road","N 210 | E 420"],
  ["continue + cardinal","thence North 210 feet; thence continue South 210 feet; thence continue S 0°15' E 50 feet","N 210 | S 210 | S0-15-0E 50"],
  ["continue along a named line","thence North 100 feet; thence continue along said South line 210 feet","N 100 | turn0R 210"],
  ["distance before bearing","thence 250.52 feet N 45°30'15\" E to a pin; thence a distance of 100.00 feet along a bearing of S 44°29'45\" E","N45-30-15E 250.52 | S44-29-45E 100"],
  ["spelled-out bearing","thence North forty-five degrees thirty minutes East two hundred fifty feet; thence South forty four degrees and thirty minutes East one hundred feet","N45-30-0E 250 | S44-30-0E 100"],
  ["spelled-out with seconds","thence South ten degrees East one hundred feet; thence North eighty-nine degrees fifteen minutes thirty seconds West 200 feet","S10-0-0E 100 | N89-15-30W 200"],
  ["spelled section is not a bearing","Commence at the NE corner of Section Twelve, Township Twelve South, Range Six East; thence South 100 feet","S 100"],
  ["words + figure in parentheses","thence North 45 degrees East two hundred (200) feet; thence South 45° East one hundred fifty and 5/10 (150.5) feet","N45-0-0E 200 | S45-0-0E 150.5"],
  ["half-degree bearings","thence South 45 1/2 degrees West 250 feet; thence North 44½° West 100 feet","S45-30-0W 250 | N44-30-0W 100"],
  ["chains, links, poles, rods","thence N 10° E 10 chains and 50 links; thence S 80° E 5.25 chains; thence S 10 W 12 poles; thence West 40 rods","N10-0-0E 693 | S80-0-0E 346.5 | S10-0-0W 198 | W 660"],
  ["chains with no AND","thence S 80° E 4 chains 20 links","S80-0-0E 277.2"],
  ["fractions of a chain","thence North 2 1/2 chains; thence East 3½ chains","N 165 | E 231"],
  ["rods and feet","thence South 20 rods and 5 feet","S 335"],
  ["yards","thence North 70 yards; thence East 140 yards","N 210 | E 420"],
  ["metres","thence N 45°30' E 76.36 meters; thence S 44°30' E 30.48 m","N45-30-0E 250.524 | S44-30-0E 100"],
  ["feet and inches","thence North 100 feet 6 inches; thence East 50'-3\"; thence West 100 ft. 6 in.; thence S 80° E 100 feet and 3 inches","N 100.5 | E 50.25 | W 100.5 | S80-0-0E 100.25"],
  ["inches of a monument are not distance","thence N 45°30' E 100 feet to a 6 inch pipe; thence S 10° E 250.52 feet, 1/2 inch rebar found","N45-30-0E 100 | S10-0-0E 250.52"],
  ["monument sizes","thence N 45°30' E 250.52 feet to a 3/4\" iron pipe; thence S 44°30' E 100.00 feet to a 2\" pipe in a 4' x 4' concrete pad","N45-30-0E 250.52 | S44-30-0E 100"],
  ["thousands separator","thence N 45°30' E 1,250.52 feet; thence S 44°30' E 2,640 feet","N45-30-0E 1250.52 | S44-30-0E 2640"],
  ["plus-minus","thence N 45°30' E 250.52± feet; thence S 45°30' W 250.5 feet +/-","N45-30-0E 250.52 | S45-30-0W 250.5"],
  ["comma list of courses","thence along the road the following four (4) courses and distances: N 10°00' E 100.00 feet, N 12°30' E 50.00 feet, N 15°00' E 75.00 feet and N 20°00' E 25.00 feet to a pin; thence S 80° E 40 feet","N10-0-0E 100 | N12-30-0E 50 | N15-0-0E 75 | N20-0-0E 25 | S80-0-0E 40"],
  ["no THENCE at all","North 45°30' East 200.00 feet, South 44°30' East 100.00 feet, South 45°30' West 200.00 feet","N45-30-0E 200 | S44-30-0E 100 | S45-30-0W 200"],
  ["and-joined pair","thence N 10° E 100 feet, and S 80° E 50 feet","N10-0-0E 100 | S80-0-0E 50"],
  ["numbered courses","(1) N 10°00' E 100.00 feet; (2) N 12°30' E 50.00 feet; (3) N 15°00' E 75.00 feet","N10-0-0E 100 | N12-30-0E 50 | N15-0-0E 75"],
  ["reference bearing after a comma stays one course","thence N 45°30' E 250.52 feet to a pin, S 10° W 5 feet from a fence corner","N45-30-0E 250.52"],
  ["record pair stays one course","thence N 45°30' E 250.52 feet (measured), N 45° E 250 feet (record)","N45-30-0E 250.52"],
  ["deed values in parentheses","thence N 45°30'15\" E (deed N 45° E) 250.52 feet (deed 250 feet) to a pin","N45-30-15E 250.52"],
  ["right-of-way width is not the distance","thence N 45°30' E along the 60 foot right of way of Highway 77 for 250.52 feet","N45-30-0E 250.52"],
  ["parallel offset is not the distance","thence S 44°30' E, 30 feet from and parallel to the centerline, 100.00 feet","S44-30-0E 100"],
  ["parallel course keeps its distance","thence N 10° E 100 feet parallel with and 30 feet from the road","N10-0-0E 100"],
  ["passing call","thence N 45°30' E, passing an iron pin at 20.00 feet, a total distance of 250.52 feet","N45-30-0E 250.52"],
  ["station text","thence N 45°30' E 250.52 feet to a point 30 feet right of centerline station 125+50.00; thence S 44°30' E 100.00 feet","N45-30-0E 250.52 | S44-30-0E 100"],
  ["bearing then direction prose","thence in a northeasterly direction, N 45°30' E, along the south right of way of County Road 12 (80' R/W), 250.52 feet","N45-30-0E 250.52"],
  ["distance after the monument","thence N 45°30' E to an iron pin, a distance of 250.52 feet; thence S 44°30' E to a concrete monument 100.00 feet distant","N45-30-0E 250.52 | S44-30-0E 100"],
  ["zero and ninety","thence N 00°00'00\" E 100.00 feet; thence S 89°59'59\" E 100.00 feet; thence N 0°15' W 50 feet; thence N 90°00'00\" E 50 feet","N0-0-0E 100 | S89-59-59E 100 | N0-15-0W 50 | N90-0-0E 50"],
  ["single-digit degrees","thence S 5° E 100 feet; thence N 5°5'5\" W 20 feet; thence N 85° E 5 feet","S5-0-0E 100 | N5-5-5W 20 | N85-0-0E 5"],
  ["impossible values are flagged","thence N 95°00' E 100 feet; thence N 45°75' E 100 feet; thence N 45°30'61\" E 100 feet","partial ? 100 | partial ? 100 | partial ? 100"],
  ["turn an angle","thence North 100 feet; thence turn an angle of 90°00' to the right and run 210.0 feet","N 100 | turn90R 210"],
  ["turn with no word ANGLE","thence North 100 feet; thence turn 89°30' left and run 420 feet","N 100 | turn90.5L 420"],
  ["a turn in the road is not an angle","thence N 10° E 100 feet to the turn in the road; thence S 80° E 50 feet","N10-0-0E 100 | S80-0-0E 50"],
  ["OCR: O for zero, l for one","thence N 45°3O'l5\" E 25O.52 feet; thence S 44°29'45\" E lOO.OO feet","N45-30-15E 250.52 | S44-29-45E 100"],
  ["OCR: S for five","thence N 4S°30' E 100 feet; thence 5 44°29' E 100 feet","N45-30-0E 100 | S44-29-0E 100"],
  ["OCR: degree mark misread","thence N 45'30' E 100 feet; thence N 45°30° E 100 feet; thence N 45* 30' E 100 feet; thence N 45o 30' E 100 feet","N45-30-0E 100 | N45-30-0E 100 | N45-30-0E 100 | N45-30-0E 100"],
  ["hyphenated across a line","thence North 45 de-\ngrees 30 minutes East 250.52\nfeet to an iron pin; thence South 44 degrees 29 min-\nutes East 100.00 feet","N45-30-0E 250.52 | S44-29-0E 100"],
  ["book and page between courses","thence N 45°30' E 250.52 feet to a pin;\nBook 1234 Page 567\nthence S 44°30' E 100.00 feet","N45-30-0E 250.52 | S44-30-0E 100"],
  ["line table, tabs","Line\tBearing\tDistance\nL1\tN10°00'00\"E\t100.00'\nL2\tN12°30'00\"E\t50.00'\nL3\tN15°00'00\"E\t75.00'","N10-0-0E 100 | N12-30-0E 50 | N15-0-0E 75"],
  ["line table, single spaces","LINE BEARING DISTANCE\nL1 N 10°00'00\" E 100.00\nL2 N 12°30'00\" E 50.00\nL3 N 15°00'00\" E 75.00\nL4 S 80°00'00\" E 40.00","N10-0-0E 100 | N12-30-0E 50 | N15-0-0E 75 | S80-0-0E 40"],
  ["curve table with header","CURVE RADIUS ARC LENGTH CHORD BEARING CHORD LENGTH DELTA\nC1 500.00' 120.00' N 50°00'00\" E 119.71' 13°45'04\"","curve R500 A120 D13.751 CBN50-0-0E CD119.71 -"],
  ["curve table, other column order","CURVE  DELTA  RADIUS  LENGTH  CH. BRG  CH. LEN\nC1  13°45'04\"  500.00  120.00  N50°00'00\"E  119.71","curve R500 A120 D13.751 CBN50-0-0E CD119.71 -"],
  ["curve: radius, arc, chord","thence along a curve to the right having a radius of 500.00 feet, an arc length of 120.00 feet, a chord bearing of N 50°00'00\" E and a chord distance of 119.71 feet","curve R500 A120 Dnull CBN50-0-0E CD119.71 R"],
  ["curve: concave, delta","thence northeasterly along a curve concave to the southeast, radius 500.00 feet, central angle 13°45'04\", an arc distance of 120.00 feet","curve R500 A120 D13.751 CBnull CDnull -"],
  ["curve: radius point bears","thence along a non-tangent curve to the left, the radius point of which bears N 40°00'00\" W 500.00 feet, through a central angle of 13°45'04\" an arc distance of 120.00 feet","curve R500 A120 D13.751 CBnull CDnull L rad320"],
  ["meander with a distance","thence northerly along the centerline of said creek 300 feet, more or less, to a point","compass0 300"],
  ["meander with no direction is flagged","thence N 10° E 100 feet to the creek; thence down the creek as it meanders 250 feet, more or less, to a pin","N10-0-0E 100 | partial ? 250"]
];
PHRASINGS.forEach(([n,txt,want])=>{
  let got; try{got=P.parseDeedText(txt).map(_sig).join(" | ");}catch(e){got="THREW "+e.message;}
  t(n, got===want, {got,want});
});

console.log("— phrasings: geometry —");
{
  const end=(txt)=>{const g=P.computeDeed(P.parseDeedText(txt),0,0,0);const v=g.verts[g.verts.length-1];
    return {chord:Math.hypot(v.E,v.N),az:((Math.atan2(v.E,v.N)*180/Math.PI)+360)%360,g};};
  // radius point N 40° W of the start, curve to the left: leaves on azimuth 50°, chord az = 50 - delta/2
  const rp=end('thence along a non-tangent curve to the left, the radius point of which bears N 40°00\'00" W 500.00 feet, through a central angle of 13°45\'04" an arc distance of 120.00 feet');
  t("radius-point curve: chord 119.71 on azimuth 43.124", Math.abs(rp.chord-119.71)<0.02&&Math.abs(rp.az-43.124)<0.01, [rp.chord,rp.az]);
  const ct=end('CURVE RADIUS ARC LENGTH CHORD BEARING CHORD LENGTH DELTA\nC1 500.00\' 120.00\' N 50°00\'00" E 119.71\' 13°45\'04"');
  t("curve-table row lands on its chord", Math.abs(ct.chord-119.71)<0.02&&Math.abs(ct.az-50)<0.01, [ct.chord,ct.az]);
  const mix=P.parseDeedFigures('Beginning at an iron pin; thence North forty-five degrees thirty minutes East two hundred fifty feet to a stake; thence along the road the following courses: S 44°30\' E 60.00 feet, S 44°30\' E 40 feet 0 inches; thence S 45\'30\' W 25O.OO feet; thence turn 90°00\' right and run 100 feet to the point of beginning.')[0];
  const mg=P.computeDeed(mix.calls,0,0,0);
  t("a deed mixing the new forms reads 5 courses, none flagged", mix.calls.length===5&&mix.calls.every(c=>c.type==="line"), mix.calls.map(c=>c.type));
  t("…and closes on 25,000 sq ft", mg.closeDist<0.01&&Math.abs(P._deedArea(mg)-25000)<1, [mg.closeDist,P._deedArea(mg)]);
}

console.log("— real published descriptions (4.8.12) —");
/* Legal descriptions as printed in public notices and filings from eight states,
   typos and all. Each row: [name, source, text, expected reading, misclosure in feet,
   acres, kind]. The reading uses the same shorthand as the phrasings above, plus
   " tie" on commencement courses. Rows that do not close are recorded as they are:
   the record itself is short or is a bounds description, and the reader must keep
   saying so rather than guess. */
const _sigR=x=>{const b=x.bearing;const br=b?(b.card?b.card:b.q1+b.deg+"-"+b.min+"-"+_r3(b.sec)+b.q2):(x.defl?"turn"+_r3(x.defl.ang)+(x.defl.dir||""):(x.compassAz!=null?"compass"+x.compassAz:"?"));
  if(x.type==="curve")return "curve R"+x.radius+" A"+x.arc+" D"+(x.delta==null?null:_r3(x.delta))+" CB"+(x.chordB?x.chordB.q1+x.chordB.deg+"-"+x.chordB.min+"-"+_r3(x.chordB.sec)+x.chordB.q2:null)+" CD"+x.chordD+" "+(x.dir||"-")+(x.tie?" tie":"");
  return (x.type==="partial"?"partial ":"")+br+" "+(x.dist==null?"?":_r3(x.dist))+(x.tie?" tie":"");};
const REAL=[
  ["AL: lot in NE 1/4 of NE 1/4, Sec 21 T11S R6E","Gadsden Messenger legals 6/12-6/18/2026 (Etowah Co., AL)","COMMENCE AT AN EXISTING 2” PIPE AT THE NORTHWEST CORNER OF THE NORTHEAST QUARTER (NE 1/4) OF THE NORTHEAST QUARTER (NE 1/4) IN SECTION TWENTY-ONE (21), TOWNSHIP ELEVEN (11) SOUTH, RANGE SIX (6) EAST OF HUNTSVILLE MERIDIAN, ETOWAH COUNTY, ALABAMA AND RUN DUE EAST, ALONG THE NORTH LINE THEREOF 300.00 FEET TO A POINT; THENCE RUN SOUTH 02 DEGREES 08 MINUTES 14 SECONDS EAST, PARALLEL TO THE WEST LINE OF SAID FORTY, 299.91 FEET TO THE POINT OF BEGINNING; THENCE CONTINUE SOUTH 02 DEGREES 08 MINUTES 14 SECONDS EAST, PARALLEL TO THE WEST LINE OF SAID FORTY, 202.89 FEET TO A POINT; THENCE RUN NORTH 63 DEGREES 22 MINUTES 00 SECONDS EAST, 34.73 FEET TO A POINT IN THE WEST RIGHT OF WAY LINE OF SMITH DRIVE (60’ R/W); THENCE RUN SOUTH 02 DEGREES 03 MINUTES 56 SECONDS EAST, ALONG THE WEST LINE OF SAID RIGHT OF WAY 35.78 FEET TO A POINT; THENCE RUN SOUTH 83 DEGREES 26 MINUTES 50 SECONDS WEST, LEAVING SAID RIGHT OF WAY, 35.78 FEET TO A POINT; THENCE RUN SOUTH 48 DEGREES 12 MINUTES 06 SECONDS WEST, 108.24 FEET TO A POINT; THENCE RUN SOUTH 05 DEGREES 16 MINUTES 00 SECONDS WEST, 103.00 FEET TO A POINT ON THE NORTHEAST RIGHT OF WAY LINE OF SMITH DRIVE (50’ R/W); THENCE RUN NORTH 85 DEGREES 13 MINUTES 08 SECONDS WEST ALONG SAID RIGHT OF WAY, 200.54 FEET TO A POINT IN THE WEST LINE OF SAID FORTY; THENCE RUN NORTH 02 DEGREES 08 MINUTES 14 SECONDS WEST, LEAVING SAID RIGHT OF WAY AND ALONG THE WEST LINE OF SAID FORTY, 385.76 FEET TO THE SOUTHWEST CORNER OF THE LANDS DESCRIBED IN DEED BOOK “1318”, PAGE 229, PROBATE OFFICE OF ETOWAH COUNTY, ALABAMA; THENCE RUN SOUTH 89 DEGREES 54 MINUTES 27 SECONDS EAST, LEAVING SAID WEST FORTY LINE AND ALONG THE SOUTH LINE OF SAID 1318/229, 300.02 FEET TO THE POINT OF BEGINNING, SAID PROPERTY BEING A PORTION OF THE NORTHEAST QUARTER (NE 1/4) OF THE NORTHEAST QUARTER (NE 1/4) IN SECTION TWENTY-ONE (21), TOWNSHIP ELEVEN (11) SOUTH, RANGE SIX (6) EAST, ETOWAH COUNTY, ALABAMA.","E 300 tie | S2-8-14E 299.91 tie | S2-8-14E 202.89 | N63-22-0E 34.73 | S2-3-56E 35.78 | S83-26-50W 35.78 | S48-12-6W 108.24 | S5-16-0W 103 | N85-13-8W 200.54 | N2-8-14W 385.76 | S89-54-27E 300.02",0.01,2.45,"boundary"],
  ["AL: second parcel, same forty","Gadsden Messenger legals 6/12-6/18/2026 (Etowah Co., AL)","ALSO: COMMENCE AT AN EXISTING 2” PIPE AT THE NORTHWEST CORNER OF THE NORTH-EAST QUARTER (NE 1/4) OF THE NORTHEAST QUARTER (NE 1/4) IN SECTION TWENTY-ONE (21), TOWNSHIP ELEVEN (11) SOUTH, RANGE SIX (6) EAST OF HUNTSVILLE MERIDIAN, ETOWAH COUNTY, ALABAMA AND RUN DUE EAST, ALONG THE NORTH LINE THEREOF 300.00 FEET TO A POINT; THENCE RUN SOUTH 02 DEGREES 08 MINUTES 14 SECONDS WEST, LEAVING SAID NORTH LINE AND PARALLEL TO THE WEST LINE OF SAID FORTY, 299.91 FEET TO THE POINT OF BEGINNING; THENCE CONTINUE SOUTH 02 DEGREES 8 MINUTES 14 SECONDS EAST, PARALLEL TO THE WEST LINE OF SAID FORTY, 202.89 FEET TO A POINT; THENCE RUN NORTH 63 DEGREES 22 MINUTES 00 SECONDS EAST, 34.73 FEET TO A POINT IN THE WEST RIGHT OF WAY LINE OF SMITH DRIVE (60’ R/W); THENCE RUN NORTH 02 DEGREES 03 MINUTES 56 SECONDS WEST, ALONG THE WEST LINE OF SAID RIGHT OF WAY, 187.24 FEET TO A POINT; THENCE RUN NORTH 89 DEGREES 54 MINUTES 27 SECONDS WEST, LEAVING SAID RIGHT OF WAY, 31.86 FEET TO THE POINT OF BEGINNING. SAID PROPERTY BEING A PORTION OF THE NORTHEAST QUARTER (NE 1/4) OF THE NORTHEAST QUARTER (NE 1/4) IN SECTION TWENTY-ONE (21), TOWNSHIP ELEVEN (11) SOUTH, RANGE SIX (6) EAST, ETOWAH COUNTY, ALABAMA.","E 300 tie | S2-8-14W 299.91 tie | S2-8-14E 202.89 | N63-22-0E 34.73 | N2-3-56W 187.24 | N89-54-27W 31.86",0.01,0.14,"boundary"],
  ["AL: 9.92 ac in Fraction D (bearing glued to distance)","Gadsden Messenger legals 6/12-6/18/2026 (Etowah Co., AL)","COMMENCE AT A GRADER BLADE MARKING THE SE CORNER OF FRACTION “D” IN SECTION 21, T-12-S, R-7-E, THENCE ALONG THE EAST LINE OF SAID FRACTION “D” THE FOLLOWING BEARINGS AND DISTANCES: THENCE N00°06’30”W 470.42’ TO A ½” REBAR THENCE N00°06’35”W 199.73’ TO A ½” REBAR CAPPED (CA-497-LS), SAID POINT BEING THE POINT OF BEGINNING, THENCE LEAVING SAID EAST LINE OF SAID FRACTION “D” N89°42’14”W 566.88’ TO A ½” REBAR, THENCE N89°36’06”W 170.25’ TO A ½” REBAR CAPPED (CA-497-LS), THENCE N00°05’24”W 242.84’ TO A 1/2” SOLID IRON, THENCE N00°31’22”W 278.50’ TO A ½” REBAR CAPPED (CA-497-LS), THENCE S87°17’36”E 218.50’ TO A ½” REBAR CAPPED (CA-497-LS), THENCE N19°54’56”E 114.58’ TO A ½” REBAR CAPPED (CA-497-LS),THENCE S89°09’47”E481.65’ TO A ½” REBAR CAPPED (CA-497-LS) ON THE EAST LINE OF SAID FRACTION “D,” THENCE S00°06’28”E 615.81’ ALONG SAID EAST LINE OF SAID FRACTION “D” TO THE POINT OF BEGINNING, CONTAINING 9.92 ACRES MORE OR LESS.","N0-6-30W 470.42 tie | N0-6-35W 199.73 tie | N89-42-14W 566.88 | N89-36-6W 170.25 | N0-5-24W 242.84 | N0-31-22W 278.5 | S87-17-36E 218.5 | N19-54-56E 114.58 | S89-9-47E 481.65 | S0-6-28E 615.81",0.01,9.92,"boundary"],
  ["AL: 3.31 ac in Fraction D (inch marks for foot marks)","Gadsden Messenger legals 6/12-6/18/2026 (Etowah Co., AL)","COMMENCE AT A GRADER BLADE MARKING THE SE CORNER OF FRACTION “D,” SECTION 21, T-12-S, R-7-E, THENCE N02°23’55”W 670.64’ ALONG THE EAST LINE OF SAID FRACTION “D” TO A ½” REBAR CAPPED (CA-497-LS), SAID POINT BEING THE POINT OF BEGINNING, THENCE LEAVING SAID EAST LINE OF SAID FRACTION “D” S87°57’46”W 567.10’ TO A ½” REBAR, THENCE S88°04’37”W 169.88 TO A ½” REBAR CAPPED (CA-497-LS), THENCE N02°26’58”W 242.82” TO A 1”SOLID IRON, THENCE N88°02’18”E 517.19’ TO A NAIL, THENCE S02°23’55”E 157.47 TO A ½” REBAR CAPPED (CA-497-LS), THENCE N87°57’47”E 220.00” TO A ½” REBAR CAPPED (CA-497-LS) ON THE EAST LINE OF SAID FRACTION “D,” THENCE S02°23’55”E 85.00’ ALONG SAID EAST LINE OF SAID FRACTION “D” TO THE POINT OF BEGINNING, CONTAINING 3.31 ACRES MORE OR LESS.","N2-23-55W 670.64 tie | S87-57-46W 567.1 | S88-4-37W 169.88 | N2-26-58W 242.82 | N88-2-18E 517.19 | S2-23-55E 157.47 | N87-57-47E 220 | S2-23-55E 85",0.01,3.31,"boundary"],
  ["AL: highway parcel (curvature wording, 'of' set as '01')","Gadsden Messenger legals 6/12-6/18/2026 (Etowah Co., AL)","Commencing at the SW corner of the SE 1/4 of the NW 1/4 Section 35, Township 11 South, Range 6 East, thence North 60 degrees 8 minutes 35 seconds East a distance of 362.07 feet to a point that is 110 feet Southerly of and at right angles to the centerline of said project at Station 141+15.47; thence following the curvature thereof an arc distance of 184.69 feet (said arc having a chord bearing of North 87 degrees 21 minutes 26 seconds East, a counter clockwise direction, a chord distance of 184.64 feet and a radius of 2402.00 feet), to the grantor’s West property line, which is the point of beginning; thence following the curvature thereof an arc distance of 61.10 feet (said arc having a chord bearing of North 84 degrees 09 minutes 28 seconds East, a counter clockwise direction, a chord distance 0161.04 feet and a radius of 2402.00 feet) to a point that is 110 feet Southerly of and at right angles to said centerline at Station 143+50; thence South 54 degrees 30 minutes 28 seconds East a distance of 62.19 feet to a point that is 50 feet Westerly of and at right angles to the centerline of Auburn Avenue at Station 25+00; thence South 18 degrees 35 minutes 54 seconds East a distance of 108.04 feet to a point on the Northerly right of way of Princeton Avenue said point being 40 Westerly of and at right angles to the centerline of Auburn Avenue at Station 26+07.58’ thence North 89 degrees 47 minutes 24 seconds East and along said right of way a distance of 28.23 feet to a point on the Westerly right of way of Auburn Street; thence North 13 degrees 48 minutes 46 seconds West and along said right of way a distance of 161.06 feet; thence North 89 degrees 51 minutes 55 seconds West a distance 01135.86 feet; thence South 0 degrees 25 minutes 24 seconds East a distance of 24.26 feet; to the point and place of beginning.","N60-8-35E 362.07 tie | curve R2402 A184.69 Dnull CBN87-21-26E CD184.64 L tie | curve R2402 A61.1 Dnull CBN84-9-28E CD61.04 L | S54-30-28E 62.19 | S18-35-54E 108.04 | N89-47-24E 28.23 | N13-48-46W 161.06 | N89-51-55W 135.86 | S0-25-24E 24.26",0.29,0.19,"boundary"],
  ["AL: lot by deflection angles","Gadsden Messenger legals 6/12-6/18/2026 (Etowah Co., AL)","TO DESCRIBE A TRACT OR PARCEL OF LAND BEGIN AT THE SOUTHWEST CORNER OF LOT NUMBER 71 OF MCCLAIN HEIGHTS AS RECORDED IN PLAT BOOK “C”, PAGE 393, ETOWAH COUNTY PROBATE OFFICE, THENCE RUN NORTH AND ALONG THE WEST LINE OF SAID LOT 71 A DISTANCE OF 300 FEET TO A POINT; THENCE DEFLECT 89 DEGREES 35 MINUTES TO THE RIGHT AND RUN A DISTANCE OF 220.27 FEET TO A POINT; THENCE DEFLECT 90 DEGREES 36 MINUTES TO THE RIGHT AND RUN A DISTANCE OF 300 FEET TO THE SOUTHEAST CORNER OF THE AFOREMENTIONED LOT NUMBER 71; THENCE DEFLECT 89 DEGREES 24 MINUTES TO THE RIGHT AND RUN A DISTANCE OF 219.3 FEET TO THE POINT OF BEGINNING. LYING IN AND BEING A PORTION OF LOT NUMBER 71 OF MCCLAIN HEIGHTS AS RECORDED IN PLAT BOOK “C”, PAGE 393, ETOWAH COUNTY PROBATE OFFICE, AND CONTAINING 1.5 ACRES, MORE OR LESS.","N 300 | turn89.583R 220.27 | turn90.6R 300 | turn89.4R 219.3",0.01,1.51,"boundary"],
  ["AL: bounds-only lot (stays flagged)","Gadsden Messenger legals 6/12-6/18/2026 (Etowah Co., AL)","Commencing 50 feet from the Southwest corner of Lot Number 62, East as a starting point, thence along the public road 100 feet, to the Southeast corner of said Lot 62, thence North along the line of said Lot 62, 303 feet to the Northeast corner of said lot, thence West along the North line of said lot, 30 feet, thence South 303 feet to the beginning point and being a part of lot 62, of the India Sutherlin Estate as shown by map or plat thereof as recorded in Plat Book C, page 311 in the Office of the Judge of Probate of Etowah County, Alabama","partial ? 50 | partial ? 100 | N 303 | W 30 | S 303",30,0.21,"boundary"],
  ["PA: spelled bearings with figures in parentheses, lone curve","Lycoming Co., PA sheriff sale poster 41047","ALL that certain piece, parcel and lot of land situate in Old Lycoming Township, Lycoming County, Commonwealth of Pennsylvania, bounded and described as follows: BEGINNING at a point on the northern right-of-way line [twenty-five (25) feet from the center line] of Casey Drive, said point being South sixty-one (61) degrees, twenty-two (22) minutes, two (2) seconds west, one hundred forty-five (145) feet from a point on the western right-of-way line [thirty (30) feet from the centerline] of Grimesville Road (Legislative Route 41034) at the intersection with the division line between lands now or formerly of Andrew Nagy and Sharon Nagy, the said northern right-of-way line of Casey Drive; thence from said point of beginning and along the northern right-of-way line of Casey Drive southwesterly by a line curving to the left with a radius of one hundred seventy-five (175) feet for an arc distance of seventy (70) feet; thence along Lot No. 10, north fifty-one (51) degrees, thirty-two (32) minutes, fifty-five (55) seconds west, one hundred eighty-nine and seventy-two hundredths (189.72) feet; thence along lands now or formerly of Charles Shaffer and Joan Shaffer, north fifty -seven (57) degrees, thirty-two (32) minutes, forty (40) seconds east, one hundred twenty-eight and fifty-one hundredths (128.51) feet; thence along lands now or formerly of Gary Goertz and Dee Goertz and along lands now or formerly of Andrew Nagy and Sharon Nagy, south thirty-three (33) degrees, seventeen (17) minutes, eleven (11) seconds east, one hundred seventy and six hundredths (170.06) feet to the point and place of beginning. Containing 17,228.4 square feet or 0.396 acres as above described.","S61-22-2W 145 tie | curve R175 A70 Dnull CBnull CDnull L | N51-32-55W 189.72 | N57-32-40E 128.51 | S33-17-11E 170.06",0,0.4,"boundary"],
  ["TX: commas inside bearings, split decimals","Dallas Co., TX trustee sale notice (DeSoto)","BEGINNING at a 1/2 inch diameter iron rod with a red plastic cap stamped \"RPLS 4888\" set in the South line of Cresent Drive, a 60- foot wide public right of way, at the Northeast corner of Lot 9, of said Block N and the Northwest corner of said Lot 10, said point being in a curve to the left having a central angle of 06 degrees 48 degrees 08 seconds , a radius of 430.00 feet and a chord bearing and distance of North 87 degrees, 50' 52\" East, 51 .02 feet; THENCE Northeasterly along said South line and said curve to the left, an arc distance of 51 .05 feet to a 1/2 inch diameter iron rod with a red plastic cap stamped \"RPLS 4888\" set for corner in the North line of said Lot 10, said point being the Northwest corner of that portion of said Lot 10 described in deed to Kenneth Alan Benz and wife, Jeanie Michelle Benz, recorded in Volume 95110, Page 158, Deed Records of Dallas County, Texas; THENCE South 01 degrees 22 minutes, 08 seconds West, a distance of 60 .25 feet to a 1/2\" diameter iron rod with a red plastic cap stamped \"RPLS 4888\" set for corner; THENCE South 46 degrees, 22 minutes, 08 seconds West, a distance of 7.64 feet to a point for corner; THENCE North 88 degrees, 37 minutes, 52 seconds West, a distance of 20.52 feet for a point for corner,; THENCE South 01 degrees, 22 minutes, 08 seconds West, a distance of 52.47 feet to a 1/2 inch diameter iron rod with a red plastic cap stamped \"RPLS 4888\" set for corner in the South line of said Lot 10, same being the North line of a 15 foot wide public alley right of way; THENCE North 88 degrees, 37 minutes, 52 seconds West, along the North line, a distance of 25.00 feet to a 1/2 inch diameter iron rod with a plastic cap stamped \"RPLS 4888\" set at the Southeast corner of said Lot 9 and the Southwest corner of said Lot 1 O; THENCE North 01 degrees, 22 minutes, 08 seconds, East, a distance of 144.99 feet to the PLACE OF BEGINNING and containing 4,535 square feet or 0.104 of an acre of land, more or less","curve R430 A51.05 D6.802 CBN87-50-52E CD51.02 L | S1-22-8W 60.25 | S46-22-8W 7.64 | N88-37-52W 20.52 | S1-22-8W 52.47 | N88-37-52W 25 | N1-22-8E 144.99",30,0.1,"boundary"],
  ["TX: old survey, bearings without marks","Angelina Co., TX trustee sale notice 1/6/2026","BEGINNING at the S.E. comer of a 2.5 acre trac, heretofore conveyed by T. J. Brookshire, Sr. to George Freeman, an iron stake for comer on the North side of the Brookshire Pond Road; THENCE North 20 W with the EBL of said 2.5 acre tract at 684.5 feet to the NE corner of same, an iron stake for corner; THENCE North 70 E at 359 feet to the N.W. corner of a 4.5 acre tract heretofore conveyed by T.J. Brookshire, Sr., to· T.J. Berry a stake for corner; THENCE South 20 E with the said T.J. Berry's WBL at 684.5 feet to the SW corner on the North side of the Brookshire Pond Road, a stake for corner; THENCE S 70 W with the North margin of the said Brookshire Pond Road 368 feet to the place of beginning and for better description reference is hereby made to the deed to T.J. Brookshire, Sr., this being the same tract of land conveyed by T.J. Brookshire, Jr. and wife, Elsie Brookshire to W.G. Byington on June 20, 1939 and of record in Book 91, Page 81 of the Deed Records of Angelina County, Texas.","N20-0-0W 684.5 | N70-0-0E 359 | S20-0-0E 684.5 | S70-0-0W 368",9,5.64,"boundary"],
  ["TX: right-of-way parcel, PIACE OF BEGINNING","Angelina Co., TX trustee sale notice 1/6/2026","COMMENCING FOR REFERENCE at a 1\" iron pipe found in the east boundary line of the above mentioned 5.71 acre tract, same being the northwest comer of a tract which was conveyed from Joyce Powell, et vir to James D. Braden, et ux by an instrument recorded in Volume 164, Page 380, Deed Records of Angelina County, Texas; THENCE S 21 deg. 04' 13\" E, along the common boundary line between said 5.71 acre tract and said Braden tract, a distance of269.12 feet to a 1/2\" iron rod set at the point of intersection with the proposed north right-of-way (ROW) line of Paul Avenue and the PIACE OF BEGINNING of the herein described tract; THENCE continuing along said common line, S 21 deg. 04' 13\" E, a distance of 15.76 feet to a 1/2\" iron rod set at the point of intersection with the existing north ROW line of said Paul Avenue, same being the southeast comer of said 5.71 acre tract; THENCE S 69 deg. 41' 21\" W along said existing ROW line, a distance of 308.25 feet, to a 1/2\" iron rod set at the southeast comer of a 0.0176 acre tract which was conveyed from J. L. · Braswell, et ux to the City of Lufkin by an instrument recorded in Volume 625, Page 828, Deed Records of Angelina County, Texas; THENCE N 20 deg. 15' 58\" W along the East boundary line of said 0.0176 acre tract, a distance of 13.00 feet to a 1/2\" iron rod set at the northeast comer of same said 0.0176 acre tract, same also being on the proposed north ROW line of Paul A venue; THENCE N 69 deg. 44' 02\" E along said proposed ROW line, a distance of 179.90 feet to a 1/2\" iron rod set at an angle point; THENCE N 20 deg. 15' 58\" W continuing along said proposed ROW line a distance of2.99 feet to a 1/2\" iron rod set at an angle point; THENCE N 69 deg. 44' 02\" E continuing along said proposed ROW line, a distance of 128.13 feet to the PLACE OF BEGINNING and containing 0.100 (4352.8 square feet) ofland.","S21-4-13E 269.12 tie | S21-4-13E 15.76 | S69-41-21W 308.25 | N20-15-58W 13 | N69-44-2E 179.9 | N20-15-58W 2.99 | N69-44-2E 128.13",0.01,0.1,"boundary"],
  ["KY: poles, bounds calls (stay flagged)","News Journal legal notices 11/14/2012 (Whitley Co., KY)","BEGINNING on a black gum and maple, a corner in S. R. Lawson land; thence with said Lawson’s line near a south course to a dogwood; thence S. 67 W. with Ab Trivillian’s line to four dogwoods and a pine; thence S. 5½ W. 82 poles to a pine in the South line of the H. B. Barton land; thence N. 77 E with said line 74 poles to a pine and black oak; thence N. 62 E 34 poles to the BEGINNING.","partial ? ? | partial S67-0-0W ? | S5-30-0W 1353 | N77-0-0E 1221 | N62-0-0E 561",1753.05,27.28,"boundary"],
  ["KY: lot, minute mark typed as inch mark","News Journal legal notices 11/14/2012 (Whitley Co., KY)","Beginning at an iron post in the North 15 foot right-of-way of Oak Lane, corner to Lot No. 13; thence with said right-of-way S 58 degrees 29’ 46” W., 84.73 feet to an iron post, corner to said right-of-way; thence with said right-of-way S 31 degrees 30’ 14” E., 15.00 feet to an iron post, corner to Lot No. 8; thence with line of said lot S 58 degrees 29’ 46” W., 62.00 feet to an iron post, corner to said lot; thence with line of said lot S 31 degrees 30’ 14” E., 15.00 feet to an iron post, corner to Lots No. 7 and 8; thence with line of Lot No. 7 S 58 degrees 29’ 46” W., 87.73 feet to an iron post, corner to said lot and in the Kelly Heirs line; thence with Kelly Heirs line and a wire fence 5 calls; N 20 degrees 56’ 41” W., 80.23 feet to a fence post; N 11 degrees 36” 38” W., 81.89 feet to a fence post; N 13 degrees 32’ 14” E., 60.15 feet to a fence post; N 20 degrees 03’ 34” E., 89.01 feet to a fence post; and N 34 degrees 29’ 58” E., 11.92 feet to an iron post, corner to Lot No. 13; thence with line of said lot S 48 degrees 14’ 26” E., 238.65 feet to the Beginning, the lot containing 0.835 acres.","S58-29-46W 84.73 | S31-30-14E 15 | S58-29-46W 62 | S31-30-14E 15 | S58-29-46W 87.73 | N20-56-41W 80.23 | N11-36-38W 81.89 | N13-32-14E 60.15 | N20-3-34E 89.01 | N34-29-58E 11.92 | S48-14-26E 238.65",0.02,0.84,"boundary"],
  ["KY: 385 ac in chains, fractional degrees","KY PSC docket 2021-00235 exhibit (Logan Co., KY)","Beginning at a rock 33 feet from the center of the L & N Railroad; running thence South 45½ East 26 links to a rock; thence about South 35-3/4 East 9.81 chains to a rock in a line of the R. S. Purvis tract, said rook is South 87 West 3.30 chains from a rock corner to said Purvis tract; thence North 87 East 3.30 chains to a rock corner to Purvis; thence South 2 West 8.18 chains to a rock; thence South 88 East 7.23 chains to a rock near a hickory tree, corner to Purvis; thence with his line South 4½ West 15.80 chains to a rock in a road; thence South 88 East 5.83 chains to a rock 16½ feet from a large stump; thence South 77-7/8 East 31.54 chains to a rock corner to P. E, Herndon; thence North 11-3/4 East 3.64 chains to a rock, corner to the same and John W. McCormick; thence North 1-3/4 West 3.65 chains to a rock near a gate and corner to J.W. McCormick; thence with his line South 80 East 15.88 chains to a rock corner to the same; thence South 76 East 3.63 chains to a post oak stump on the north side of a road; thence North 1/2 East 81.91 chains to a rock corner to Lamb in Mils line; thence South 85 West 10.70 chains to a rock, corner to Lamb; thence North 74¼ West 10.70 chains to a rock, corner to Lamb; thence North 74¼ West 6.68 chains to a rock in a line of the same; thence with McCormick's line South 18-3/4 West 35.24 chains to a rock corner to the same; thence South 69¼ West 20.75 chains to a rock corner to the same and 33 feet from the center of the said railroad; thence with the railroad line South 44½ West 30.92 chains to the beginning, containing 385½ acres.","S45-30-0E 17.16 | S35-45-0E 647.46 | N87-0-0E 217.8 | S2-0-0W 539.88 | S88-0-0E 477.18 | S4-30-0W 1042.8 | S88-0-0E 384.78 | S77-52-30E 2081.64 | N11-45-0E 240.24 | N1-45-0W 240.9 | S80-0-0E 1048.08 | S76-0-0E 239.58 | N0-30-0E 5406.06 | S85-0-0W 706.2 | N74-15-0W 706.2 | N74-15-0W 440.88 | S18-45-0W 2325.84 | S69-15-0W 1369.5 | S44-30-0W 2040.72",968.43,403.02,"boundary"],
  ["MI: PLSS tie, parallel-with calls","Iron Mountain Daily News notice 2/2020 (Dickinson Co., MI)","Commencing At A 5/8 x 24-Inch Rerod With A Stamped Aluminum Cap Marking The Center North 1/16 Corner On The North And South 1/4 Line And The North 1/16 Line Of Said Section 5, Town 40 North, Range 30 West, Said Point Being 2457.00 Feet South And 2523.17 Feet East Of A Dickinson County Monument Marking The Section Corner Common To Sections 5 And 6, Town 40 North, Range 30 West; Thence South 80 Degrees 57 Minutes 02 Seconds East Along The North 1/16 Line Of The Said Section 5-40-30 A Distance Of 208.05 Feet To A Capped 5/8 x 24 Inch Rerod Marking The Southeast Corner Of Lot 13 And The Point Of Beginning Of This Description: Thence North 03 Degrees 24 Minutes 16 Seconds East Parallel With The East Right-Of-Way Line Of Michigan Highway M-95 And Along The East Line Of Lot 13 A Distance Of 680.04 Feet To A Capped 5/8 x 24 Inch Rerod Marking The South Right-Of-Way Line Of A 66 Foot Wide Non-Exclusive Road And Utility Easement; Thence Continuing North 03 Degrees 24 Minutes 16 Seconds East Parallel With The East Right-Of-Way Line Of Michigan Highway M-95 A Distance Of 33.00 Feet To A Point On The Centerline Of The Said 66 Foot Wide Non-Exclusive Road And Utility Easement And The South Line Of Lot 9; Thence South 87 Degrees 18 Minutes 36 Seconds East Along The Centerline Of The Said Easement And The South Line Of Lots 9 And 11 And Parallel With The 80 Chain Line Of The Said Section 5- 40-30 A Distance Of 482.81 Feet To A Point North 87 Degrees 18 Minutes 36 Seconds West, Distant 623.00 Feet From the East Line Of The Northwest Quarter Of The Northeast Quarter (NW 1/4 x NE 1/4) Of Section 5-40-30; Thence South 02 Degrees 27 Minutes 23 Seconds West Parallel With The East Line Of The Northwest Quarter Of The Northeast Quarter (NW1/4 x NE 1/4) Of Sections 5-40-30 A Distance Of 33.00 Feet To A Capped 5/8 x 24 Inch Rerod Marking The South Right-Of-Way Line Of The Said Non-Exclusive Road And Utility Easement; Thence Continuing South 02 Degrees 27 Minutes 23 Seconds West Parallel With The East Line Of Said NW 1/4 x NE 1/4 Of Section 5-40-30 A Distance Of 674.47 Feet To A Capped 5/8 X 24 Inch Rerod Marking The North 1/16 Line Of Section 5-40-30 And The Southeast Corner Of This Description; Thence North 87 Degrees 57 Minutes 02 Seconds West Along The North 1/16 Line Of Section 5-40-30 A Distance Of 494.62 Feet To The Point Of Beginning","S80-57-2E 208.05 tie | N3-24-16E 680.04 | N3-24-16E 33 | S87-18-36E 482.81 | S2-27-23W 33 | S2-27-23W 674.47 | N87-57-2W 494.62",0.01,7.97,"boundary"],
  ["MN: rods","Fillmore County Journal notice (Wykoff, MN)","Commencing at the southwest corner of the northwest quarter of Section 22, Township 103 North, Range 12 West, running thence north 10 rods, thence east 8 rods, thence south 10 rods, thence west 8 rods to the place of beginning.","N 165 | E 132 | S 165 | W 132",0,0.5,"boundary"],
  ["FL: six-course commencement","Clay Today notice of sale (Clay Co., FL)","Commence at the SW corner of the North half of the North half of Section 5, Township 5 South, Range 24 East and run N89°41’29”E along the South line of said North 1/2 of North 1/2, 1525.0 feet to the NE corner of “Holly Oaks”, an unrecorded subdivision, thence run S00°27’12”E along the East line of said subdivision 2051.60 feet to the NW corner “Sylvia Acres”, an unrecorded subdivision, thence run N89°43’05”E along the North line of said subdivision and the South line of “Turkey Forest”, an unrecorded subdivision, 2291.88 feet to the East R/W of an 80 foot access road, thence continue N89°43’05”E along said line 334.1 feet, thence run N14°29’05”E 973.89 feet, thence run N55°17’03”E, 189.48 feet to the Point of Beginning, thence run N87°59’09”E 366.98 feet to a point on the Westerly R/W of an 80 foot access road, thence S32°34’13”E along said R/W 125.99 feet to a point on the Northwesterly R/W of a 60 foot access road, thence run S36°02’14”W along said R/W 118.60 feet, thence run N62°35’22”W 410.94 feet to the Point of Beginning, all being and lying in Section 5, Township 5 South, Range 24 East, Clay County, Florida.","N89-41-29E 1525 tie | S0-27-12E 2051.6 tie | N89-43-5E 2291.88 tie | N89-43-5E 334.1 tie | N14-29-5E 973.89 tie | N55-17-3E 189.48 tie | N87-59-9E 366.98 | S32-34-13E 125.99 | S36-2-14W 118.6 | N62-35-22W 410.94",0,1.01,"boundary"],
  ["WA: beginning by offset, thirds of a foot","Whitman County Gazette legals 11/24/2016 (WA)","BEGINNING at a point on the south line of Section 30, Township 17 North, Range 41 East, W.M., 396 feet westerly from the southeast corner of said section; thence north at right angles to said south line 135 feet; thence west parallel with said south line 161 1/3 feet; thence south 135 feet to the aforesaid south line; thence east on the said south line 161 1/3 feet to the place of beginning;","N 135 | W 161.333 | S 135 | E 161.333",0,0.5,"boundary"],
  ["VT: half and quarter degrees, bounds calls (stay flagged)","Seven Days legal notice (Addison Co., VT)","beginning at the northwesterly corner of land owned by Gerald and Elita Scribner at a point on the southerly line of the above highway known as Lovers Lane marked by a driven iron pipe; thence South 8 ½ degrees East 35.6 ft. to a point where and iron pipe is driven; thence South 58 ¼ degrees East 281.2 ft. along the line of said Scribner land to a point at an intersection of a fence where an iron pipe is driven; thence South 3 degrees West 44 ft. along a fence and stone wall, which is the westerly line of the Hazel N. Thomas East Orchard, to a point where an iron pipe is set in a mound of stones; thence West on a line parallel with Lovers Lane to an iron pipe 31 ft. from the Johnson Line; thence North 231 ft., running parallel with the Johnson Line, to an iron post on Lovers Lane 31 ft. from Johnson’s line; thence along Lovers Lane 256 ft. to the point of beginning.","S8-30-0E 35.6 | S58-15-0E 281.2 | S3-0-0W 44 | partial W ? | N 231 | partial ? 256",242.11,0.6,"boundary"]
];
REAL.forEach(([n,src,txt,want,close,acres,kind])=>{
  let f,g,got; try{f=P.parseDeedFigures(txt)[0];g=P.computeDeed(f.calls,0,0,0);got=f.calls.map(_sigR).join(" | ");}catch(e){got="THREW "+e.message;}
  t(n+": courses", got===want, {got,want});
  t(n+": misclosure "+close+" ft, "+acres+" ac, "+kind,
    !!g&&Math.abs(g.closeDist-close)<0.02&&Math.abs(Math.abs(P._deedArea(g))/43560-acres)<0.006&&f.kind===kind,
    g?[+g.closeDist.toFixed(2),+(Math.abs(P._deedArea(g))/43560).toFixed(2),f.kind]:null);
});
{
  const pa=P.parseDeedFigures(REAL[7][2])[0]; pa.pobE=0; pa.pobN=0; pa.computed=P.computeDeed(pa.calls,0,0,0);
  t("PA: the lone curve is placed by closure and says so", !!pa.computed.curveSolved&&codes(pa).includes("curve-solved"), codes(pa));
  t("PA: chord lands on S 49°54'26\" W", pa.computed.curveSolved&&Math.abs(pa.computed.curveSolved.az-229.907)<0.01, pa.computed.curveSolved);
  const ky=P.parseDeedFigures(REAL[11][2])[0];
  t("KY: a THENCE call with no bearing and no distance is a review row, not dropped", ky.calls[0].type==="partial"&&/LAWSON/.test(ky.calls[0].raw), ky.calls[0]);
  const al=P.parseDeedFigures(REAL[0][2])[0];
  t("AL: 'TOWNSHIP ELEVEN (11) SOUTH, RANGE SIX (6) EAST' raises no false review row", al.calls.every(c=>c.type!=="partial"), al.calls.filter(c=>c.type==="partial").map(c=>c.raw));
}

console.log("— what the deed leaves out (4.8.13) —");
{
  const near=(a,b,t)=>Math.abs(a-b)<(t||0.01);
  const brgAz=c=>P._deedBearingToAz(c.bearing);
  const comp=calls=>P.computeDeed(calls,0,0,0);
  const fg=calls=>{const f={calls,pobE:0,pobN:0,kind:"boundary",name:"B"};f.computed=comp(calls);return f;};
  // 200 x 100 rectangle whose second side is a bounds call
  const gapTxt='Begin; thence N 0-0-0 E 100 feet; thence with the creek to a stake; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 200 feet to the point of beginning.';
  const gc=P.parseDeedText(gapTxt), G=comp(gc);
  t("the bounds call is still a review row in the calls", gc[1].type==="partial"&&gc.length===4, gc.map(c=>c.type));
  t("the figure is bridged across it", !!G.gap&&G.gap.call===gc[1], G.gap);
  t("bridge is S 90 E 200.00", G.gap&&near(G.gap.az,90,1e-6)&&near(G.gap.dist,200), G.gap&&[G.gap.az,G.gap.dist]);
  t("corners after the gap land where the deed puts them", G.verts.length===5&&near(G.verts[2].E,200)&&near(G.verts[2].N,100)&&near(G.verts[3].E,200)&&near(G.verts[3].N,0), G.verts);
  t("bridged figure holds 20,000 sq ft", near(Math.abs(P._deedArea(G)),20000,1), P._deedArea(G));
  t("the bridging course is flagged, not passed off as a call", G.usable[1].gap===true&&P._deedSrcTag(G.usable[1])===" · bridged");
  t("diagnostics say it is bridged and still list the unread course", codes(fg(gc)).includes("gap")&&codes(fg(gc)).includes("partial"), codes(fg(gc)));
  const gd=P.parseDeedText(gapTxt.replace("with the creek to a stake","with the creek 150 feet to a stake")), Gd=comp(gd);
  t("a stated distance is kept beside the bridged one", Gd.gap&&Gd.gap.hasDist&&near(Gd.gap.statedDist,150)&&near(Gd.gap.dist,200), Gd.gap);
  const g2p=P.parseDeedText('Begin; thence N 0-0-0 E 100 feet; thence with the creek to a stake; thence with the road to a pin; thence N 90-0-0 W 200 feet to the point of beginning.');
  t("two unread courses are not bridged automatically", !comp(g2p).gap&&g2p.filter(c=>c.type==="partial").length===2);
  const gdf=P.parseDeedText('Begin; thence N 0-0-0 E 100 feet; thence with the creek to a stake; thence deflect 90 degrees to the right 100 feet; thence N 90-0-0 W 200 feet to the point of beginning.');
  t("a gap followed by a deflection is left alone", !comp(gdf).gap);

  console.log("— solve by closure —");
  let s=P._deedGapSolve(gc,null);
  t("one course with nothing: one answer, S 90 E 200", s.n===1&&s.solutions.length===1&&near(s.solutions[0].fills[0].az,90,1e-6)&&near(s.solutions[0].fills[0].dist,200)&&s.solutions[0].leaves<0.01, s);
  const gcA=JSON.parse(JSON.stringify(gc)); P._deedGapApply(gcA,P._deedGapSolve(gcA,null).solutions[0]);
  t("applied: a real course, tagged computed", gcA[1].type==="line"&&gcA[1].src.b==="C"&&gcA[1].src.d==="C"&&P._deedSrcTag(gcA[1])===" · computed"&&!!gcA[1].corrected, gcA[1]);
  t("applied: closes with no bridge", comp(gcA).closeDist<0.01&&!comp(gcA).gap);
  P._deedRevertCalls(gcA);
  t("revert puts the deed's own call back", gcA[1].type==="partial"&&!gcA[1].src&&!gcA[1].corrected, gcA[1]);
  const gb=P.parseDeedText(gapTxt.replace("with the creek to a stake","N 88-0-0 E to a stake"));
  s=P._deedGapSolve(gb,null);
  t("bearing only: first answer keeps the deed's bearing", s.solutions.length===2&&near(s.solutions[0].fills[0].az,88,1e-6)&&s.solutions[0].fills[0].srcB==null&&s.solutions[0].fills[0].srcD==="C", s.solutions[0]);
  t("…distance 199.88, and it says what that leaves (6.98)", near(s.solutions[0].fills[0].dist,200*Math.cos(2*Math.PI/180))&&near(s.solutions[0].leaves,200*Math.sin(2*Math.PI/180)), [s.solutions[0].fills[0].dist,s.solutions[0].leaves]);
  t("…second answer closes exactly and is marked as overriding the bearing", s.solutions[1].leaves<0.01&&s.solutions[1].fills[0].srcB==="C");
  const gbA=JSON.parse(JSON.stringify(gb)); P._deedGapApply(gbA,P._deedGapSolve(gbA,null).solutions[0]);
  t("…applied: only the distance is tagged", P._deedSrcTag(gbA[1])===" · distance computed"&&near(brgAz(gbA[1]),88,1e-6), [P._deedSrcTag(gbA[1]),gbA[1].bearing]);
  s=P._deedGapSolve(gd,null);
  t("distance only: first answer keeps 150 and computes the bearing, leaves 50", s.solutions.length===2&&near(s.solutions[0].fills[0].dist,150)&&near(s.solutions[0].fills[0].az,90,1e-6)&&near(s.solutions[0].leaves,50)&&s.solutions[0].fills[0].srcB==="C"&&s.solutions[0].fills[0].srcD==null, s.solutions[0]);
  const mkc=(o)=>Object.assign({type:"partial",bearing:null,dist:null,raw:""},o);
  const L=(az,d,pob)=>({type:"line",bearing:{q1:az===0||az===90?"N":"S",deg:az===0?0:az===90?90:az===180?0:90,min:0,sec:0,q2:az===0||az===90?"E":"W",_az:az},dist:d,unit:"FEET",rawVal:d,raw:"",_pob:!!pob});
  const B=az=>({q1:"N",deg:0,min:0,sec:0,q2:"E",_az:az});
  // square 100: N 100, E ?, S ?, W 100
  s=P._deedGapSolve([L(0,100),mkc({bearing:B(90)}),mkc({bearing:B(180)}),L(270,100,true)],null);
  t("two bearings, no distances: both are 100.00", s.solutions.length===1&&near(s.solutions[0].fills[0].dist,100)&&near(s.solutions[0].fills[1].dist,100)&&s.solutions[0].leaves<0.01, s);
  s=P._deedGapSolve([L(0,100),mkc({bearing:B(90)}),mkc({dist:120}),L(270,100,true)],null);
  t("a bearing and a distance: two answers, both close", s.solutions.length===2&&s.solutions.every(x=>x.leaves<0.01)&&near(s.solutions[0].fills[0].dist,100-Math.sqrt(4400))&&near(s.solutions[1].fills[0].dist,100+Math.sqrt(4400)), s.solutions.map(x=>x.fills.map(f=>[f.az,f.dist])));
  s=P._deedGapSolve([L(0,100),mkc({bearing:B(90)}),mkc({dist:50}),L(270,100,true)],null);
  t("…a distance too short to reach says so", s.solutions.length===0&&/too short/.test(s.why), s.why);
  s=P._deedGapSolve([L(0,100),mkc({dist:100}),mkc({dist:100}),L(270,100,true)],null);
  t("two distances, no bearings: two answers (east-then-south, south-then-east)", s.solutions.length===2&&s.solutions.every(x=>x.leaves<0.01)&&
    s.solutions.some(x=>near(x.fills[0].az,90,1e-6)&&near(x.fills[1].az,180,1e-6))&&s.solutions.some(x=>near(x.fills[0].az,180,1e-6)&&near(x.fills[1].az,90,1e-6)), s.solutions.map(x=>x.fills.map(f=>f.az)));
  // strip: N 100, E ?, S 100, W ?  — closure cannot split it, the acreage can
  const strip=()=>[L(0,100),mkc({bearing:B(90)}),L(180,100),mkc({bearing:B(270),_pob:true})];
  s=P._deedGapSolve(strip(),null);
  t("parallel courses with no acreage: explains, does not guess", s.solutions.length===0&&/parallel/.test(s.why)&&/acreage/.test(s.why), s.why);
  s=P._deedGapSolve(strip(),0.5);
  t("parallel courses + 0.5 acre recited: both are 217.80", s.solutions.length===1&&near(s.solutions[0].fills[0].dist,217.8,0.01)&&near(s.solutions[0].fills[1].dist,217.8,0.01)&&near(s.solutions[0].acres,0.5,1e-4), s.solutions[0]);
  // triangle: N 100, E ? , then a course with nothing back to the beginning; 0.25 acre
  s=P._deedGapSolve([L(0,100),mkc({bearing:B(90)}),mkc({_pob:true})],0.25);
  t("a bearing-only course and an empty one + 0.25 acre: distance 217.80, closing course computed", s.solutions.length===1&&near(s.solutions[0].fills[0].dist,217.8,0.01)&&near(s.solutions[0].fills[1].dist,Math.hypot(217.8,100),0.01)&&s.solutions[0].leaves<0.01, s.solutions[0]);
  s=P._deedGapSolve([L(0,100),mkc({}),mkc({dist:50}),L(270,100,true)],null);
  t("an empty course beside another incomplete one: explains", s.solutions.length===0&&/Closure cannot place both/.test(s.why), s.why);
  s=P._deedGapSolve([L(0,100),mkc({}),mkc({}),mkc({}),L(270,100,true)],null);
  t("three incomplete courses: asks for some to be filled in first", s.n===3&&s.solutions.length===0&&/More than two/.test(s.why));
  t("nothing incomplete: nothing to solve", P._deedGapSolve([L(0,100),L(90,100),L(180,100),L(270,100,true)],null).n===0);

  console.log("— source tags and field fill-ins —");
  t("tags read plainly", P._deedSrcTag({src:{b:"A",d:"A"}})===" · assumed"&&P._deedSrcTag({src:{b:"F",d:"F"}})===" · field"&&P._deedSrcTag({src:{b:"C",d:"F"}})===" · bearing computed · distance field"&&P._deedSrcTag({})===""&&P._deedSrcTag({src:{}})==="");
  const pl={name:"Creek",verts:[{E:0,N:0},{E:100,N:0},{E:100,N:100}],segs:[{type:"line"},{type:"line"}]};
  let pc=P._deedPolyCalls(pl,false,0);
  t("a polyline becomes one course per segment, tagged field", pc.length===2&&near(brgAz(pc[0]),90,1e-6)&&near(pc[0].dist,100)&&near(brgAz(pc[1]),0,1e-6)&&pc.every(c=>c.src.b==="F"&&c.src.d==="F"), pc);
  pc=P._deedPolyCalls(pl,true,0);
  t("reversed runs the other way", near(brgAz(pc[0]),180,1e-6)&&near(brgAz(pc[1]),270,1e-6), pc.map(brgAz));
  t("the figure's swing is taken off", near(brgAz(P._deedPolyCalls(pl,false,10)[0]),80,1e-6));
  const pa={name:"Road",verts:[{E:0,N:0},{E:100,N:0}],segs:[{type:"arc",centerE:50,centerN:-50,R:Math.hypot(50,50),dir:"cw"}]};
  pc=P._deedPolyCalls(pa,false,0);
  t("an arc segment becomes a curve by its chord", pc.length===1&&pc[0].type==="curve"&&pc[0].dir==="R"&&near(pc[0].chordD,100)&&near(P._deedBearingToAz(pc[0].chordB),90,1e-6)&&near(pc[0].radius,70.7107,0.001), pc[0]);
  t("…and flips side when reversed", P._deedPolyCalls(pa,true,0)[0].dir==="L");
}

console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
