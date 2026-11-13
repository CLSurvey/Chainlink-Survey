// 4.7.2 harness: turned-angle geometry + blunder detection.
// 4.8.11: + 65 deed phrasings (one row per wording) and their geometry.
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
  +';module.exports={parseDeedText,parseDeedFigures,computeDeed,_deedBlunders,_deedArea,_deedBearingToAz,_deedAzToBearingStr};','h.js');
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

console.log("\n"+pass+" passed, "+fail+" failed");
process.exit(fail?1:0);
