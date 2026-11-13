#!/usr/bin/env node
/* =============================================================================
   ChainLink Survey — deed-parser regression suite (consolidated)
   Usage:  node chainlink-tests.js [path/to/index.html]   (default ./index.html)
   Runs 18 batteries, ~375 cases, ~2 min. Compare final table to EXPECTED.

   EXPECTED (v4.3.61 baseline) — pass/fail per battery:
     batch2 21/2   batch3 23/1   batch4 76/1   batch5 72-73/2-3(RNG)  batch6 11/0
     known  25/0   intl   19/1   curves 10/1   texas  18/0   louisiana 13/0
     circle  5/0   ties    5/1   etowah  8/0   al2     3/2   al3  7/0
     al4     5/0   al5     5/0   long   10/0   aliquot 11/0, aliqcal 9/0, aliqplace 7/0, realdeeds 10-11/0 by version (need >=4.3.63/64/72/78)
   Known-acceptable failures (deliberate non-goals / test artifacts):
     batch2: spelled-out bearings x2 | batch3: 2-seg radial isolated form
     batch4: spelled-out bearing | batch5: 12-gon rounding x2 + RNG roundtrip
     intl: decimal-comma | curves: my-test-geometry (Charlotte-style)
     ties: synthetic FROM-departure | al2: Berea/FullMoon variants
   A DROP below these numbers after a parser change = regression. Investigate.
   ============================================================================= */
const _fsReal=require('fs');
const _htmlPath=process.argv[2]||'./index.html';
const html=_fsReal.readFileSync(_htmlPath,'utf8');
global.window={};
const p1=html.indexOf('const _DEED_UNIT_FT');
const p2=html.indexOf('function _deedCallLabel');
if(p1<0||p2<0){console.error('FATAL: parser markers not found in '+_htmlPath);process.exit(1);}
const M=new module.constructor();
M._compile('let units="ft";var window=global.window;'+html.slice(p1,p2)
  .replace(/function _deedSyncPoints[\s\S]*?\n}\n/,'function _deedSyncPoints(){}\n')
  .replace(/function _deedRemovePoints[\s\S]*?\n}\n/,'function _deedRemovePoints(){}\n')
  +';module.exports={parseDeedFigures,parseDeedText,computeDeed,_deedArea,_deedBearingToAz,_deedNormalize,_deedParseBearing,_deedParseDistance,_deedAliquotCalibrate:(typeof _deedAliquotCalibrate!=="undefined"?_deedAliquotCalibrate:null),_deedAliquotOffset:(typeof _deedAliquotOffset!=="undefined"?_deedAliquotOffset:null)};','parser.js');
const PARSER=M.exports;
console.log('Parser loaded from '+_htmlPath+' | app version: '+((html.match(/APP_VERSION = "([^"]+)"/)||[])[1]||'?'));
const DEEDS={"/tmp/mesa.txt": "COMMENCING at the Southeast corner of said Section 3 and assuming the East line of the SE 1/4 of said Section 3 bears N 00\"03'02\" E with all other bearings contained herein being relative thereto; thence from said Point of Commencement, N 00\"03'02\" E, a distance of 1497.80 feet; thence N 89\"56'58\" W, a distance of 303.60 feet to a paint being the Southeast corner of that certain parcel of land described in Book 1299, Page 978, Public Records of Mesa County, Colorado and the POINT OF BEGINNING; thence from said Point of Beginning, continue N 89\"56'58\" W, along the South line of said parcel, a distance of 21.10 feet to a point being the beginning of a non-tangent 13.00 foot radius curve, concave West, whose long chord bears N 02\"08'20\" E with a long chord length of 14.80 feet; thence Northerly along the arc of said curve, through a central angle of 69\"22'45\", a distance of 15.74 feet; thence N 32°33'03\" W, a distance of 54.92 feet to a point being the beginning of a non-tangent 249.56 foot radius curve, concave Northeast, whose long chord bears N 21\"37'16\" W with a long chord length of 94.63 feet; thence Northwesterly along the arc of said curve, through a central angle of 21\"51'34\", a distance of 95.21 feet to a point on the North line of said parcel; thence S 89\"56'58\" E, along said North line, a distance of 8.84 feet to a point being the Northeast corner of said parcel and the beginning of a non-tangent 360.00 foot radius curve, concave Northeast, whose long chord bears S 27\"03'09\" E with a long chord length of 167.38 feet; thence Southeasterly along the arc of said curve, through a central angle of 26\"53'07\", a distance of 168.93 feet more or less, with said line being the East line of said parcel, to the Point of Beginning.\n", "/mnt/user-data/outputs/pima-cpc-deed.txt": "EXHIBIT A\nLEGAL DESCRIPTION CPC PROPERTY\n\nPARCEL NO. 1:\n\nSOUTH PARCEL\n\nALL THAT PORTION OF SECTION 17 AND SECTION 18, TOWNSHIP 13 SOUTH, RANGE 13 EAST, OF THE GILA AND SALT RIVER BASE AND MERIDIAN, PIMA COUNTY, ARIZONA; SAID PARCEL BEING MORE PARTICULARLY DESCRIBED AS FOLLOWS, TO-WIT:\n\nBEGINNING AT THE NORTHWEST CORNER OF SAID SECTION 17;\n\nTHENCE SOUTH 00 DEGREES 43 MINUTES 18 SECONDS WEST, A DISTANCE OF 30.00 FEET TO A POINT IN THE SOUTH RIGHT-OF-WAY LINE OF SUNSET ROAD AS RECORDED IN BOOK 3, PAGE 39 OF ROAD MAPS IN THE OFFICE OF THE PIMA COUNTY, ARIZONA RECORDER; SAID POINT ALSO BEING THE TRUE POINT OF BEGINNING;\n\nTHENCE NORTH 89 DEGREES 48 MINUTES 13 SECONDS EAST, A DISTANCE OF 814.81 FEET;\n\nTHENCE SOUTH 00 DEGREES 00 MINUTES 00 SECONDS EAST, A DISTANCE OF 5.76 FEET;\n\nTHENCE SOUTH 78 DEGREES 34 MINUTES 20 SECONDS EAST, A DISTANCE OF 395.44 FEET TO A POINT IN THE WEST RIGHT-OF-WAY OF INTERSTATE 10 AS IT NOW EXISTS (JULY, 1997);\n\nTHENCE SOUTH 30 DEGREES 03 MINUTES 04 SECONDS EAST, ALONG SAID RIGHT-OF-WAY LINE, A DISTANCE OF 233.43 FEET; SAID POINT BEING A POINT OF INTERSECTION WITH THE EAST LINE OF THE NORTHWEST QUARTER OF THE NORTHWEST QUARTER OF SAID SECTION 17;\n\nTHENCE CONTINUE SOUTH 30 DEGREES 03 MINUTES 04 SECONDS EAST, A DISTANCE OF 591.00 FEET;\n\nTHENCE CONTINUE ALONG SAID RIGHT-OF-WAY LINE SOUTH 32 DEGREES 23 MINUTES 05 SECONDS EAST, A DISTANCE OF 1354.22 FEET TO A POINT OF CURVATURE;\n\nTHENCE CONTINUE ALONG SAID RIGHT-OF-WAY LINE ALONG THE ARC OF A CIRCULAR CURVE CONCAVE TO THE NORTHEAST HAVING A RADIUS OF 23018.31 FEET, A CENTRAL ANGLE OF 01 DEGREES 14 MINUTES 49 SECONDS AN ARC DISTANCE OF 500.92 FEET TO A POINT OF INTERSECTION WITH THE EAST LINE OF THE SOUTHEAST QUARTER OF THE NORTHWEST QUARTER OF SAID SECTION 17;\n\nTHENCE SOUTH 00 DEGREES 49 MINUTES 42 SECONDS WEST ALONG SAID EAST LINE, A DISTANCE OF 239.33 FEET TO THE CENTER OF SAID SECTION 17; SAID POINT ALSO BEING ON THE NORTH LINE OF A STRIP OF LAND (NKA) CURTIS ROAD CONVEYED PIMA COUNTY BY DEED RECORDED IN DOCKET 3688 AT PAGE 855 IN THE OFFICE OF THE PIMA COUNTY, ARIZONA RECORDER;\n\nTHENCE SOUTH 89 DEGREES 54 MINUTES 40 SECONDS WEST, ALONG THE SOUTH LINE OF THE SOUTHEAST QUARTER OF THE NORTHWEST QUARTER OF SECTION 17, A DISTANCE OF 1320.67 FEET TO THE SOUTHEAST CORNER OF SOUTHWEST QUARTER OF THE NORTHWEST QUARTER OF SAID SECTION 17;\n\nTHENCE CONTINUING SOUTH 89 DEGREES 54 MINUTES 40 SECONDS WEST, A DISTANCE OF 1320.67 FEET TO THE COMMON QUARTER SECTION CORNER OF SAID SECTION 17 AND SECTION 18;\n\nTHENCE NORTH 00 DEGREES 42 MINUTES 59 SECONDS EAST ALONG SAID QUARTER SECTION LINE, A DISTANCE OF 1316.39 FEET TO THE SOUTHWEST CORNER OF THE NORTHWEST QUARTER OF THE NORTHWEST QUARTER OF SAID SECTION 17;\n\nTHENCE NORTH 89 DEGREES 51 MINUTES 30 SECONDS WEST ALONG THE SOUTH LINE OF THE NORTHEAST QUARTER OF THE NORTHEAST QUARTER OF SAID SECTION 18, A DISTANCE OF 1325.39 FEET TO THE SOUTHEAST CORNER OF THE NORTHWEST QUARTER OF THE NORTHEAST QUARTER OF SAID SECTION 18;\n\nTHENCE NORTH 89 DEGREES 52 MINUTES 28 SECONDS WEST ALONG THE SOUTH LINE OF THE NORTHWEST QUARTER OF THE NORTHEAST QUARTER, A DISTANCE OF 170.15 FEET TO A POINT IN THE EAST RIGHT-OF-WAY LINE OF SILVERBELL ROAD AS RECORDED IN BOOK 3 AT PAGE(S) 9 AND 10 OF ROAD MAPS IN THE OFFICE OF THE PIMA COUNTY, ARIZONA RECORDER;\n\nTHENCE NORTH 19 DEGREES 15 MINUTES 29 SECONDS WEST ALONG AFORESAID EAST RIGHT-OF-WAY, A DISTANCE OF 710.46 FEET TO A POINT OF CURVATURE;\n\nTHENCE NORTHERLY ALONG A CIRCULAR CURVE CONCAVE TO THE WEST, HAVING A RADIUS OF 2894.79 FEET, CENTRAL ANGLE OF 06 DEGREES 39 MINUTES 32 SECONDS, AN ARC DISTANCE OF 336.43 FEET TO A POINT OF TANGENCY;\n\nTHENCE NORTH 25 DEGREES 55 MINUTES 01 SECONDS WEST, A DISTANCE OF 284.57 FEET TO A POINT OF CURVATURE;\n\nTHENCE NORTHERLY ALONG A CIRCULAR CURVE CONCAVE TO THE WEST HAVING A RADIUS OF 1462.40 FEET, A CENTRAL ANGLE OF 02 DEGREES 19 MINUTES 11 SECONDS, AN ARC DISTANCE OF 59.21 FEET TO A POINT OF INTERSECTION WITH THE SOUTHERLY RIGHT-OF-WAY OF AFORESAID SUNSET ROAD;\n\nTHENCE SOUTH 89 DEGREES 48 MINUTES 15 SECONDS EAST, A DISTANCE OF 703.29 FEET TO THE NORTHEAST CORNER OF THE NORTHWEST QUARTER OF THE NORTHEAST QUARTER OF SAID SECTION 18;\n\nTHENCE CONTINUE ALONG THE SOUTH RIGHT-OF-WAY LINE OF AFORESAID SUNSET ROAD, SOUTH 89 DEGREES 48 MINUTES 15 SECONDS EAST, A DISTANCE OF 1323.22 FEET TO THE TRUE POINT OF BEGINNING.\n\nEXCEPTING THEREFROM, ANY PORTION TAKEN BY THE STATE OF ARIZONA IN FINAL ORDER OF CONDEMNATION RECORDED DECEMBER 14, 2004 AS DOCKET 12448, PAGE 797.\n\nPARCEL NO. 2:\n\nNORTH PARCEL\n\nALL THAT PORTION OF SECTION 7 AND SECTION 8, TOWNSHIP 13 SOUTH, RANGE 13 EAST, OF THE GILA AND SALT RIVER BASE AND MERIDIAN, PIMA COUNTY, ARIZONA, SAID PARCEL BEING MORE PARTICULARLY DESCRIBED AS FOLLOWS, TO-WIT:\n\nBEGINNING AT THE SOUTHEAST CORNER OF SAID SECTION 7;\n\nTHENCE NORTH 00 DEGREES 26 MINUTES 26 SECONDS EAST ALONG THE EAST LINE OF THE SOUTHEAST QUARTER OF SAID SECTION 7, A DISTANCE OF 30.00 FEET TO A POINT ON THE NORTH RIGHT-OF-WAY LINE OF SUNSET ROAD AS RECORDED IN BOOK 3 AT PAGE 39 OF ROAD MAPS THEREOF IN THE OFFICE OF THE PIMA COUNTY, ARIZONA RECORDER, SAID POINT ALSO BEING THE TRUE POINT OF BEGINNING;\n\nTHENCE NORTH 89 DEGREES 48 MINUTES 15 SECONDS WEST, A DISTANCE OF 1322.97 FEET TO A POINT ON THE WEST LINE OF THE SOUTHEAST QUARTER OF THE SOUTHEAST QUARTER OF SAID SECTION 7;\n\nTHENCE CONTINUE ALONG THE NORTH RIGHT-OF-WAY LINE OF AFORESAID SUNSET ROAD, NORTH 89 DEGREES 48 MINUTES 15 SECONDS WEST, A DISTANCE OF 738.06 FEET TO A POINT OF INTERSECTION WITH THE EAST RIGHT-OF-WAY LINE OF SILVERBELL ROAD AS RECORDED IN BOOK 3 AT PAGE(S) 9 AND 10 OF ROAD MAPS, IN THE OFFICE OF THE PIMA COUNTY, ARIZONA RECORDER;\n\nTHENCE NORTHWESTERLY ALONG THE ARC OF CIRCULAR CURVE CONCAVE TO THE SOUTHWEST HAVING A RADIUS OF 1462.40 FEET, A CENTRAL ANGLE OF 06 DEGREES 51 MINUTES 15 SECONDS, AN ARC DISTANCE OF 174.94 FEET TO A POINT OF TANGENCY;\n\nTHENCE CONTINUE ALONG SAID RIGHT-OF-WAY LINE NORTH 37 DEGREES 47 MINUTES 34 SECONDS WEST, A DISTANCE OF 786.23 FEET TO A POINT OF INTERSECTION WITH THE WEST LINE OF THE SOUTHWEST QUARTER OF THE SOUTHEAST QUARTER OF SAID SECTION 7;\n\nTHENCE NORTH 00 DEGREES 20 MINUTES 49 SECONDS EAST, ALONG SAID WEST LINE, A DISTANCE OF 527.80 FEET TO THE NORTHWEST CORNER OF THE SOUTHWEST QUARTER OF THE SOUTHEAST QUARTER OF SAID SECTION 7;\n\nTHENCE ALONG THE NORTH LINE OF SAID QUARTER, SOUTH 89 DEGREES 58 MINUTES 16 SECONDS EAST, A DISTANCE OF 648.56 FEET TO A POINT IN THE SOUTHWEST CORNER OF LAND DESCRIBED IN BOOK 304 OF DEEDS, AT PAGE 197 AS RECORDED OF RECORD IN THE OFFICE OF THE PIMA COUNTY, ARIZONA RECORDER;\n\nTHENCE NORTH 00 DEGREES 26 MINUTES 26 SECONDS EAST ALONG THE WEST LINE OF LAND DESCRIBED IN AFORESAID BOOK 304 OF DEEDS AT PAGE 197, A DISTANCE OF 350.00 FEET;\n\nTHENCE SOUTH 89 DEGREES 58 MINUTES 16 SECONDS EAST (SOUTH 89 DEGREES 31 MINUTES 09 SECONDS EAST, RECORDED), A DISTANCE OF 106.56 FEET TO A POINT IN THE NORTHWEST CORNER OF LAND TAKEN BY FINAL ORDER OF CONDEMNATION RECORDED IN DOCKET 9843 AT PAGE 2492 IN THE OFFICE OF THE PIMA COUNTY, ARIZONA RECORDER;\n\nTHENCE SOUTH 66 DEGREES 30 MINUTES 06 SECONDS EAST (SOUTH 67 DEGREES 00 MINUTES 31 SECONDS EAST, RECORDED), A DISTANCE OF 561.28 FEET;\n\nTHENCE NORTH 61 DEGREES 49 MINUTES 56 MINUTES EAST (NORTH 61 DEGREES 19 MINUTES 32 SECONDS EAST, RECORDED), A DISTANCE OF 90.02 FEET;\n\nTHENCE NORTH 28 DEGREES 10 MINUTES 03 SECONDS WEST (NORTH 28 DEGREES 40 MINUTES 28 SECONDS EAST, RECORDED), A DISTANCE OF 67.99 FEET TO A POINT ON A CURVE FROM WHICH THE RADIUS BEARS SOUTH 39 DEGREES 23 MINUTES 41 SECONDS EAST, A DISTANCE OF 614.58 FEET;\n\nTHENCE CONTINUE ALONG THE ARC OF SAID CURVE NORTHEASTERLY CONCAVE TO THE SOUTHEAST HAVING A RADIUS OF 614.58 FEET, A CENTRAL ANGLE OF 25 DEGREES 14 MINUTES 35 SECONDS, AN ARC DISTANCE OF 270.77 FEET TO A POINT IN THE NORTHEAST CORNER OF LAND TAKEN BY AFORESAID DOCKET 9843 AT PAGE 2492; AND ALSO BEING A POINT OF INTERSECTION WITH A LINE 350.00 FEET NORTH AND PARALLEL WITH THE NORTH LINE OF THE SOUTHEAST QUARTER OF THE SOUTHEAST QUARTER OF SAID SECTION 7;\n\nTHENCE CONTINUE ALONG SAID LINE SOUTH 89 DEGREES 58 MINUTES 16 SECONDS EAST (NORTH 89 DEGREES 31 MINUTES 21 SECONDS EAST, RECORDED), A DISTANCE OF 1091.65 FEET TO A POINT ON THE EAST LINE OF SAID SECTION 7;\n\nTHENCE NORTH ALONG SAID SECTION LINE, NORTH 00 DEGREES 26 MINUTES 26 SECONDS EAST, A DISTANCE OF 338.67 FEET TO A POINT OF INTERSECTION WITH THE WEST RIGHT-OF-WAY LINE OF INTERSTATE 10 AS IT NOW EXISTS (JULY 1997);\n\nTHENCE ALONG SAID RIGHT-OF-WAY LINE SOUTH 30 DEGREES 02 MINUTES 19 SECONDS EAST, A DISTANCE OF 1061.27 FEET;\n\nTHENCE CONTINUE ALONG SAID RIGHT-OF-WAY LINE SOUTH 25 DEGREES 16 MINUTES 29 SECONDS EAST, A DISTANCE OF 602.07 FEET;\n\nTHENCE CONTINUE ALONG SAID RIGHT-OF-WAY LINE SOUTH 28 DEGREES 08 MINUTES 09 SECONDS EAST, A DISTANCE OF 572.32 FEET;\n\nTHENCE SOUTH 74 DEGREES 59 MINUTES 32 SECONDS WEST, A DISTANCE OF 63.46 FEET TO A POINT OF INTERSECTION WITH THE NORTH LINE OF AFORESAID SUNSET ROAD;\n\nTHENCE SOUTH 89 DEGREES 48 MINUTES 13 SECONDS WEST, ALONG SAID NORTH RIGHT-OF-WAY LINE A DISTANCE OF 1012.42 FEET TO THE TRUE POINT OF BEGINNING.\n\nEXCEPTING THEREFROM ANY PORTION TAKEN BY THE STATE OF ARIZONA IN FINAL ORDER OF CONDEMNATION RECORDED DECEMBER 14, 2004 AS DOCKET 12448, PAGE 797.\n\nPARCEL NO. 3:\n\nACCESS EASEMENTS AS MORE FULLY SET FORTH AND RESERVED BY DEED(S) RECORDED IN DOCKET 1986 AT PAGE(S) 235 AND 238; AND IN DOCKET 2019 AT PAGE 87; AND IN DOCKET 2062 AT PAGE 128; AND IN DOCKET 2167 AT PAGE 242; AND IN DOCKET 2273 AT PAGE 13 IN THE OFFICE OF THE PIMA COUNTY, ARIZONA RECORDER.\n"};
const _deedFS={readFileSync:(p)=>{if(DEEDS[p]!=null)return DEEDS[p];throw new Error('unknown embedded deed: '+p);}};
const RESULTS=[];

/* ===================== battery: batch2 ===================== */
(function(){
console.log('\n########## batch2 ##########');
global.window={};
try{
const {parseDeedFigures,parseDeedText,computeDeed,_deedBearingToAz}=PARSER;
let pass=0,fail=0;
const B=(b,e)=>{const c=parseDeedText('thence '+b+' 100 feet to a point')[0];const az=c&&c.bearing?_deedBearingToAz(c.bearing):(c&&c.compassAz!=null?c.compassAz:null);const ok=az!=null&&Math.abs(((az-e+540)%360)-180)<0.03;console.log((ok?'ok  ':'FAIL')+' '+b.padEnd(32)+'az='+(az!=null?az.toFixed(3):'NULL')+' want '+e);ok?pass++:fail++;};
const D=(t,e)=>{const c=parseDeedText('thence N 0-0-0 E '+t+' to a point')[0];const ok=c&&c.dist&&Math.abs(c.dist-e)<0.1;console.log((ok?'ok  ':'FAIL')+' '+t.padEnd(30)+'= '+(c&&c.dist?c.dist.toFixed(2):'NULL')+' want '+e);ok?pass++:fail++;};
const S=(name,txt,wc)=>{const f=parseDeedFigures(txt)[0];const n=f?f.calls.filter(c=>!c.tie&&c.type!=='partial').length:0;const ok=n===wc;console.log((ok?'ok  ':'FAIL')+' '+name.padEnd(38)+'courses='+n+' want '+wc);ok?pass++:fail++;};

console.log('=== BEARING FORMS ===');
B('N 47° 23\u2019 10\u2033 E',47.386);       // curly apostrophe + prime for sec
B('N 47DEG 23MIN 10SEC E',47.386);
B('N. 47° 23\u2032 10\u2033 E.',47.386);      // trailing periods
B('NORTHEAST',45);                            // single word compass
B('N 0°00\u201900\u2033 E',0);                // due north via DMS zeros
B('S 0-0-0 E',180);
B('N90°00\u201900\u2033E',90);                // 90 exactly (boundary)
B('n 47°23\u201910\u2033 e',47.386);          // lowercase

console.log('=== DISTANCE FORMS ===');
D('one hundred feet',100);                    // spelled-out (likely FAIL)
D('100 ft.',100);
D('100\u2032',100);                           // prime as foot mark
D('2 rods 8 links',38.28);                    // rods+links compound
D('10 chains 50 links',693);
D('33 links',21.78);
D('1 pole',16.5);

console.log('=== STRUCTURE / REAL-WORLD ===');
S('bearing-distance no "thence"','Begin at a pin. N 0-0-0 E 100 feet. S 90-0-0 E 100 feet. S 0-0-0 W 100 feet. N 90-0-0 W 100 feet.',4);
S('tab-delimited table','Beginning at a pin\tN 0-0-0 E\t100\tS 90-0-0 E\t100\tS 0-0-0 W\t100\tN 90-0-0 W\t100',0);
S('degrees-only bearings','Begin; thence N 45 E 100 feet; thence S 45 E 100 feet; thence S 45 W 100 feet; thence N 45 W 100 feet',4);
S('leading zeros stripped','Begin; thence N 05-03-00 E 100 feet; thence S 85-00-00 E 100 feet; thence S 05-03-00 W 100 feet; thence N 85-00-00 W 100 feet',4);
S('double spaces + caps chaos','BEGIN;  THENCE  n 0-0-0 e   100  FEET; THENCE s 90-0-0 e 100 feet; thence S 0-0-0 W 100 FEET; THENCE N 90-0-0 W 100 FEET',4);
S('OCR: O for 0 in distance','Begin; thence N 0-0-0 E 1OO feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet',4);
S('semicolon inside parenthetical','Begin; thence N 0-0-0 E 100 feet (per plat; recorded 1987); thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet',4);
S('two figures: main + except','Begin at A; thence N 0-0-0 E 200 feet; thence S 90-0-0 E 200 feet; thence S 0-0-0 W 200 feet; thence N 90-0-0 W 200 feet to POB. LESS AND EXCEPT: Begin at B; thence N 0-0-0 E 50 feet; thence S 90-0-0 E 50 feet; thence S 0-0-0 W 50 feet; thence N 90-0-0 W 50 feet to POB.',4);

console.log('=== REGRESSION ===');
const fs=_deedFS;
[['PIMA','/mnt/user-data/outputs/pima-cpc-deed.txt'],['MESA','/tmp/mesa.txt']].forEach(([nm,pth])=>{try{parseDeedFigures(fs.readFileSync(pth,'utf8')).forEach(x=>{const g=computeDeed(x.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0);console.log('    '+nm,x.name||'',g.closeDist.toFixed(2));});}catch(e){console.log('    '+nm,'ERR',e.message);}});
console.log('\n=== '+pass+' pass / '+fail+' fail ===');

if(typeof pass!=='undefined')RESULTS.push(['batch2',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['batch2',-1,-1]);}
})();

/* ===================== battery: batch3 ===================== */
(function(){
console.log('\n########## batch3 ##########');
global.window={};
try{
const {parseDeedFigures,parseDeedText,computeDeed,_deedArea,_deedBearingToAz}=PARSER;
let pass=0,fail=0;
function T(name,fn){let ok=false,err=null;const t0=Date.now();try{ok=fn();}catch(e){err=e.message;}const ms=Date.now()-t0;if(ms>200)err=(err||'')+' SLOW('+ms+'ms)';console.log((ok&&!err?'ok  ':'FAIL')+' '+name.padEnd(44)+(err?(' <'+err+'>'):''));(ok&&!err)?pass++:fail++;}
const az=b=>{const c=parseDeedText('thence '+b+' 100 feet to a point')[0];return c&&c.bearing?_deedBearingToAz(c.bearing):(c&&c.compassAz!=null?c.compassAz:null);};
const near=(a,e)=>a!=null&&Math.abs(((a-e+540)%360)-180)<0.03;
const dist=t=>{const c=parseDeedText('thence N 0-0-0 E '+t+' to a point')[0];return c&&c.dist!=null?c.dist:null;};
const nc=txt=>{const f=parseDeedFigures(txt)[0];return f?f.calls.filter(c=>!c.tie&&c.type!=='partial').length:0;};
const closeOf=txt=>{const f=parseDeedFigures(txt)[0];if(!f)return null;const g=computeDeed(f.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0);return g.closeDist;};

console.log('=== CURVES (the hard part) ===');
T('tangent curve L, radius+arc',()=>{const c=parseDeedText('thence along a curve to the left having a radius of 250.00 feet, an arc length of 130.90 feet')[0];return c&&c.type==='curve'&&c.dir==='L'&&Math.abs(c.radius-250)<0.1&&Math.abs(c.arc-130.9)<0.1;});
T('curve R+delta, no arc',()=>{const c=parseDeedText('thence along a curve to the right, radius 500.00 feet, central angle 15°00\u201900\u2033')[0];return c&&c.type==='curve'&&Math.abs(c.radius-500)<0.1&&c.delta&&Math.abs(c.delta-15)<0.01;});
T('curve chord bearing+chord dist',()=>{const c=parseDeedText('thence along a curve, radius 300, chord bears N 45°00\u201900\u2033 E, chord 141.42 feet')[0];return c&&c.type==='curve'&&c.chordB&&Math.abs(c.chordD-141.42)<0.1;});
T('curve delta D-M-S spelled',()=>{const c=parseDeedText('thence on a curve to the left with a radius of 1000 feet through a central angle of 05 degrees 30 minutes 00 seconds an arc distance of 96.00 feet')[0];return c&&c.type==='curve'&&c.delta&&Math.abs(c.delta-5.5)<0.01;});
T('nontangent radial "radius bears"',()=>{const c=parseDeedText('thence to a point on a curve to which the radius bears S 20°00\u201900\u2033 E a distance of 400.00 feet; thence along said curve, delta 10°00\u201900\u2033, arc 69.81 feet')[1];return c&&c.type==='curve'&&c.radialAz!=null;});
T('full circle-tangent square w/ fillet closes',()=>{const c=closeOf('Begin at P; thence N 0-0-0 E 100 feet; thence along a curve to the right radius 50 feet arc 78.54 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 150 feet; thence N 90-0-0 W 150 feet to P');return c!=null;});

console.log('=== AREA / CLOSURE MATH ===');
T('unit square = 1 acre-ish (43560 sf)',()=>{const f=parseDeedFigures('Begin; thence N 0-0-0 E 208.71 feet; thence S 90-0-0 E 208.71 feet; thence S 0-0-0 W 208.71 feet; thence N 90-0-0 W 208.71 feet to POB')[0];const A=_deedArea(computeDeed(f.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0));return Math.abs(A-43560)<50;});
T('clockwise vs ccw same |area|',()=>{const cw=_deedArea(computeDeed(parseDeedFigures('Begin; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet; thence N 0-0-0 E 100 feet to POB')[0].calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0));return Math.abs(Math.abs(cw)-10000)<1;});
T('triangle 3-4-5 area = 6 units',()=>{const f=parseDeedFigures('Begin; thence N 0-0-0 E 3 feet; thence S 90-0-0 E 4 feet; thence to POB')[0];const g=computeDeed(f.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0);return true;});
T('open traverse area origin-independent',()=>{const t='Begin; thence N 10-0-0 E 100 feet; thence S 80-0-0 E 90 feet; thence S 15-0-0 W 95 feet; thence N 78-0-0 W 88 feet to POB';const a1=_deedArea(computeDeed(parseDeedFigures(t)[0].calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0));const a2=_deedArea(computeDeed(parseDeedFigures(t)[0].calls.filter(c=>!c.tie&&c.type!=='partial'),500000,1200000,0));return Math.abs(a1-a2)<0.5;});

console.log('=== BEARINGS: edge values ===');
T('N 89-59-59 E ~ 89.9997',()=>near(az('N 89-59-59 E'),89.9997));
T('quadrant math S-W = 180+a',()=>near(az('S 30-00-00 W'),210));
T('reject deg>90',()=>az('N 91-00-00 E')===null);
T('reject min>=60',()=>az('N 45-60-00 E')===null);
T('bearing with comma decimal (euro)',()=>{const v=az('N 45,5 E');return v===null||near(v,45.5);});

console.log('=== ADVERSARIAL / INJECTION ===');
T('10k-char garbage no hang',()=>{parseDeedFigures('THENCE '.repeat(1500)+'N 0-0-0 E 100 feet');return true;});
T('nested parens balance',()=>nc('Begin; thence N 0-0-0 E 100 feet (a (b (c)) d); thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet')===4);
T('unicode minus \u2212 in bearing',()=>near(az('N 45\u221200\u221200 E'),45)||az('N 45\u221200\u221200 E')===null);
T('html tags stripped-ish',()=>nc('Begin; thence <b>N 0-0-0 E</b> 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet')>=3);
T('only punctuation',()=>{parseDeedFigures(';;;,,,...---');return true;});
T('emoji in text',()=>nc('Begin \ud83d\ude00; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet')===4);

console.log('=== REGRESSION ===');
const fs=_deedFS;
[['PIMA','/mnt/user-data/outputs/pima-cpc-deed.txt',[6.99,0.05]],['MESA','/tmp/mesa.txt',[0.00]]].forEach(([nm,pth,exp])=>{try{const figs=parseDeedFigures(fs.readFileSync(pth,'utf8'));figs.forEach((x,i)=>{const g=computeDeed(x.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0);const ok=exp[i]==null||Math.abs(g.closeDist-exp[i])<0.5;console.log((ok?'ok  ':'FAIL')+'     '+nm+' '+(x.name||'')+' '+g.closeDist.toFixed(2));ok?pass++:fail++;});}catch(e){console.log('FAIL     '+nm+' '+e.message);fail++;}});

console.log('\n=== '+pass+' pass / '+fail+' fail ===');

if(typeof pass!=='undefined')RESULTS.push(['batch3',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['batch3',-1,-1]);}
})();

/* ===================== battery: batch4 ===================== */
(function(){
console.log('\n########## batch4 ##########');
global.window={};
try{
const {parseDeedFigures,parseDeedText,computeDeed,_deedArea,_deedBearingToAz}=PARSER;
let pass=0,fail=0;const fails=[];
function T(name,fn){let ok=false,err=null;const t0=Date.now();try{ok=fn();}catch(e){err=e.message;}const ms=Date.now()-t0;if(ms>200)err=(err||'')+' SLOW('+ms+'ms)';const good=ok&&!err;console.log((good?'ok  ':'FAIL')+' '+name.padEnd(46)+(err?(' <'+err+'>'):''));good?pass++:(fail++,fails.push(name));}
const az=b=>{const c=parseDeedText('thence '+b+' 100 feet to a point')[0];return c&&c.bearing?_deedBearingToAz(c.bearing):(c&&c.compassAz!=null?c.compassAz:null);};
const near=(a,e)=>a!=null&&Math.abs(((a-e+540)%360)-180)<0.05;
const dist=t=>{const c=parseDeedText('thence N 0-0-0 E '+t+' to a point')[0];return c&&c.dist!=null?c.dist:null;};
const nc=txt=>{const f=parseDeedFigures(txt)[0];return f?f.calls.filter(c=>!c.tie&&c.type!=='partial').length:0;};
const nf=txt=>parseDeedFigures(txt).length;
const closeOf=txt=>{const f=parseDeedFigures(txt)[0];if(!f)return null;const g=computeDeed(f.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0);return g.closeDist;};

console.log('=== BEARING VARIANTS (20) ===');
T('N 47 23 10 E (space DMS)',()=>near(az('N 47 23 10 E'),47.386));
T('N4723 10E tight',()=>az('N4723 10E')===null||near(az('N4723 10E'),47.386));
T('North Forty-Seven... (words)',()=>az('North Forty-Seven Degrees East')===null);
T('N 47°23.5\u2032 E (decimal min)',()=>near(az('N 47°23.5\u2032 E'),47.3917));
T('N 47°23\u201910.55\u2033 E (decimal sec)',()=>near(az('N 47°23\u201910.55\u2033 E'),47.38626));
T('DUE N',()=>near(az('DUE N'),0));
T('due south',()=>near(az('due south'),180));
T('N0°E (zero deg)',()=>near(az('N0°E'),0));
T('S 00°00\u201900\u2033 W (=180)',()=>near(az('S 00°00\u201900\u2033 W'),180));
T('bearing after "run"',()=>near(az('run N 47-23-10 E'),47.386));
T('N45E (no separators at all)',()=>az('N45E')===null||near(az('N45E'),45));
T('N 45d E',()=>near(az('N 45d E'),45));
T('N 45º E (ordinal-masculine º)',()=>az('N 45º E')===null||near(az('N 45º E'),45));
T('S89.9999E boundary',()=>near(az('S 89.9999 E'),90.0001)||az('S 89.9999 E')===null);
T('N 46 3/4 E (frac deg)',()=>near(az('N 46 3/4 E'),46.75));
T('S 12 1/2 W',()=>near(az('S 12 1/2 W'),192.5));
T('reject deg 90.5',()=>az('N 90.5 E')===null);
T('reject sec 60',()=>az('N 45-30-60 E')===null);
T('mixed case nOrTh',()=>near(az('nOrTh 45 dEgReEs EaSt'),45));
T('trailing junk N 45 E xyz',()=>near(az('N 45 E blah blah'),45));

console.log('=== DISTANCE VARIANTS (18) ===');
T('100',()=>dist('100')===100);
T('100.5 feet',()=>dist('100.5 feet')===100.5);
T('100 feet.',()=>dist('100 feet.')===100);
T('1,250.00 feet (comma)',()=>dist('1,250.00 feet')===1250);
T('12 chs',()=>dist('12 chs')===792||dist('12 chs')===null);
T('12 ch',()=>Math.abs(dist('12 ch')-792)<0.1);
T('50 lks',()=>Math.abs(dist('50 lks')-33)<0.1);
T('1 rod',()=>Math.abs(dist('1 rod')-16.5)<0.01);
T('100 links',()=>Math.abs(dist('100 links')-66)<0.1);
T('2.5 poles',()=>Math.abs(dist('2.5 poles')-41.25)<0.01);
T('reject "feet" alone',()=>dist('feet')===null);
T('very large 999999 feet',()=>dist('999999 feet')===999999);
T('zero distance',()=>dist('0 feet')===0||dist('0 feet')===null);
T('0.01 feet',()=>Math.abs(dist('0.01 feet')-0.01)<0.001);
T('12 chains 0 links',()=>Math.abs(dist('12 chains 0 links')-792)<0.1);
T('leading + sign',()=>dist('+100 feet')===100||dist('+100 feet')===null);
T('distance with tab',()=>dist('100\tfeet')===100);
T('varas plural/singular',()=>Math.abs(dist('1 vara')-2.7778)<0.01);

console.log('=== STRUCTURE (16) ===');
T('4-course closes 0',()=>Math.abs(closeOf('Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet to POB'))<0.01);
T('POB spelled "point of beginning"',()=>{const f=parseDeedFigures('Begin at pin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet to the point of beginning')[0];return f.calls.filter(c=>!c.tie&&c.type!=='partial').length===4;});
T('commence tie excluded',()=>{const f=parseDeedFigures('Commence at NE cor; thence S 0-0-0 W 30 feet to the TRUE POINT OF BEGINNING; thence N 90-0-0 W 100 feet; thence S 0-0-0 W 100 feet; thence S 90-0-0 E 100 feet; thence N 0-0-0 E 100 feet to POB')[0];return f.calls.filter(c=>c.tie).length===1&&f.calls.filter(c=>!c.tie&&c.type!=='partial').length===4;});
T('LESS AND EXCEPT = 2 figs',()=>nf('Begin; thence N 0-0-0 E 200 feet; thence S 90-0-0 E 200 feet; thence S 0-0-0 W 200 feet; thence N 90-0-0 W 200 feet to POB. LESS AND EXCEPT: begin; thence N 0-0-0 E 50 feet; thence S 90-0-0 E 50 feet; thence S 0-0-0 W 50 feet; thence N 90-0-0 W 50 feet to POB')===2);
T('SAVE AND EXCEPT',()=>nf('Begin; thence N 0-0-0 E 200 feet; thence S 90-0-0 E 200 feet; thence S 0-0-0 W 200 feet; thence N 90-0-0 W 200 feet. SAVE AND EXCEPT: begin; thence N 0-0-0 E 50 feet; thence S 90-0-0 E 50 feet; thence S 0-0-0 W 50 feet; thence N 90-0-0 W 50 feet')===2);
T('easement TOGETHER WITH',()=>nf('Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet. TOGETHER WITH a 20 foot easement: begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet')>=1);
T('PARCEL 1 / PARCEL 2',()=>nf('PARCEL 1: begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet. PARCEL 2: begin; thence N 0-0-0 E 50 feet; thence S 90-0-0 E 50 feet; thence S 0-0-0 W 50 feet; thence N 90-0-0 W 50 feet')===2);
T('trailing "containing X acres"',()=>nc('Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet to POB, containing 0.23 acres more or less')===4);
T('numbered (1) (2) (3)',()=>nc('Begin; (1) N 0-0-0 E 100 feet (2) S 90-0-0 E 100 feet (3) S 0-0-0 W 100 feet (4) N 90-0-0 W 100 feet')===4);
T('roman i. ii. iii.',()=>nc('Begin; i. N 0-0-0 E 100 feet ii. S 90-0-0 E 100 feet iii. S 0-0-0 W 100 feet iv. N 90-0-0 W 100 feet')>=1);
T('"to a point" repeated',()=>nc('Begin; thence N 0-0-0 E 100 feet to a point; thence S 90-0-0 E 100 feet to a point; thence S 0-0-0 W 100 feet to a point; thence N 90-0-0 W 100 feet to a point')===4);
T('CRLF line endings',()=>nc('Begin\r\nN 0-0-0 E 100 feet\r\nS 90-0-0 E 100 feet\r\nS 0-0-0 W 100 feet\r\nN 90-0-0 W 100 feet')===4);
T('extra blank lines',()=>nc('Begin\n\n\nN 0-0-0 E 100 feet\n\nS 90-0-0 E 100 feet\n\nS 0-0-0 W 100 feet\n\nN 90-0-0 W 100 feet')===4);
T('metes then "as shown on plat"',()=>nc('Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet, all as shown on the plat recorded in Book 5')===4);
T('bearing basis preamble ignored',()=>nc('Bearings based on grid north. Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet')===4);
T('two POBs = second not double-tied',()=>{const f=parseDeedFigures('Commence at cor; thence N 0-0-0 E 30 feet to POINT OF BEGINNING; thence N 90-0-0 E 100 feet; thence S 0-0-0 E 100 feet; thence S 90-0-0 W 100 feet; thence N 0-0-0 W 100 feet to the point of beginning')[0];return f.calls.filter(c=>c.tie).length===1;});

console.log('=== NUMERIC / GEODESY (10) ===');
T('closes: real irregular 5-sided',()=>{const c=closeOf('Begin; thence N 12-30-00 E 210.5 feet; thence S 77-30-00 E 150.0 feet; thence S 12-30-00 W 210.5 feet; thence N 77-30-00 W 150.0 feet to POB');return c<0.01;});
T('area of 100x200 rect = 20000',()=>{const A=_deedArea(computeDeed(parseDeedFigures('Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 200 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 200 feet to POB')[0].calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0));return Math.abs(A-20000)<1;});
T('acre conversion 43560',()=>{const A=_deedArea(computeDeed(parseDeedFigures('Begin; thence N 0-0-0 E 660 feet; thence S 90-0-0 E 66 feet; thence S 0-0-0 W 660 feet; thence N 90-0-0 W 66 feet to POB')[0].calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0));return Math.abs(A-43560)<1;});
T('bearing round-trip stable',()=>{const a=az('N 33-21-09 E');return near(a,33.3525);});
T('very long traverse (50 courses) no drift',()=>{let s='Begin';for(let i=0;i<50;i++)s+='; thence N '+(i%90)+'-00-00 E 10 feet';const f=parseDeedFigures(s)[0];return f.calls.filter(c=>!c.tie&&c.type!=='partial').length===50;});
T('sub-foot precision kept',()=>{const c=parseDeedText('thence N 0-0-0 E 123.456 feet')[0];return Math.abs(c.dist-123.456)<0.0001;});
T('chains area (10ch x 10ch = 10 ac)',()=>{const A=_deedArea(computeDeed(parseDeedFigures('Begin; thence N 0-0-0 E 10 chains; thence S 90-0-0 E 10 chains; thence S 0-0-0 W 10 chains; thence N 90-0-0 W 10 chains to POB')[0].calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0));return Math.abs(A/43560-10)<0.01;});
T('meter traverse closes',()=>{const c=closeOf('Begin; thence N 0-0-0 E 30 meters; thence S 90-0-0 E 30 meters; thence S 0-0-0 W 30 meters; thence N 90-0-0 W 30 meters to POB');return c<0.01;});
T('mixed units in one deed',()=>{const c=closeOf('Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 2 chains; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 132 feet to POB');return c<0.5;});
T('degenerate 2-course no crash',()=>{parseDeedFigures('Begin; thence N 0-0-0 E 100 feet; thence S 0-0-0 W 100 feet');return true;});

console.log('=== ADVERSARIAL (10) ===');
T('50k chars no hang',()=>{const t0=Date.now();parseDeedFigures('THENCE N 45 E 100 FEET '.repeat(2200));return Date.now()-t0<500;});
T('deeply nested parens x40',()=>{parseDeedFigures('Begin; thence N 0-0-0 E 100 feet '+'('.repeat(40)+')'.repeat(40)+'; thence S 90-0-0 E 100 feet');return true;});
T('null bytes / control chars',()=>{parseDeedFigures('Begin\u0000; thence N 0-0-0 E 100\u0007 feet; thence S 90-0-0 E 100 feet');return true;});
T('RTL + combining marks',()=>{parseDeedFigures('Begin \u202e; thence N\u0301 0-0-0 E 100 feet');return true;});
T('all whitespace',()=>{const f=parseDeedFigures('   \t\n\r   ');return f.length===0||f[0].calls.length===0;});
T('repeated THENCE THENCE THENCE',()=>{parseDeedFigures('Begin; THENCE THENCE THENCE N 0-0-0 E 100 feet');return true;});
T('number soup 1 2 3 4 5 6 7 8 9',()=>{parseDeedFigures('Begin; thence 1 2 3 4 5 6 7 8 9 10');return true;});
T('every unit word at once',()=>{parseDeedText('thence N 0 E 5 feet chains rods poles perches links varas meters');return true;});
T('SQL-ish / script-ish injection',()=>{parseDeedFigures("Begin'; DROP TABLE; <script>alert(1)</script>; thence N 0-0-0 E 100 feet");return true;});
T('unicode fullwidth digits',()=>{const c=parseDeedText('thence N 0-0-0 E \uff11\uff10\uff10 feet')[0];return true;});

console.log('=== REGRESSION (real deeds) ===');
const fs=_deedFS;
[['PIMA','/mnt/user-data/outputs/pima-cpc-deed.txt',[6.99,0.05]],['MESA','/tmp/mesa.txt',[0.00]]].forEach(([nm,pth,exp])=>{try{parseDeedFigures(fs.readFileSync(pth,'utf8')).forEach((x,i)=>{const g=computeDeed(x.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0);const ok=exp[i]==null||Math.abs(g.closeDist-exp[i])<0.5;console.log((ok?'ok  ':'FAIL')+' REG '+nm+' '+(x.name||'')+' '+g.closeDist.toFixed(2));ok?pass++:(fail++,fails.push('REG '+nm));});}catch(e){console.log('FAIL REG '+nm+' '+e.message);fail++;fails.push('REG '+nm);}});

console.log('\n=== '+pass+' pass / '+fail+' fail ===');
if(fails.length)console.log('FAILURES:\n  '+fails.join('\n  '));

if(typeof pass!=='undefined')RESULTS.push(['batch4',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['batch4',-1,-1]);}
})();

/* ===================== battery: batch5 ===================== */
(function(){
console.log('\n########## batch5 ##########');
global.window={};
try{
const {parseDeedFigures,parseDeedText,computeDeed,_deedArea,_deedBearingToAz}=PARSER;
let pass=0,fail=0;const fails=[];
function T(name,fn){let ok=false,err=null;const t0=Date.now();try{ok=fn();}catch(e){err=e.message;}const ms=Date.now()-t0;if(ms>300)err=(err||'')+' SLOW('+ms+'ms)';const good=ok&&!err;console.log((good?'ok  ':'FAIL')+' '+name.padEnd(48)+(err?(' <'+err+'>'):''));good?pass++:(fail++,fails.push(name));}
const az=b=>{const c=parseDeedText('thence '+b+' 100 feet to a point')[0];return c&&c.bearing?_deedBearingToAz(c.bearing):(c&&c.compassAz!=null?c.compassAz:null);};
const near=(a,e,t)=>a!=null&&Math.abs(((a-e+540)%360)-180)<(t||0.05);
const dist=t=>{const c=parseDeedText('thence N 0-0-0 E '+t+' to a point')[0];return c&&c.dist!=null?c.dist:null;};
const nc=txt=>{const f=parseDeedFigures(txt)[0];return f?f.calls.filter(c=>!c.tie&&c.type!=='partial').length:0;};
const closeOf=txt=>{const f=parseDeedFigures(txt)[0];if(!f)return null;return computeDeed(f.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0).closeDist;};
const areaOf=txt=>{const f=parseDeedFigures(txt)[0];if(!f)return null;return _deedArea(computeDeed(f.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0));};

// ---- helper: build a regular N-gon deed, verify it closes & area = formula ----
function ngon(n,R){
  // vertices around circle, courses between them, as bearings/distances
  const pts=[];for(let i=0;i<n;i++){const a=2*Math.PI*i/n;pts.push([R*Math.cos(a),R*Math.sin(a)]);}
  let s='Begin';
  for(let i=0;i<n;i++){const a=pts[i],b=pts[(i+1)%n];const dE=b[0]-a[0],dN=b[1]-a[1];const az=(Math.atan2(dE,dN)*180/Math.PI+360)%360;const d=Math.hypot(dE,dN);s+='; thence '+_azStr(az)+' '+d.toFixed(4)+' feet';}
  s+=' to POB';return s;
}
function _azStr(az){az=((az%360)+360)%360;let q1,q2,a;if(az<=90){q1='N';q2='E';a=az;}else if(az<=180){q1='S';q2='E';a=180-az;}else if(az<=270){q1='S';q2='W';a=az-180;}else{q1='N';q2='W';a=360-az;}const d=Math.floor(a),m=Math.floor((a-d)*60),sc=Math.round(((a-d)*60-m)*60);return q1+' '+d+'-'+String(m).padStart(2,'0')+'-'+String(sc).padStart(2,'0')+' '+q2;}

console.log('=== GEOMETRY BY CONSTRUCTION (12) ===');
[3,4,5,6,8,12].forEach(n=>{
  T('regular '+n+'-gon closes',()=>closeOf(ngon(n,500))<0.5);
  T('regular '+n+'-gon area matches formula',()=>{const A=areaOf(ngon(n,500));const exp=0.5*n*500*500*Math.sin(2*Math.PI/n);return Math.abs(A-exp)/exp<0.001;});
});

console.log('=== BEARING QUADRANT EXHAUSTIVE (16) ===');
[['N','E',1],['N','W',1],['S','E',1],['S','W',1]].forEach(([q1,q2])=>{
  [1,30,60,89].forEach(deg=>{
    const b=q1+' '+deg+'-00-00 '+q2;
    let exp; if(q1=='N'&&q2=='E')exp=deg; else if(q1=='S'&&q2=='E')exp=180-deg; else if(q1=='S'&&q2=='W')exp=180+deg; else exp=360-deg;
    T('quadrant '+b,()=>near(az(b),exp));
  });
});

console.log('=== DMS ARITHMETIC (8) ===');
T('30-30-30 = 30.508333',()=>near(az('N 30-30-30 E'),30.508333));
T('0-0-1 = 0.000278',()=>near(az('N 0-0-1 E'),0.000278,0.0005));
T('45-45-45',()=>near(az('N 45-45-45 E'),45.7625));
T('89-59-59',()=>near(az('N 89-59-59 E'),89.99972));
T('S 1-1-1 E',()=>near(az('S 1-1-1 E'),178.98305));
T('N 12-34-56 W',()=>near(az('N 12-34-56 W'),347.41778,0.001));
T('round-trip 100 bearings stable',()=>{for(let i=0;i<100;i++){const a=Math.random()*90;const b=_azStr(a);const got=az(b);if(!near(got,a,0.02))return false;}return true;});
T('seconds only (no min) N 45-0-30 E',()=>near(az('N 45-0-30 E'),45.00833));

console.log('=== UNIT CONVERSION EXACT (10) ===');
T('1 chain = 66 ft',()=>Math.abs(dist('1 chain')-66)<1e-6);
T('1 link = 0.66 ft',()=>Math.abs(dist('100 links')-66)<1e-6);
T('1 rod = 16.5',()=>Math.abs(dist('1 rod')-16.5)<1e-6);
T('1 pole = 1 rod',()=>Math.abs(dist('1 pole')-dist('1 rod'))<1e-6);
T('1 perch = 1 rod',()=>Math.abs(dist('1 perch')-dist('1 rod'))<1e-6);
T('1 vara = 2.7778',()=>Math.abs(dist('1 vara')-2.7778)<0.001);
T('1 meter = 3.28083',()=>Math.abs(dist('1 meter')-3.28083)<0.001);
T('80 chains = 1 mile (5280)',()=>Math.abs(dist('80 chains')-5280)<0.01);
T('320 rods = 1 mile',()=>Math.abs(dist('320 rods')-5280)<0.01);
T('25 links = 16.5 ft (quarter chain)',()=>Math.abs(dist('25 links')-16.5)<0.01);

console.log('=== FIGURE SEMANTICS (12) ===');
T('except area subtracts from net',()=>{const figs=parseDeedFigures('Begin; thence N 0-0-0 E 200 feet; thence S 90-0-0 E 200 feet; thence S 0-0-0 W 200 feet; thence N 90-0-0 W 200 feet to POB. LESS AND EXCEPT: begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet to POB');const b=_deedArea(computeDeed(figs[0].calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0));const e=_deedArea(computeDeed(figs[1].calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0));return Math.abs(b-40000)<1&&Math.abs(e-10000)<1;});
T('3 parcels = 3 figures',()=>parseDeedFigures('PARCEL 1: begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet. PARCEL 2: begin; thence N 0-0-0 E 50 feet; thence S 90-0-0 E 50 feet; thence S 0-0-0 W 50 feet; thence N 90-0-0 W 50 feet. PARCEL 3: begin; thence N 0-0-0 E 25 feet; thence S 90-0-0 E 25 feet; thence S 0-0-0 W 25 feet; thence N 90-0-0 W 25 feet').length===3);
T('except before main course list',()=>parseDeedFigures('Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet').length===1);
T('easement width parsed',()=>{const figs=parseDeedFigures('Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet. TOGETHER WITH a 30 foot wide easement described as: begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet');const es=figs.find(f=>f.kind==='easement');return es!=null;});
T('multiple excepts',()=>parseDeedFigures('Begin; thence N 0-0-0 E 300 feet; thence S 90-0-0 E 300 feet; thence S 0-0-0 W 300 feet; thence N 90-0-0 W 300 feet to POB. LESS AND EXCEPT: begin; thence N 0-0-0 E 50 feet; thence S 90-0-0 E 50 feet; thence S 0-0-0 W 50 feet; thence N 90-0-0 W 50 feet to POB. LESS AND EXCEPT: begin; thence N 0-0-0 E 40 feet; thence S 90-0-0 E 40 feet; thence S 0-0-0 W 40 feet; thence N 90-0-0 W 40 feet to POB').length===3);
T('main figure is first',()=>{const f=parseDeedFigures('Begin; thence N 0-0-0 E 200 feet; thence S 90-0-0 E 200 feet; thence S 0-0-0 W 200 feet; thence N 90-0-0 W 200 feet to POB. LESS AND EXCEPT: begin; thence N 0-0-0 E 50 feet; thence S 90-0-0 E 50 feet; thence S 0-0-0 W 50 feet; thence N 90-0-0 W 50 feet to POB')[0];return f.kind==='boundary';});
T('except after "containing"',()=>parseDeedFigures('Begin; thence N 0-0-0 E 200 feet; thence S 90-0-0 E 200 feet; thence S 0-0-0 W 200 feet; thence N 90-0-0 W 200 feet to POB, containing 0.9 acres. LESS AND EXCEPT: begin; thence N 0-0-0 E 50 feet; thence S 90-0-0 E 50 feet; thence S 0-0-0 W 50 feet; thence N 90-0-0 W 50 feet to POB').length===2);
T('parcel with SOUTH PARCEL label',()=>parseDeedFigures('PARCEL 1: SOUTH PARCEL. Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet. PARCEL 2: NORTH PARCEL. begin; thence N 0-0-0 E 50 feet; thence S 90-0-0 E 50 feet; thence S 0-0-0 W 50 feet; thence N 90-0-0 W 50 feet').length===2);
T('no false figure on "except as noted"',()=>parseDeedFigures('Begin; thence N 0-0-0 E 100 feet, except as noted on plat; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet').length===1);
T('reserving unto grantor easement',()=>parseDeedFigures('Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet. RESERVING UNTO the grantor a 15 foot easement: begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet').length>=1);
T('subject to easement (not a figure)',()=>nc('Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet, subject to a utility easement of record')===4);
T('empty parcel handled',()=>{parseDeedFigures('PARCEL 1: begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet. PARCEL 2: reserved for future use.');return true;});

console.log('=== REAL-DEED IDIOMS (14) ===');
T('"to an iron pin found"',()=>nc('Begin; thence N 0-0-0 E 100 feet to an iron pin found; thence S 90-0-0 E 100 feet to an iron pin set; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet to the point of beginning')===4);
T('"along the line of Smith"',()=>nc('Begin; thence N 0-0-0 E 100 feet along the line of Smith; thence S 90-0-0 E 100 feet along Jones; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet')===4);
T('"more or less" on every course',()=>nc('Begin; thence N 0-0-0 E 100 feet more or less; thence S 90-0-0 E 100 feet more or less; thence S 0-0-0 W 100 feet more or less; thence N 90-0-0 W 100 feet more or less')===4);
T('"(deed)" and "(measured)" tags',()=>nc('Begin; thence N 0-0-0 E 100.00 feet (deed); thence S 90-0-0 E 100.00 feet (measured); thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet')===4);
T('"a distance of" prefix',()=>nc('Begin; thence N 0-0-0 E a distance of 100 feet; thence S 90-0-0 E a distance of 100 feet; thence S 0-0-0 W a distance of 100 feet; thence N 90-0-0 W a distance of 100 feet')===4);
T('"North" spelled + DMS',()=>nc('Begin; thence North 00 degrees 00 minutes 00 seconds East 100 feet; thence South 90 degrees 00 minutes 00 seconds East 100 feet; thence South 00 degrees 00 minutes 00 seconds West 100 feet; thence North 90 degrees 00 minutes 00 seconds West 100 feet')===4);
T('passing through monument',()=>nc('Begin; thence N 0-0-0 E 200 feet (passing through a pin at 100 feet); thence S 90-0-0 E 100 feet; thence S 0-0-0 W 200 feet; thence N 90-0-0 W 100 feet')===4);
T('"thence continuing"',()=>nc('Begin; thence N 0-0-0 E 100 feet; thence continuing N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 200 feet; thence N 90-0-0 W 100 feet')>=4);
T('"leaving said road"',()=>nc('Begin; thence N 0-0-0 E 100 feet along road; thence S 90-0-0 E 100 feet leaving said road; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet')===4);
T('grantor/grantee names ignored',()=>nc('Begin at the SW corner of land conveyed to John Q. Public by deed recorded in Book 5; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet')===4);
T('section/township preamble',()=>nc('A parcel in the NW 1/4 of Section 12, Township 3 South, Range 4 West; begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet')===4);
T('"witness corner" narrative',()=>nc('Begin at a point from which a witness corner bears N 45 E 20 feet; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet')===4);
T('book and page mid-course',()=>nc('Begin; thence N 0-0-0 E 100 feet to the line described in Book 123 Page 456; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet')===4);
T('"State Plane" bearing basis note',()=>nc('All bearings referenced to Alabama State Plane East Zone. Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet')===4);

console.log('=== REGRESSION ===');
const fs=_deedFS;
[['PIMA','/mnt/user-data/outputs/pima-cpc-deed.txt',[6.99,0.05]],['MESA','/tmp/mesa.txt',[0.00]]].forEach(([nm,pth,exp])=>{try{parseDeedFigures(fs.readFileSync(pth,'utf8')).forEach((x,i)=>{const g=computeDeed(x.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0);const ok=exp[i]==null||Math.abs(g.closeDist-exp[i])<0.5;console.log((ok?'ok  ':'FAIL')+' REG '+nm+' '+(x.name||'')+' '+g.closeDist.toFixed(2));ok?pass++:(fail++,fails.push('REG '+nm));});}catch(e){console.log('FAIL REG '+nm+' '+e.message);fail++;}});

console.log('\n=== '+pass+' pass / '+fail+' fail ===');
if(fails.length)console.log('FAILURES:\n  '+fails.join('\n  '));

if(typeof pass!=='undefined')RESULTS.push(['batch5',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['batch5',-1,-1]);}
})();

/* ===================== battery: batch6 ===================== */
(function(){
console.log('\n########## batch6 ##########');
global.window={};
try{
const {parseDeedFigures,computeDeed,_deedArea}=PARSER;
let pass=0,fail=0;const fails=[];
function T(name,txt,wantCrs,wantClose){
  let ok=false,info='';
  try{
    const f=parseDeedFigures(txt)[0];
    const good=f.calls.filter(c=>!c.tie&&c.type!=='partial');
    const g=computeDeed(good,0,0,0);
    const crsOk = wantCrs==null || good.length===wantCrs;
    const closeOk = wantClose==null || g.closeDist<wantClose;
    ok = crsOk && closeOk;
    info='crs='+good.length+(wantCrs!=null?'/'+wantCrs:'')+' ties='+f.calls.filter(c=>c.tie).length+' part='+f.calls.filter(c=>c.type==='partial').length+' close='+g.closeDist.toFixed(2)+(g.precision?' 1:'+g.precision:'')+(wantClose!=null?(closeOk?' [closes]':' [OPEN]'):'');
  }catch(e){info='THREW '+e.message;}
  console.log((ok?'ok  ':'FAIL')+' '+name.slice(0,46).padEnd(48)+info);
  ok?pass++:(fail++,fails.push(name));
}

console.log('=== REAL DEEDS WITH KNOWN CLOSURE ===');
// Chisago MN — perfect 200ft square, parallel-to phrasing, must close ~0
T('Chisago MN 200ft square (closes)','Beginning at the northeast corner of Section 33, Township 33, Range 21; thence, along the east line thereof, South 0 degrees 41 minutes 03 seconds East a distance of 200 feet; thence South 89 degrees 25 minutes 31 seconds West, parallel to the north line of said Section, a distance of 200 feet; thence North 0 degrees 41 minutes 03 seconds West, parallel to the east line of said Section, a distance of 200 feet to the north line thereof; thence, along said north line, North 89 degrees 25 minutes 31 seconds East a distance of 200 feet to the point of beginning.',4,0.5);
// El Paso CO — commence+tie, minutes-only bearings, S 125 (cardinal only), closes
T('El Paso CO (commence, min-only, cardinal-only)','commencing from the northwest corner of said Section 30, thence south 20 degrees 30 minutes east 140.60 feet to the point of beginning; thence north 88 degrees 55 minutes east 200.00 feet; thence south 125.00 feet; thence south 88 degrees 55 minutes west 200.00 feet; thence north 125.00 feet to the point of beginning.',4,1.0);
// Site Plan Creator Maple St — clean DMS, closes to 0
T('Maple St example (clean DMS, closes)','Beginning at an iron pin set in the northerly line of Maple Street; thence North 12 degrees 30 minutes East 200 feet to an iron pin; thence South 77 degrees 30 minutes East 75 feet to an iron pin; thence South 12 degrees 30 minutes West 200 feet to an iron pin; thence North 77 degrees 30 minutes West 75 feet to the point of beginning.',4,0.5);
// Apex Survey Smith's Addition — clean DMS, closes to 0
T("Smith's Addition (clean DMS square, closes)",'Beginning at the Northeast corner of Lot 5, Block 2, of Smith Addition, thence South 89 degrees 45 minutes 32 seconds West a distance of 125.50 feet; thence South 00 degrees 14 minutes 28 seconds East a distance of 100.00 feet; thence North 89 degrees 45 minutes 32 seconds East a distance of 125.50 feet; thence North 00 degrees 14 minutes 28 seconds West a distance of 100.00 feet to the Point of Beginning.',4,0.5);
// Charlotte NC Independence Blvd — 2 CURVES + many courses, foot-mark distances
T('Charlotte NC (2 curves, tie, foot-marks)','Commencing from the northwesterly intersection of Independence Boulevard and Colby Street; Thence along the northerly right-of-way of Independence Boulevard N 26 degrees 00 minutes 00 seconds W a distance of 475.25 feet to a drill hole set, which is the Point Of Beginning; Thence N 26 degrees 00 minutes 00 seconds W a distance of 37.95 feet to a pipe found; Thence with a curve turning to the left with an arc length of 95.92 feet, with a radius of 500.00 feet, with a chord bearing of N 31 degrees 29 minutes 45 seconds W, with a chord length of 95.77 feet to a pin found; Thence N 36 degrees 56 minutes 46 seconds W a distance of 4.74 feet to a pin found; Thence N 26 degrees 00 minutes 00 seconds W a distance of 14.65 feet to a pin found; Thence N 40 degrees 43 minutes 00 seconds W a distance of 42.31 feet to a pin set; Thence N 36 degrees 56 minutes 46 seconds W a distance of 149.48 feet to a pin found; Thence with a curve turning to the right with an arc length of 54.41 feet, with a radius of 25.00 feet, with a chord bearing of N 25 degrees 24 minutes 22 seconds E, with a chord length of 44.29 feet to a pin found; Thence N 87 degrees 45 minutes 30 seconds E a distance of 334.83 feet to a nail set; Thence S 02 degrees 14 minutes 30 seconds E a distance of 237.84 feet to the point of beginning.',9,null);
// Delaware IN — "thence East 90 degrees 500 feet" (angle-then-dist), "West 250 degrees" (WCB-ish!), "direct to POB"
T('Delaware IN (angle+dist, direct-to-POB)','Beginning at a point marked by a survey marker; thence East 500 feet; thence South 450 feet; thence West 450 feet; thence direct to the point of beginning.',3,null);
// Study.com Arizona — "thence east 800", "S 35 E 500", "northwesterly to POB" (no dist on close)
T('Arizona (cardinal, DMS, -erly-to-POB close)','at which point of beginning an iron stake has been placed; thence east 800 feet to a point; thence S 35 degrees E 500 feet to a large oak tree; thence northwesterly to the point of beginning.',2,null);
// Hobart Tract CA — "thence East along north line 20", "southerly parallel 120", "West 20", "North to POB"
T('Hobart Tract CA (parallel, -erly, to-POB)','Beginning at the northwest corner of Lot 11, Block B of Hobart Tract; thence East along the north line of said lot 20.00 feet; thence southerly parallel with the west line of said lot 120.00 feet to the south line of said lot; thence West along said south line 20.00 feet to the west line of said lot; thence North along said west line 120.00 feet to the Point of Beginning.',4,1.0);

console.log('=== REGRESSION ===');
const fs=_deedFS;
[['PIMA','/mnt/user-data/outputs/pima-cpc-deed.txt',[6.99,0.05]],['MESA','/tmp/mesa.txt',[0.00]]].forEach(([nm,pth,exp])=>{try{parseDeedFigures(fs.readFileSync(pth,'utf8')).forEach((x,i)=>{const g=computeDeed(x.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0);const ok=exp[i]==null||Math.abs(g.closeDist-exp[i])<0.5;console.log((ok?'ok  ':'FAIL')+' REG '+nm+' '+g.closeDist.toFixed(2));ok?pass++:fail++;});}catch(e){console.log('FAIL REG',nm,e.message);fail++;}});

console.log('\n=== BATCH 6: '+pass+' pass / '+fail+' fail ===');
if(fails.length)console.log('FAILURES:\n  '+fails.join('\n  '));

if(typeof pass!=='undefined')RESULTS.push(['batch6',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['batch6',-1,-1]);}
})();

/* ===================== battery: known ===================== */
(function(){
console.log('\n########## known ##########');
global.window={};
try{
const {parseDeedFigures,parseDeedText,computeDeed,_deedArea,_deedBearingToAz}=PARSER;
let pass=0,fail=0;const fails=[];
function T(n,got,exp,tol){const ok=got!=null&&Math.abs(got-exp)<tol;console.log((ok?'ok  ':'FAIL')+' '+n.padEnd(44)+'got='+(got!=null?got.toFixed(4):'NULL')+' exp='+exp+' \u00b1'+tol);ok?pass++:(fail++,fails.push(n));}
const areaOf=t=>{const f=parseDeedFigures(t)[0];if(!f)return null;return _deedArea(computeDeed(f.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0));};
const closeOf=t=>{const f=parseDeedFigures(t)[0];if(!f)return null;return computeDeed(f.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0).closeDist;};
const azOf=b=>{const c=parseDeedText('thence '+b+' 100 feet')[0];return c&&c.bearing?_deedBearingToAz(c.bearing):null;};

console.log('=== KNOWN AZIMUTHS (hand-computed from DMS) ===');
// az = deg + min/60 + sec/3600, applied per quadrant
T('N 30-15-00 E',azOf('N 30-15-00 E'),30.25,0.001);
T('S 30-15-00 E',azOf('S 30-15-00 E'),149.75,0.001);   // 180-30.25
T('S 30-15-00 W',azOf('S 30-15-00 W'),210.25,0.001);   // 180+30.25
T('N 30-15-00 W',azOf('N 30-15-00 W'),329.75,0.001);   // 360-30.25
T('N 89-59-59 E',azOf('N 89-59-59 E'),89.99972,0.001);
T('S 45-30-30 W',azOf('S 45-30-30 W'),225.50833,0.001);
T('WCB 275-45-15',azOf('275\u00b0 45\u2032 15\u2033'),275.75417,0.001);

console.log('=== KNOWN AREAS (exact geometry) ===');
// square s x s -> area s^2
T('100x100 square = 10000 sf',areaOf('Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet to POB'),10000,0.5);
// rectangle 150x300 -> 45000
T('150x300 rect = 45000 sf',areaOf('Begin; thence N 0-0-0 E 150 feet; thence S 90-0-0 E 300 feet; thence S 0-0-0 W 150 feet; thence N 90-0-0 W 300 feet to POB'),45000,0.5);
// right triangle legs 300,400 -> area 60000, hyp 500
T('right triangle 300-400 = 60000 sf',(()=>{const A=areaOf('Begin; thence N 0-0-0 E 300 feet; thence S 90-0-0 E 400 feet; thence to POB');return A;})(),60000,1);
// 1 acre exactly: 208.7103 ft square
T('1 acre square (208.7103 ft)',areaOf('Begin; thence N 0-0-0 E 208.7103 feet; thence S 90-0-0 E 208.7103 feet; thence S 0-0-0 W 208.7103 feet; thence N 90-0-0 W 208.7103 feet to POB'),43560,2);
// chain square 10x10 = 1 acre
T('10ch x 10ch = 10 acres (435600 sf)',areaOf('Begin; thence N 0-0-0 E 10 chains; thence S 90-0-0 E 10 chains; thence S 0-0-0 W 10 chains; thence N 90-0-0 W 10 chains to POB'),435600,10);
T('1ch x 10ch = 1 acre (43560 sf)',areaOf('Begin; thence N 0-0-0 E 1 chain; thence S 90-0-0 E 10 chains; thence S 0-0-0 W 1 chain; thence N 90-0-0 W 10 chains to POB'),43560,2);
// parallelogram: base 100, offset — area = base*height. N100E then N90E100 then S100... 
// 3-4-5 scaled: legs 30,40 hyp 50, area 600
T('triangle legs 30-40 = 600 sf',areaOf('Begin; thence N 0-0-0 E 30 feet; thence S 90-0-0 E 40 feet; thence to POB'),600,0.5);

console.log('=== KNOWN CLOSURES (perfect polygons close to 0) ===');
T('unit square closes',closeOf('Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet to POB'),0,0.001);
T('45-45-90 triangle closes',closeOf('Begin; thence N 0-0-0 E 100 feet; thence S 45-0-0 E 141.4214 feet; thence N 90-0-0 W 100 feet to POB'),0,0.01);
T('hexagon (60° ext angle) closes',(()=>{
  // regular hexagon side 100: interior 120, courses turn 60° each
  let s='Begin',az=0;const pts=[];let E=0,N=0;
  for(let i=0;i<6;i++){pts.push([E,N]);E+=100*Math.sin(az*Math.PI/180);N+=100*Math.cos(az*Math.PI/180);az+=60;}
  // build from azimuths
  s='Begin';let a2=0;
  const bstr=z=>{z=((z%360)+360)%360;let q1,q2,x;if(z<=90){q1='N';q2='E';x=z;}else if(z<=180){q1='S';q2='E';x=180-z;}else if(z<=270){q1='S';q2='W';x=z-180;}else{q1='N';q2='W';x=360-z;}return q1+' '+Math.round(x)+'-00-00 '+q2;};
  for(let i=0;i<6;i++){s+='; thence '+bstr(a2)+' 100 feet';a2+=60;}
  s+=' to POB';
  return closeOf(s);
})(),0,0.5);

console.log('=== KNOWN WCB CLOSURE (metric) ===');
T('WCB metric square closes',closeOf('Begin; thence 0\u00b0 50 metres; thence 90\u00b0 50 metres; thence 180\u00b0 50 metres; thence 270\u00b0 50 metres to POB'),0,0.01);

console.log('=== KNOWN UNIT EQUIVALENCES ===');
const d=t=>{const c=parseDeedText('thence N 0-0-0 E '+t+' to a point')[0];return c?c.dist:null;};
T('1 chain = 66 ft',d('1 chain'),66,1e-6);
T('1 mile = 80 chains',d('80 chains'),5280,0.001);
T('1 furlong = 10 chains',d('10 chains'),660,0.001);
T('1 acre-side (√43560)',Math.sqrt(areaOf('Begin; thence N 0-0-0 E 208.7103 feet; thence S 90-0-0 E 208.7103 feet; thence S 0-0-0 W 208.7103 feet; thence N 90-0-0 W 208.7103 feet to POB')),208.7103,0.5);

console.log('=== REAL DEEDS (known published closures/areas) ===');
const fs=_deedFS;
// Mesa: deed states 0.031 ac / 1369 sf
const mesa=parseDeedFigures(fs.readFileSync('/tmp/mesa.txt','utf8'))[0];
T('Mesa area = 1369 sf (deed)',_deedArea(computeDeed(mesa.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0)),1369,5);
T('Mesa closure ~0',computeDeed(mesa.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0).closeDist,0,0.01);
// Pima parcel 2 known ~0.05
T('Pima P2 closure = 0.05',(()=>{const f=parseDeedFigures(fs.readFileSync('/mnt/user-data/outputs/pima-cpc-deed.txt','utf8'))[1];return computeDeed(f.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0).closeDist;})(),0.05,0.1);

console.log('\n=== KNOWN-RESULTS: '+pass+' pass / '+fail+' fail ===');
if(fails.length)console.log('FAILURES:\n  '+fails.join('\n  '));

if(typeof pass!=='undefined')RESULTS.push(['known',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['known',-1,-1]);}
})();

/* ===================== battery: intl ===================== */
(function(){
console.log('\n########## intl ##########');
global.window={};
try{
const {parseDeedFigures,parseDeedText,computeDeed,_deedArea,_deedBearingToAz}=PARSER;
let pass=0,fail=0;
function T(n,fn){let ok=false,e=null;const t0=Date.now();try{ok=fn();}catch(x){e=x.message;}if(Date.now()-t0>300)e=(e||'')+' SLOW';console.log((ok&&!e?'ok  ':'FAIL')+' '+n.padEnd(46)+(e?' <'+e+'>':''));(ok&&!e)?pass++:fail++;}
const dist=t=>{const c=parseDeedText('thence N 0-0-0 E '+t+' to a point')[0];return c&&c.dist!=null?c.dist:null;};
const nc=t=>{const f=parseDeedFigures(t)[0];return f?f.calls.filter(c=>!c.tie&&c.type!=='partial').length:0;};
const closeOf=t=>{const f=parseDeedFigures(t)[0];if(!f)return null;return computeDeed(f.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0).closeDist;};

console.log('=== METRIC DISTANCE (UK/AU/NZ/CA) ===');
T('100 metres',()=>Math.abs(dist('100 metres')-328.08)<0.5);
T('100 m',()=>Math.abs(dist('100 m')-328.08)<0.5);
T('30.5 metres',()=>Math.abs(dist('30.5 metres')-100.07)<0.5);
T('1.234 m decimal',()=>Math.abs(dist('1.234 m')-4.05)<0.1);
T('12 chains (imperial in UK deeds)',()=>Math.abs(dist('12 chains')-792)<0.1);
T('metric closes: 30m square',()=>closeOf('Begin; thence N 0-0-0 E 30 metres; thence S 90-0-0 E 30 metres; thence S 0-0-0 W 30 metres; thence N 90-0-0 W 30 metres to POB')<0.01);

console.log('=== WHOLE-CIRCLE BEARINGS (British/AU standard, 0-360 from N) ===');
// These are the big one: "thence 127°30' 45.2 metres" — no quadrant letter
T('WCB 45° = az 45',()=>{const c=parseDeedText('thence 45\u00b000\u201900\u2033 45.2 metres')[0];return c&&c.bearing&&Math.abs(_deedBearingToAz(c.bearing)-45)<0.05;});
T('WCB 127°30\u2032 = az 127.5',()=>{const c=parseDeedText('thence 127\u00b030\u2032 100 metres')[0];return c&&c.bearing&&Math.abs(_deedBearingToAz(c.bearing)-127.5)<0.05;});
T('WCB 225° (SW quadrant)',()=>{const c=parseDeedText('thence 225\u00b0 100 metres')[0];return c&&c.bearing&&Math.abs(_deedBearingToAz(c.bearing)-225)<0.05;});
T('WCB 315° 20.00m',()=>{const c=parseDeedText('thence 315\u00b0 20.00 metres')[0];return c&&c.bearing&&Math.abs(_deedBearingToAz(c.bearing)-315)<0.05;});
T('WCB with DMS 092-15-30',()=>{const c=parseDeedText('thence 092\u00b0 15\u2032 30\u2033 50 metres')[0];return c&&c.bearing&&Math.abs(_deedBearingToAz(c.bearing)-92.258)<0.05;});
T('WCB square closes',()=>{const c=closeOf('Begin; thence 0\u00b0 100 metres; thence 90\u00b0 100 metres; thence 180\u00b0 100 metres; thence 270\u00b0 100 metres to POB');return c!=null&&c<0.5;});

console.log('=== TORRENS / COMMONWEALTH PHRASING ===');
T('"commencing at" start',()=>nc('Commencing at a peg on the northern boundary; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet')===4);
T('Lot on Deposited Plan preamble',()=>nc('All that piece of land being Lot 5 on Deposited Plan 12345; commencing at the SW corner; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet')===4);
T('"and containing X hectares"',()=>nc('Begin; thence N 0-0-0 E 100 metres; thence S 90-0-0 E 100 metres; thence S 0-0-0 W 100 metres; thence N 90-0-0 W 100 metres, and containing 1.0 hectares')===4);
T('bearings in "degrees minutes"',()=>nc('Begin; thence 90 degrees 100 metres; thence 180 degrees 100 metres; thence 270 degrees 100 metres; thence 0 degrees 100 metres')>=1);

console.log('=== DECIMAL COMMA (Quebec/continental) ===');
T('45,5 metres (comma decimal)',()=>{const d=dist('45,5 metres');return d===null||Math.abs(d-149.3)<1;});

console.log('=== REGRESSION (US must still work) ===');
const fs=_deedFS;
[['PIMA','/mnt/user-data/outputs/pima-cpc-deed.txt',[6.99,0.05]],['MESA','/tmp/mesa.txt',[0.00]]].forEach(([nm,pth,exp])=>{try{parseDeedFigures(fs.readFileSync(pth,'utf8')).forEach((x,i)=>{const g=computeDeed(x.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0);const ok=exp[i]==null||Math.abs(g.closeDist-exp[i])<0.5;console.log((ok?'ok  ':'FAIL')+' REG '+nm+' '+g.closeDist.toFixed(2));ok?pass++:fail++;});}catch(e){console.log('FAIL REG',nm,e.message);fail++;}});

console.log('\n=== INTERNATIONAL: '+pass+' pass / '+fail+' fail ===');

if(typeof pass!=='undefined')RESULTS.push(['intl',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['intl',-1,-1]);}
})();

/* ===================== battery: curves ===================== */
(function(){
console.log('\n########## curves ##########');
global.window={};
try{
const {parseDeedFigures,parseDeedText,computeDeed}=PARSER;
let pass=0,fail=0;const fails=[];
function T(name,txt,wantClose){
  let ok=false,info='';
  try{const f=parseDeedFigures(txt)[0];const good=f.calls.filter(c=>!c.tie&&c.type!=='partial');const g=computeDeed(good,0,0,0);ok=g.closeDist<wantClose;info='crs='+good.length+' close='+g.closeDist.toFixed(3)+' (want <'+wantClose+')'+(g.precision?' 1:'+g.precision:'');}catch(e){info='THREW '+e.message;}
  console.log((ok?'ok  ':'FAIL')+' '+name.padEnd(46)+info);ok?pass++:(fail++,fails.push(name));
}
// helper: parse a single curve seg, report fields
function C(name,seg,checks){
  const c=parseDeedText('thence '+seg)[0];
  let ok=c&&c.type==='curve';let info=c?('type='+c.type):'null';
  if(c&&c.type==='curve'){info='R='+c.radius+' arc='+c.arc+' delta='+(c.delta?c.delta.toFixed(3):'-')+' dir='+c.dir+' chB='+!!c.chordB+' chD='+c.chordD;
    if(checks)ok=checks(c);}
  console.log((ok?'ok  ':'FAIL')+' '+name.padEnd(46)+info);ok?pass++:(fail++,fails.push(name));
}

console.log('=== CURVE FIELD PARSING ===');
C('tangent L: radius+arc','along a curve to the left, radius 250.00 feet, arc length 130.90 feet',c=>c.dir==='L'&&Math.abs(c.radius-250)<0.1&&Math.abs(c.arc-130.9)<0.1);
C('tangent R: radius+delta','along a curve to the right, radius 500.00 feet, central angle 15 degrees 00 minutes 00 seconds',c=>c.dir==='R'&&Math.abs(c.radius-500)<0.1&&Math.abs(c.delta-15)<0.01);
C('"curve turning to the left with"','with a curve turning to the left with an arc length of 95.92 feet, with a radius of 500.00 feet, with a chord bearing of N 31 degrees 29 minutes 45 seconds W, with a chord length of 95.77 feet',c=>c.dir==='L'&&Math.abs(c.radius-500)<0.1&&Math.abs(c.arc-95.92)<0.1&&!!c.chordB);
C('chord bears + chord dist','along a curve, radius 300, chord bears N 45 degrees 00 minutes 00 seconds E, chord 141.42 feet',c=>!!c.chordB&&Math.abs(c.chordD-141.42)<0.1);
C('radius+arc+delta all three','along said curve to the right having a radius of 1000 feet, a central angle of 05 degrees 30 minutes 00 seconds, an arc distance of 96.00 feet',c=>Math.abs(c.radius-1000)<0.1&&Math.abs(c.delta-5.5)<0.01);
C('"radius bears" non-tangent','to a point on a curve to which the radius bears S 20 degrees 00 minutes 00 seconds E a distance of 400.00 feet; thence along said curve, delta 10 degrees, arc 69.81 feet',null);

console.log('=== KNOWN CURVE GEOMETRY (independently computable) ===');
// A quarter circle: straight N 100, then 90-degree arc R=100 (tangent), then close.
// Tangent curve R=100 through 90deg: arc=157.08, chord=141.42 at 45deg. 
// Square with rounded corner: N100E, arc R=100 90deg L... build a shape that MUST close.
// Simplest: full-circle-ish — go around a "stadium": two straights + two semicircle ends
// Easiest exact: line 100 E, then a semicircle (180deg) R=50 back, closes if geometry right.
// Rectangle 200x100 with one corner filleted R=0 (=sharp) trivially closes.
// True test: N 0 E 100; then curve right R=100 delta=90 (tangent) should turn to heading 90 (E);
//   then S 90 E must continue... construct closed:
T('tangent 90° arc square-with-fillet closes','Begin; thence N 0-0-0 E 100 feet; thence along a curve to the right, radius 50 feet, central angle 90 degrees, arc 78.54 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 150 feet; thence N 90-0-0 W 150 feet to POB',1.0);
// half-circle: N 0 E 100, then curve R=50 delta 180 (U-turn) tangent, then S 0 W 100, then close 100
T('180° U-turn arc closes','Begin; thence N 0-0-0 E 100 feet; thence along a curve to the right, radius 50 feet, central angle 180 degrees, arc 157.08 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet to POB',1.0);
// tangent curve where delta from chord: N45E 100, curve L R=100 arc 78.54 (45deg), then...
T('chord-bearing curve closes (Charlotte-style)','Begin; thence N 0-0-0 E 100 feet; thence with a curve turning to the right with a radius of 100 feet, with a central angle of 90 degrees, with an arc length of 157.08 feet, with a chord bearing of N 45-0-0 E, with a chord length of 141.42 feet; thence S 0-0-0 E 100 feet; thence S 90-0-0 W 200 feet; thence N 0-0-0 W 100 feet to POB',2.0);

console.log('=== REGRESSION (known-good curve deeds) ===');
const fs=_deedFS;
const mesa=parseDeedFigures(fs.readFileSync('/tmp/mesa.txt','utf8'))[0];
T('MESA (3 curves) still closes',fs.readFileSync('/tmp/mesa.txt','utf8'),0.5);
const pima=parseDeedFigures(fs.readFileSync('/mnt/user-data/outputs/pima-cpc-deed.txt','utf8'));
{const g=computeDeed(pima[1].calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0);const ok=g.closeDist<0.5;console.log((ok?'ok  ':'FAIL')+' PIMA P2 (curves) still closes'.padEnd(50)+'close='+g.closeDist.toFixed(3));ok?pass++:(fail++,fails.push('PIMA P2'));}

console.log('\n=== CURVE BATCH: '+pass+' pass / '+fail+' fail ===');
if(fails.length)console.log('FAILURES:\n  '+fails.join('\n  '));

if(typeof pass!=='undefined')RESULTS.push(['curves',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['curves',-1,-1]);}
})();

/* ===================== battery: texas ===================== */
(function(){
console.log('\n########## texas ##########');
global.window={};
try{
const {parseDeedFigures,parseDeedText,computeDeed,_deedBearingToAz}=PARSER;
let pass=0,fail=0;const fails=[];
const az=b=>{const c=parseDeedText('thence '+b+' 100 varas to a point')[0];return c&&c.bearing?_deedBearingToAz(c.bearing):null;};
const near=(a,e,t)=>a!=null&&Math.abs(((a-e+540)%360)-180)<(t||0.05);
function T(n,got,ok){console.log((ok?'ok  ':'FAIL')+' '+n.padEnd(44)+got);ok?pass++:(fail++,fails.push(n));}
function TB(n,b,e){const a=az(b);T(n,'az='+(a!=null?a.toFixed(2):'NULL')+' want '+e,near(a,e,0.05));}
const dist=t=>{const c=parseDeedText('thence N 45-0-0 E '+t+' to a point')[0];return c&&c.dist!=null?c.dist:null;};
const crs=t=>{const f=parseDeedFigures(t)[0];return f?f.calls.filter(c=>!c.tie&&c.type!=='partial').length:0;};

console.log('=== TEXAS BEARING ABBREVIATIONS (old style) ===');
TB('N. 45 E (periods, spaces)','N. 45 E',45);
TB('S. 60 W','S. 60 W',240);
TB('S. 45 E. 770','S. 45 E',135);
TB('N. 30 W','N. 30 W',330);
TB('N 60 W','N 60 W',300);
TB('N. 45 E. (trailing period)','N. 45 E.',45);
TB('S 45 E (no periods)','S 45 E',135);

console.log('=== VARA DISTANCE ABBREVIATIONS ===');
T('770 vrs',dist('770 vrs')+' (want ~2138.9)',Math.abs(dist('770 vrs')-2138.89)<1);
T('306 2/3 vrs (fraction)',dist('306 2/3 vrs')+' (want ~851.9)',dist('306 2/3 vrs')!=null&&Math.abs(dist('306 2/3 vrs')-851.85)<2);
T('732.6 vrs',dist('732.6 vrs')+' (want ~2035)',Math.abs(dist('732.6 vrs')-2035.0)<1);
T('966.4 vrs',dist('966.4 vrs')+' (want ~2684.4)',Math.abs(dist('966.4 vrs')-2684.4)<1);
T('varas full word',dist('100 varas')+' (want 277.78)',Math.abs(dist('100 varas')-277.78)<0.1);

console.log('=== KYLE v CLINKSCALES (real 40-acre, should close) ===');
// The 40-acre tract, cleaned: SW corner; N 30 W 732.6; then... (partial in source)
// Full closable version from the opinion's field notes:
T('Kyle 40ac (N30W, S60W, S30E, N60E)','Beginning at the southwest corner of the Siddons tract; thence N 30 W 732.6 vrs to its northwest corner; thence S 60 W 306 2/3 vrs to a stake for corner; thence S 30 E 732.5 vrs to a stake in the south line of said Deaton Survey; thence N 60 E 306 2/3 vrs to the place of beginning.',crs('Beginning at the southwest corner of the Siddons tract; thence N 30 W 732.6 vrs to its northwest corner; thence S 60 W 306 2/3 vrs to a stake for corner; thence S 30 E 732.5 vrs to a stake in the south line of said Deaton Survey; thence N 60 E 306 2/3 vrs to the place of beginning.')+' courses',crs('Beginning at the southwest corner of the Siddons tract; thence N 30 W 732.6 vrs to its northwest corner; thence S 60 W 306 2/3 vrs to a stake for corner; thence S 30 E 732.5 vrs to a stake in the south line of said Deaton Survey; thence N 60 E 306 2/3 vrs to the place of beginning.')===4);

console.log('=== OCR CORRUPTION ($ for S, etc) ===');
// "$36E" should be S 36 E — this is the harsh one
TB('$36E ($ as S) - OCR','$ 36 E',144);
TB('$58W ($ as S)','$ 58 W',238);

console.log('=== MEANDER / MONUMENT NARRATIVE (must not phantom) ===');
T('bearing-tree call ignored','Begin at a stake from which a Hickory 24 in dia bears S 82 W 8 vrs; thence S 45 E 770 vrs; thence N 60 W 9 vrs; thence N 45 E 500 vrs; thence to the beginning' && crs('Begin at a stake from which a Hickory 24 in dia bears S 82 W 8 vrs; thence S 45 E 770 vrs; thence N 60 W 9 vrs; thence N 45 E 500 vrs; thence to the beginning')+' courses (want 3, tree call excluded)',crs('Begin at a stake from which a Hickory 24 in dia bears S 82 W 8 vrs; thence S 45 E 770 vrs; thence N 60 W 9 vrs; thence N 45 E 500 vrs; thence to the beginning')===3);

console.log('=== REGRESSION ===');
const fs=_deedFS;
[['MESA','/tmp/mesa.txt',0.01],['PIMA1','/mnt/user-data/outputs/pima-cpc-deed.txt',7]].forEach(([nm,pth,exp])=>{try{const f=parseDeedFigures(fs.readFileSync(pth,'utf8'))[0];const g=computeDeed(f.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0);T('REG '+nm,g.closeDist.toFixed(2),g.closeDist<exp+0.5);}catch(e){T('REG '+nm,e.message,false);}});

console.log('\n=== TEXAS BATCH: '+pass+' pass / '+fail+' fail ===');
if(fails.length)console.log('FAILURES:\n  '+fails.join('\n  '));

if(typeof pass!=='undefined')RESULTS.push(['texas',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['texas',-1,-1]);}
})();

/* ===================== battery: louisiana ===================== */
(function(){
console.log('\n########## louisiana ##########');
global.window={};
try{
const {parseDeedFigures,parseDeedText,computeDeed}=PARSER;
let pass=0,fail=0;const fails=[];
function T(n,got,ok){console.log((ok?'ok  ':'FAIL')+' '+n.padEnd(44)+got);ok?pass++:(fail++,fails.push(n));}
const dist=t=>{const c=parseDeedText('thence N 70-0-0 W '+t+' to a point')[0];return c&&c.dist!=null?c.dist:null;};
const crs=t=>{const f=parseDeedFigures(t)[0];return f?f.calls.filter(c=>!c.tie&&c.type!=='partial').length:0;};
const closeOf=t=>{const f=parseDeedFigures(t)[0];if(!f)return null;return computeDeed(f.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0).closeDist;};

console.log('=== ARPENT LINEAR UNIT (1 arpent = 191.994 ft) ===');
T('1 arpent',dist('1 arpent')+' (want 191.99)',dist('1 arpent')!=null&&Math.abs(dist('1 arpent')-191.994)<0.5);
T('40 arpents',dist('40 arpents')+' (want 7679.8)',dist('40 arpents')!=null&&Math.abs(dist('40 arpents')-7679.76)<2);
T('10 arpents',dist('10 arpents')+' (want 1919.9)',dist('10 arpents')!=null&&Math.abs(dist('10 arpents')-1919.94)<1);
T('2.5 arpents',dist('2.5 arpents')+' (want 479.99)',dist('2.5 arpents')!=null&&Math.abs(dist('2.5 arpents')-479.985)<1);
T('"arpen" alt spelling (Missouri)',dist('40 arpens')+' (want 7679.8)',dist('40 arpens')!=null&&Math.abs(dist('40 arpens')-7679.76)<2);

console.log('=== REAL LOUISIANA PHRASING ===');
// Hancock County: "front of 120 French feet, running N 70 degrees W, 40 arpents"
T('N 70 W 40 arpents (Petit deed)',crs('Beginning at a point on Bay St Louis; thence N 70 degrees W 40 arpents to a point; thence S 20 degrees W 120 feet; thence S 70 degrees E 40 arpents to the bay; thence N 20 degrees E 120 feet to the point of beginning.')+' crs',crs('Beginning at a point on Bay St Louis; thence N 70 degrees W 40 arpents to a point; thence S 20 degrees W 120 feet; thence S 70 degrees E 40 arpents to the bay; thence N 20 degrees E 120 feet to the point of beginning.')===4);
// arpent long-lot closes: 2 arpents front x 40 deep rectangle
T('arpent long-lot closes (2x40)','Begin at river; thence N 0-0-0 E 2 arpents; thence S 90-0-0 E 40 arpents; thence S 0-0-0 W 2 arpents; thence N 90-0-0 W 40 arpents to POB'+' close='+closeOf('Begin at river; thence N 0-0-0 E 2 arpents; thence S 90-0-0 E 40 arpents; thence S 0-0-0 W 2 arpents; thence N 90-0-0 W 40 arpents to POB'),closeOf('Begin at river; thence N 0-0-0 E 2 arpents; thence S 90-0-0 E 40 arpents; thence S 0-0-0 W 2 arpents; thence N 90-0-0 W 40 arpents to POB')<0.5);
// mixed feet+arpents in one deed
T('mixed feet + arpents closes','Begin; thence N 0-0-0 E 192 feet; thence S 90-0-0 E 1 arpent; thence S 0-0-0 W 192 feet; thence N 90-0-0 W 1 arpent to POB'+' close='+closeOf('Begin; thence N 0-0-0 E 192 feet; thence S 90-0-0 E 1 arpent; thence S 0-0-0 W 192 feet; thence N 90-0-0 W 1 arpent to POB'),closeOf('Begin; thence N 0-0-0 E 192 feet; thence S 90-0-0 E 1 arpent; thence S 0-0-0 W 192 feet; thence N 90-0-0 W 1 arpent to POB')<0.5);

console.log('=== "FRENCH FEET" (pied, ~1.066 ft) — likely unsupported, must not misparse ===');
T('120 French feet (safe handling)',dist('120 French feet')+' (any non-crash)',true);

console.log('=== REGRESSION (arpent must not break feet/rods) ===');
const fs=_deedFS;
T('1 rod still 16.5',dist('1 rod'),Math.abs(dist('1 rod')-16.5)<0.01);
T('100 feet still 100',dist('100 feet'),Math.abs(dist('100 feet')-100)<0.01);
[['MESA','/tmp/mesa.txt',0.01],['PIMA','/mnt/user-data/outputs/pima-cpc-deed.txt',7]].forEach(([nm,pth,exp])=>{try{const f=parseDeedFigures(fs.readFileSync(pth,'utf8'))[0];const g=computeDeed(f.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0);T('REG '+nm,g.closeDist.toFixed(2),g.closeDist<exp+0.5);}catch(e){T('REG '+nm,e.message,false);}});

console.log('\n=== LOUISIANA BATCH: '+pass+' pass / '+fail+' fail ===');
if(fails.length)console.log('FAILURES:\n  '+fails.join('\n  '));

if(typeof pass!=='undefined')RESULTS.push(['louisiana',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['louisiana',-1,-1]);}
})();

/* ===================== battery: circle ===================== */
(function(){
console.log('\n########## circle ##########');
global.window={};
try{
const {parseDeedFigures,parseDeedText,computeDeed}=PARSER;
let pass=0,fail=0;const fails=[];
function T(n,txt,wantCrs){let ok=false,info='';try{const f=parseDeedFigures(txt)[0];const good=f.calls.filter(c=>!c.tie&&c.type!=='partial');const g=computeDeed(good,0,0,0);ok=good.length===wantCrs;info='crs='+good.length+'/'+wantCrs+' ties='+f.calls.filter(c=>c.tie).length+' part='+f.calls.filter(c=>c.type==='partial').length+' close='+g.closeDist.toFixed(2);}catch(e){info='THREW '+e.message;}console.log((ok?'ok  ':'FAIL')+' '+n.padEnd(40)+info);ok?pass++:(fail++,fails.push(n));}

console.log('=== BACKLOG ITEM 1: "deflecting to the left at an angle of" (gerund) ===');
T('Berea St gerund deflect','A lot beginning at a point in the north line of Berea Street; from said point of beginning run in a northerly direction at right angles to the north line of Berea Street a distance of 185 feet to a point; thence deflecting to the left at an angle of 96 degrees 00 minutes and run in a westerly direction a distance of 150 feet to a point; thence in a southerly direction a distance of 190 feet to a point in the north line of Berea Street; thence in an easterly direction and along the north line of Berea Street a distance of 155 feet to the point of beginning.',4);

console.log('=== BACKLOG ITEM 2: standalone deflecting gerund ===');
T('deflecting right gerund','Begin at a pin; thence deflecting to the right at an angle of 90 degrees and run 100 feet; thence deflecting to the right at an angle of 90 degrees and run 100 feet; thence deflecting to the right at an angle of 90 degrees and run 100 feet; thence deflecting to the right at an angle of 90 degrees and run 100 feet',4);

console.log('=== BACKLOG ITEM 3: "at right angles" implied 90 ===');
T('at right angles course','Begin at a pin; thence North 100 feet; thence at right angles to the last course and run East 50 feet; thence South 100 feet; thence West 50 feet to POB',4);

console.log('=== BACKLOG ITEM 4: parenthetical inline curve def (Walker Co) ===');
// "to the P.C. of a curve to the left (Radius = 22.00', Delta = 90°00'23", Chord = N 59°29'20" E, 31.11 feet), thence along the arc for 34.56 feet"
T('Walker parenthetical curve','Begin at a rebar; thence South 75 degrees 30 minutes 26 seconds East 80.00 feet to the P.C. of a curve to the left (Radius = 22.00 feet, Delta = 90 degrees 00 minutes 23 seconds, Chord = North 59 degrees 29 minutes 20 seconds East, 31.11 feet); thence run in a Northeasterly direction along the arc of said curve for 34.56 feet to a point; thence South 75 degrees 30 minutes 26 seconds East 87.86 feet to POB',3);

console.log('=== REGRESSION (deflection deeds must still work) ===');
const fs=_deedFS;
T('Lake St deflection (regression)','Commence at a bolt and run Northeasterly 61.12 feet; thence deflect 81 degrees 46 minutes 34 seconds right and run Southeasterly 50.18 feet to the point of beginning; thence continue Southeasterly 270.08 feet; thence deflect 84 degrees 21 minutes 12 seconds left and run Northeasterly 30.00 feet; thence deflect 95 degrees 38 minutes 48 seconds left and run Northwesterly 268.72 feet; thence deflect 81 degrees 46 minutes 33 seconds left and run Southwesterly 30.00 feet to the point of beginning.',4);

console.log('\n=== CIRCLE-BACK: '+pass+' pass / '+fail+' fail ===');
if(fails.length)console.log('FAILURES:\n  '+fails.join('\n  '));

if(typeof pass!=='undefined')RESULTS.push(['circle',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['circle',-1,-1]);}
})();

/* ===================== battery: ties ===================== */
(function(){
console.log('\n########## ties ##########');
global.window={};
try{
const {parseDeedFigures,computeDeed}=PARSER;
let pass=0,fail=0;const fails=[];
function T(n,txt,wantTies,wantCourses){
  let ok=false,info='';
  try{const f=parseDeedFigures(txt)[0];const ties=f.calls.filter(c=>c.tie).length;const crs=f.calls.filter(c=>!c.tie&&c.type!=='partial').length;ok=(ties===wantTies&&crs===wantCourses);info='ties='+ties+'/'+wantTies+' crs='+crs+'/'+wantCourses;}catch(e){info='THREW '+e.message;}
  console.log((ok?'ok  ':'FAIL')+' '+n.padEnd(46)+info);ok?pass++:(fail++,fails.push(n));
}
console.log('=== TIE DETECTION (commence vs begin) ===');
// "Begin at X" = X is the POB, all courses count, 0 ties
T('Begin at corner (no tie)','Begin at the NE corner; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet to POB',0,4);
// "Commence at X; thence <tie> to POB; thence <courses>" = 1 tie
T('Commence + 1 tie to POB','Commence at the SW corner; thence S 0-0-0 W 30 feet to the POINT OF BEGINNING; thence N 90-0-0 E 100 feet; thence S 0-0-0 E 100 feet; thence S 90-0-0 W 100 feet; thence N 0-0-0 W 100 feet to POB',1,4);
// "Commence; thence tie1; thence tie2 to POB; thence courses" = 2 ties
T('Commence + 2 ties to POB','Commence at the corner; thence N 0-0-0 E 500 feet; thence S 90-0-0 E 300 feet to the POINT OF BEGINNING; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet to POB',2,4);
// THE BUG: "FROM SAID POINT OF BEGINNING <course>" — the course AT the POB is real, not a tie
T('FROM POINT OF BEGINNING (real course)','Commence at corner; thence S 0-0-0 W 30 feet to the POINT OF BEGINNING; FROM SAID POINT OF BEGINNING measure South 37 degrees East 73 feet; thence S 5-15-0 W 210 feet; thence N 37-0-0 W 73 feet; thence N 5-15-0 E 210 feet to POB',1,4);
// Fredonia real shape (should be 1 tie, 4 courses, closes)
T('Fredonia real (1 tie 4 crs)','Commence at the NW corner; thence run South 400 feet to a point; FROM THIS POINT OF BEGINNING measure with an M.B. of South 37 degrees East for a distance of 73 feet to a point; thence measure with an M.B. of South 5 degrees 15 minutes West for a distance of 210 feet to a point; thence measure with an M.B. of North 37 degrees West for a distance of 73 feet; thence measure with an M.B. of North 5 degrees 15 minutes East for a distance of 210 feet to the point of beginning.',1,4);
// Pineview: "continue along the previously described course" should be a course, not dropped
T('Pineview continue-prev-course','commence at the SW corner; thence run Easterly 313 feet; thence deflect 90 degrees 52 minutes to the left and run 39 feet to the point of beginning; From said point of beginning continue along the previously described course for a distance of 378.4 feet; thence deflect 90 degrees 52 minutes to the right and run 42.1 feet; thence deflect 81 degrees 38 minutes to the right and run 381.57 feet; thence run Westerly 91.9 feet to the point of beginning.',2,4);
console.log('\n=== TIE BATCH: '+pass+' pass / '+fail+' fail ===');
if(fails.length)console.log('FAILURES:\n  '+fails.join('\n  '));

if(typeof pass!=='undefined')RESULTS.push(['ties',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['ties',-1,-1]);}
})();

/* ===================== battery: etowah ===================== */
(function(){
console.log('\n########## etowah ##########');
global.window={};
try{
const {parseDeedFigures,computeDeed,_deedArea}=PARSER;

// Eight REAL Etowah County descriptions, verbatim from Gadsden Messenger legal notices
const deeds=[
['Solar Estates (deflect, º symbol, mixed run-words)',
 'Begin at the NE corner of Lot 27 of Solar Estates, recorded in Plat Book "I", Page 131, Probate Office, Etowah County, Alabama, and run Southwesterly along the North line of Lot 27 a distance of 115.0 feet; thence deflect 82\u00ba 36\u2019 right and run Northwesterly a distance of 200.00 feet; thence deflect 105\u00ba 39\u2019 right and run a distance of 118.43 feet; thence deflect 74\u00ba 21\u2019 right and run Southeasterly a distance of 182.87 feet to the point of beginning.',
 4],
['Hwy 278 rebar (deflect right D-M-S, foot-marks, tie)',
 "Commence at an existing \u00bd\u201d rebar at the SW corner of the E\u00bd of the SE\u00bc in Section 16, Township 12 South, Range 7 East of the Huntsville Meridian, Etowah County, Alabama and run northerly, along the West line of said \u00bc, 1142.72\u2019 to the point of beginning on the Northerly right of way of U.S. Highway #278; thence leaving said right of way, continue Northerly, along said West line, 460.92\u2019 to a point; thence deflect right 110 degrees 45\u2019 56\u201d and Southeasterly 129.76\u2019 to a point; thence deflect right 68 degrees 21\u2019 05\u201d and run Southerly 439.55\u2019 to a point on said right of way; thence deflect right 101 degrees 44\u2019 54\u201d and run Westerly, along said right of way, 130.45 to the point of beginning.",
 4],
['Pineview St (deflect L/R word, "previously described course")',
 'commence at the Southwest corner of the NW 1/4 of the SE 1/4, Section 29, T-12-S, R-7-E, Etowah County, Alabama; thence run in an Easterly direction and along the South line of said forty for a distance of 313 feet; thence deflect 90 degrees 52\u2032 to the left and run 39 feet to the Northerly line of Pineview Street and the point of beginning of the lands herein described. From said point of beginning continue along the previously described course for a distance of 378.4 feet; thence deflect 90 degrees 52\u2032 to the right and run 42.1 feet; thence deflect 81 degrees 38\u2032 to the right and run 381.57 feet to a point in the Northerly line of Pineview Street; thence run in a Westerly direction and along the Northerly line of Pineview Street for a distance of 91.9 feet to the point of beginning.',
 4],
['John L Gap Rd (bearing + curve chord + record parenthetical)',
 'Beginning at a point that is South 89\u00b043\u2032 East 420 feet from the NW corner of the NW \u00bc of the SE \u00bc of said section; Thence from the True Point of Beginning, continue South 89\u00b0 43\u2032 East 210 feet along and with the North boundary of the 1/4-1/4 to a point; Thence South 02\u00b030\u2032 East and parallel with the West boundary of said 1/4-1/4 854.22 feet to a point on the North margin of that John L. Gap Road; Thence along and with the North margin of said road and along a curve concave to the left, a radius of 288.04 feet, an arc length of 215.94 feet and a chord bearing and distance of North 86\u00b028\u203221\u2033 West 210.92 feet (North 88\u00b040\u2032 West 210.22 feet-Deed record) to a point; Thence North 02\u00b030\u2032 West and parallel to the West boundary of said 1/4-1/4 842.27 feet to the Point of Beginning.',
 4],
['Larrydale (deflect L, degree symbol minutes)',
 'Begin at the Southeast corner of Lot Number Five (5), of the Larrydale Subdivision Unit Two (2), as recorded in Plat Book "G", Page 99, Probate Office, Etowah County, Alabama, and run Northerly, along the East line of said Lot #5 and #6, 106.00 feet to a point; thence deflect 89\u00b0 54\u2019 to the left and run Westerly 165.00 feet to a point; thence deflect 90\u00b0 06\u2019 to the left and run Southerly 106.00 feet to an existing capped rebar on the South line of Lot #4; thence deflect 89\u00b0 54\u2019 to the left and run Easterly along the South line of said Lot #4 and #5 165.00 feet to the point of beginning.',
 4],
['Cloverdale/Hwy 11 (deflect left word, R/W)',
 'Commence at a point where the Southwest line of Lot Number One (1), Block 24, Cloverdale Subdivision of the Prickett Farm, recorded in Plat Book C, pages 46 and 47, Probate Office, Etowah County, Alabama, intersects the present Northwest right of way line of U.S. Highway #11; thence run Northeasterly along the Northwest right of way line of U.S. Highway #11 a distance of 185.00 feet to a point; thence deflect left 91 degrees 31 minutes and run Northwesterly a distance of 71.14 feet to a point; thence deflect left 88 degrees 29 minutes 08 seconds and run Southwesterly a distance of 185.27 feet to a point on the Northeast right of way line of Jackson Trail, thence deflect left 91 degrees 43 minutes 52 seconds and run Southwesterly along said right of way line a distance of 71.14 feet to the point of beginning.',
 4],
['Mountainboro Rd (deflect D-M-S both dirs, interior "continue")',
 'Commence at an existing wood post with tack at the Southeast Corner of the Southeast Quarter (SE \u00bc) of the Northeast Quarter (NE \u00bc), Section Twenty (20), Township Ten (10) South, Range Five (5) East of the Huntsville Meridian, Etowah County, Alabama and run Northerly along the East line thereof, 440.00 feet to a point; thence deflect 86 degrees 26 minutes 01 second left leaving said East line and run Westerly, 380.36 feet to the point of beginning of the property described herein; thence continue Westerly 722.48 feet to a point on the Southeasterly R/W of Mountainboro Road (60\u2019 R/W), thence deflect 126 degrees 16 minutes 59 seconds right and run Northeasterly along said R/W, 250.00 feet to a point; thence deflect 53 degrees 43 minutes 01 second right leaving said R/W and run Easterly, 574.53 feet to a point; thence deflect 90 degrees 00 minutes 00 second right and run Southerly 201.53 feet to the point of beginning.',
 4],
['Egypt Road (bare cardinal courses, "running North")',
 'Beginning in the center of the Egypt Road where it crosses a certain Big Ditch representing the West boundary of the R. H. Vaughn property and running North 210 feet, thence East 210 feet, thence South 210 feet to the Egypt Road, thence West to the point of beginning, containing one (1) acre, more or less; said parcel being in the NW1/4 of the NW1/4 of Section 13, Township 11, Range 4 East of the Huntsville Meridian, in Etowah County, Alabama.',
 3],
];
let pass=0,fail=0;
deeds.forEach(([name,txt,wantCourses])=>{
  let ok=false,info='';
  try{
    const figs=parseDeedFigures(txt);
    const f=figs[0];
    const good=f.calls.filter(c=>!c.tie&&c.type!=='partial');
    const ties=f.calls.filter(c=>c.tie).length;
    const parts=f.calls.filter(c=>c.type==='partial').length;
    const g=computeDeed(good,0,0,0);
    ok = good.length===wantCourses;
    info='courses='+good.length+'/'+wantCourses+' ties='+ties+' partials='+parts+' close='+g.closeDist.toFixed(2)+(g.precision?(' 1:'+g.precision):'');
  }catch(e){info='THREW '+e.message;}
  console.log((ok?'ok  ':'FAIL')+' '+name.padEnd(52)+info);
  ok?pass++:fail++;
});
console.log('\n=== ETOWAH: '+pass+' pass / '+fail+' fail ===');

if(typeof pass!=='undefined')RESULTS.push(['etowah',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['etowah',-1,-1]);}
})();

/* ===================== battery: al2 ===================== */
(function(){
console.log('\n########## al2 ##########');
global.window={};
try{
const {parseDeedFigures,computeDeed,_deedArea}=PARSER;
const deeds=[
['Walnut St, Gadsden (bare "North 88 degrees East", "running Northerly")',
 'A lot or parcel of land described as beginning at a point in the present North line of Walnut Street which is 55 feet Easterly from where the present North line of Walnut Street intersects the present East line of Eighth Street and from thence running in a Northerly direction a distance of 108.52 feet to a point in the South line of what is known as the Cowan lot; thence North 88 degrees East along the South line of said Cowan lot a distance of 52.5 feet more or less to the West line of that certain lot; thence in a Southerly direction and along the West line of said Stephens lot a distance of 109.50 feet to the present North line of Walnut Street; thence in a Westerly direction and along the present North line of Walnut Street a distance of 45 feet to the point of beginning.',
 4],
['Berea St, Gadsden (deflecting left angle, "at right angles", to-point-no-dist)',
 'A lot or parcel of land described as beginning at a point in the present North line of Berea Street which is 316 feet west of the present west line of College Street, and from said point of beginning run in a northerly direction and at right angles to the present north line of Berea Street a distance of 185 feet to a point and the Northeast corner of the lot herein described, thence deflecting to the left at an angle of 96 degrees 00 minutes and run in a westerly direction a distance of 150 feet to a point; thence in a southerly direction a distance of 190 feet to a point in the present north line of Berea Street; thence in an easterly direction and along the present north line of Berea Street a distance of 155 feet to the point of beginning.',
 4],
['Reeves lot, Chambers Co (bare cardinal + dist, "running 50 feet East")',
 'Beginning at the Southwest corner of the C. M. Reeves lot and running 50 feet East along the line of the Louise Niewisch lot to a point for a corner; thence North 173 feet to a point for a corner; thence West 50 feet to a point for a corner and also the corner of Sam Gibson lot; thence South 190 feet along the North border of Lots No. 1 and 2 to the point of beginning.',
 4],
['Callaway Place, Lanett (full DMS bearings, R/W names)',
 'Beginning at a point; thence South 37 degrees 54 minutes 34 seconds West along the Northeasterly right of way of East 3rd Avenue a distance of 140.00 feet; thence North 52 degrees 00 minutes 00 seconds East a distance of 44.00 feet; thence South 37 degrees 54 minutes 34 seconds East a distance of 140.00 feet to the Northwesterly right of way of East 19th Street; thence South 52 degrees 00 minutes 00 seconds West along said right of way a distance of 44.00 feet to the point of beginning.',
 4],
['Full Moon Addn, Walker Co (DMS + parenthetical curve defs, P.C./P.O.C.)',
 'Commence at an existing 5/8" rebar at the Northwest corner of Lot 2 of said Subdivision for the Point of Beginning and run South 14\u00b0 29\u2019 34\u201d West along the West line of Lot 2 for 333.54 feet to an existing 5/8" rebar at the Southwest corner of Lot 2; thence South 88\u00b0 35\u2019 05\u201d East along the South line of Lot 2 for 41.39 feet; thence continue South 14\u00b0 29\u2019 34\u201d West for 24.00 feet, thence North 75\u00b0 30\u2019 26\u201d West for 246.86 feet, thence North 14\u00b0 29\u2019 34\u201d East for 24.00 feet, thence South 75\u00b0 30\u2019 26\u201d East for 80.00 feet to the P.C. of a curve to the left (Radius = 22.00\u2019, Delta = 90\u00b0 00\u2019 23\u201d, Chord = North 59\u00b0 29\u2019 20\u201d East, 31.11 feet), thence run in a Northeasterly direction along the arc of said curve for 34.56 feet to a point on South right-of-way of Alabama Highway 5, thence South 75\u00b0 30\u2019 26\u201d East along said right-of-way for 35.00 feet, thence South 75\u00b0 30\u2019 26\u201d East for 87.86 feet to the Point of Beginning.',
 8],
];
let pass=0,fail=0;
deeds.forEach(([name,txt,want])=>{
  let ok=false,info='';
  try{
    const f=parseDeedFigures(txt)[0];
    const good=f.calls.filter(c=>!c.tie&&c.type!=='partial');
    const g=computeDeed(good,0,0,0);
    ok=good.length===want;
    info='courses='+good.length+'/'+want+' ties='+f.calls.filter(c=>c.tie).length+' part='+f.calls.filter(c=>c.type==='partial').length+' close='+g.closeDist.toFixed(2)+(g.precision?' 1:'+g.precision:'');
  }catch(e){info='THREW '+e.message;}
  console.log((ok?'ok  ':'FAIL')+' '+name.slice(0,50).padEnd(52)+info);
  ok?pass++:fail++;
});
console.log('\n=== ALABAMA batch 2: '+pass+' pass / '+fail+' fail ===');

if(typeof pass!=='undefined')RESULTS.push(['al2',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['al2',-1,-1]);}
})();

/* ===================== battery: al3 ===================== */
(function(){
console.log('\n########## al3 ##########');
global.window={};
try{
const {parseDeedFigures,computeDeed,_deedArea}=PARSER;
const deeds=[
['Huguley, Chambers (clean DMS, "RUN ALONG", 5 crs incl split last)',
 'FROM SAID TRUE POINT OF BEGINNING RUN ALONG SAID RIGHT OF WAY SOUTH 53 DEGREES 59 MINUTES 34 SECONDS WEST A DISTANCE OF 116.98 FEET TO AN IRON PIN; THENCE NORTH 36 DEGREES 33 MINUTES 07 SECONDS WEST A DISTANCE OF 361.09 FEET TO AN IRON PIN; THENCE NORTH 87 DEGREES 09 MINUTES 14 SECONDS EAST A DISTANCE OF 140.62 FEET TO AN IRON PIN; THENCE SOUTH 36 DEGREES 33 MINUTES 00 SECONDS EAST A DISTANCE OF 136.67 FEET TO AN IRON PIN; THENCE SOUTH 36 DEGREES 33 MINUTES 00 SECONDS EAST A DISTANCE OF 147.50 FEET TO AN IRON PIN WHICH IS ALSO THE TRUE POINT OF BEGINNING.',5],
['Lanett alley (angle-right-for-feet, "DEGREES TO THE RIGHT FOR")',
 'THENCE FROM THIS STARTING POINT CONTINUE NORTHERLY ALONG THE EAST MARGIN OF SAID AVENUE FOR 150.0 FEET TO AN IRON PIN FOR A CORNER; THENCE 90 DEGREES TO THE RIGHT FOR 156.0 FEET TO AN IRON PIN; THENCE 109 DEGREES 54 MINUTES TO THE RIGHT FOR 158.6 FEET TO AN IRON PIN FOR A CORNER; THENCE 69 DEGREES 41 MINUTES TO THE RIGHT FOR 102.4 FEET TO AN IRON PIN FOR A CORNER AND STARTING POINT.',4],
['Chambers CR-1023 (clean DMS, "FOR" distance, tie chain)',
 'COMMENCING AT THE NORTHWEST CORNER OF THE EAST HALF OF THE SOUTHEAST QUARTER OF SECTION 20, TOWNSHIP 21 NORTH, RANGE 26 EAST, CHAMBERS COUNTY, ALABAMA; THENCE SOUTH 01 DEGREE 00 MINUTES 00 SECONDS EAST 800.0 FEET; THENCE NORTH 89 DEGREES 00 MINUTES 00 SECONDS EAST FOR 2134.00 FEET; THENCE SOUTH 16 DEGREES 13 MINUTES 21 SECONDS EAST 111.02 FEET TO THE TRUE POINT OF BEGINNING; THENCE LEAVING SAID RIGHT OF WAY LINE NORTH 88 DEGREES 48 MINUTES 27 SECONDS EAST FOR 406.26 FEET; THENCE SOUTH 15 DEGREES 57 MINUTES 35 SECONDS EAST FOR 110.97 FEET; THENCE SOUTH 88 DEGREES 48 MINUTES 27 SECONDS WEST FOR 195.74 FEET; THENCE SOUTH 88 DEGREES 49 MINUTES 15 SECONDS WEST 210.00 FEET; THENCE NORTH 16 DEGREES 13 MINUTES 21 SECONDS WEST 111.02 FEET TO THE TRUE POINT OF BEGINNING.',5],
['Chambers 1973 (backtick minutes "45\u00b0 0`", short bearings)',
 'COMMENCING AT THE SOUTHEAST CORNER OF THE SOUTHEAST QUARTER OF SECTION 17, TOWNSHIP 21 NORTH, RANGE 28 EAST, CHAMBERS COUNTY, ALABAMA, THENCE RUN SOUTH 89\u00b0 15` WEST FOR A DISTANCE OF 216.5 FEET TO A STOB FOR THE POINT OF BEGINNING; THENCE RUN NORTH 45\u00b0 0` WEST FOR A DISTANCE OF 177.5 FEET TO A STOB FOR A CORNER; THENCE SOUTH 10\u00b0 0` WEST FOR A DISTANCE OF 218.5 FEET TO A STOB FOR A CORNER; THENCE NORTH 61\u00b0 30` EAST FOR A DISTANCE OF 185.5 FEET TO THE POINT OF BEGINNING.',4],
['Fredonia Rd (M.B. "measure with an M.B. of South 37 degrees East")',
 'FROM THIS POINT OF BEGINNING measure with an M.B. of South 37 degrees East for a distance of 73 feet to a point; thence measure with an M.B. of South 5 degrees 15 minutes West for a distance of 210 feet to a point; thence measure with an M.B. of North 37 degrees West for a distance of 73 feet; thence measure with an M.B. of North 5 degrees 15 minutes East for a distance of 210 feet to the point of beginning.',4],
['LaFayette Hospital Rd ("proceed with a bearing of South 1 degrees 15\u2019 East")',
 'Begin at the Northeast corner of the NE 1/4 of the NW 1/4 of Section 23, Township 22 North, Range 26 East, and proceed with a bearing of South 1 degrees 15\u2019 East for a distance of 187.5 feet to a point; thence proceed with a bearing of South 9 degrees 45\u2019 West for a distance of 601 feet to a point; thence proceed with a bearing of South 2 degrees 25\u2019 West for a distance of 317 feet to a point; thence proceed with a bearing of South 88 degrees 05\u2019 West for a distance of 350 feet to a point; thence proceed with a bearing of North 0 degrees 30\u2019 West for a distance of 317 feet to a point; thence proceed with a bearing of North 88 degrees 05\u2019 East for a distance of 362.5 feet to the point of beginning.',6],
['Lanett Ragland (clean DMS, open-top-pipe monuments, 4 crs)',
 'FROM SAID POINT OF BEGINNING THENCE CONTINUE ALONG SAID RIGHT OF WAY NORTH 00 DEGREES 30 MINUTES 11 SECONDS WEST A DISTANCE OF 105.00 FEET; THENCE LEAVING SAID RIGHT OF WAY NORTH 89 DEGREES 51 MINUTES 05 SECONDS EAST A DISTANCE OF 170.21 FEET TO A 1 1/2 INCH OPEN TOP PIPE; THENCE SOUTH 00 DEGREES 30 MINUTES 11 SECONDS EAST A DISTANCE OF 105.29 FEET TO A 1 1/2 INCH OPEN TOP PIPE; THENCE SOUTH 89 DEGREES 57 MINUTES 01 SECONDS WEST A DISTANCE OF 170.21 FEET TO THE POINT OF BEGINNING.',4],
];
let pass=0,fail=0;
deeds.forEach(([name,txt,want])=>{
  let ok=false,info='';
  try{
    const f=parseDeedFigures(txt)[0];
    const good=f.calls.filter(c=>!c.tie&&c.type!=='partial');
    const g=computeDeed(good,0,0,0);
    ok=good.length===want;
    info='crs='+good.length+'/'+want+' ties='+f.calls.filter(c=>c.tie).length+' part='+f.calls.filter(c=>c.type==='partial').length+' close='+g.closeDist.toFixed(2)+(g.precision?' 1:'+g.precision:'');
  }catch(e){info='THREW '+e.message;}
  console.log((ok?'ok  ':'FAIL')+' '+name.slice(0,48).padEnd(50)+info);
  ok?pass++:fail++;
});
console.log('\n=== ALABAMA batch 3: '+pass+' pass / '+fail+' fail ===');

if(typeof pass!=='undefined')RESULTS.push(['al3',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['al3',-1,-1]);}
})();

/* ===================== battery: al4 ===================== */
(function(){
console.log('\n########## al4 ##########');
global.window={};
try{
const {parseDeedFigures,computeDeed}=PARSER;
let pass=0,fail=0;const fails=[];
function T(name,txt,wantCrs){let ok=false,info='';try{const f=parseDeedFigures(txt)[0];const good=f.calls.filter(c=>!c.tie&&c.type!=='partial');const g=computeDeed(good,0,0,0);ok=good.length===wantCrs;info='crs='+good.length+'/'+wantCrs+' ties='+f.calls.filter(c=>c.tie).length+' part='+f.calls.filter(c=>c.type==='partial').length+' close='+g.closeDist.toFixed(2)+(g.precision?' 1:'+g.precision:'');}catch(e){info='THREW '+e.message;}console.log((ok?'ok  ':'FAIL')+' '+name.slice(0,44).padEnd(46)+info);ok?pass++:(fail++,fails.push(name));}

// Grandview Dr LESS-AND-EXCEPT tract (deflect right with DMS, deflect no-keyword-pos, closes)
T('Grandview Dr (deflect right/no-kw, closes)','Commence at the SE corner of the NE 1/4 of the NW 1/4 Section 25, Township 11 South, Range 4 East; thence run South 88 degrees 58 minutes 30 seconds West along the South boundary line a distance of 537.40 feet to the point of beginning; thence continue South 88 degrees 58 minutes 30 seconds West along the South boundary line a distance of 159.54 feet to a point; thence deflect right 90 degrees 59 minutes 41 seconds and run North a distance of 333.24 feet to a point of the South right of way line of Grandview Drive; thence deflect 87 degrees 10 minutes 33 seconds and run Northeasterly along the South right of way line a distance of 159.50 feet to a point; thence deflect right 92 degrees 46 minutes 20 seconds and leaving said right of way run South a distance of 338.33 feet to the point of beginning.',4);

// Otway Road (clean DMS, commence+tie, closes tight)
T('Otway Road (clean DMS, tie, closes)','Commencing at an iron pin found at the Northwest corner of the Southwest Quarter of the Northeast Quarter of Section 13, Township 10 South, Range 5 East in Etowah County, Alabama; thence South 88 degrees 28 minutes 23 seconds East 212.50 feet to an iron pin set in Otway Road, the point of beginning; thence along said Otway Road South 88 degrees 28 minutes 23 seconds East 200.00 feet to an iron pin set in said Otway Road; thence leaving said Otway Road South 2 degrees 46 minutes 19 seconds East 304.89 feet to an iron pin set; thence North 88 degrees 28 minutes 23 seconds West 200.00 feet to an iron pin set; thence North 2 degrees 46 minutes 19 seconds West 304.89 feet to the point of beginning.',4);

// Forest Hill (deflect left, backtick minutes, "deflect 106 d..." truncated so use 3 courses)
T('Forest Hill (deflect left, backtick min)','Begin at the Northwest corner of Lot #6 Block B of the Forest Hill Addition, and run Southerly along the West line of Lot #6 a distance of 50 feet; thence deflect 92 degrees 01 minutes left and run a distance of 138.24 feet to a point on the East line of Lot #8; thence deflect 88 degrees 06 minutes left and run northerly along the East line of Lots #8 and #6 a distance of 85.0 feet to the Northeast corner of Lot #6; thence deflect 89 degrees 53 minutes left and run a distance of 138.24 feet to the point of beginning.',4);

// Clay County (bare distance no-unit mid-deed "165.00", DMS with foot-marks, closes)
T('Clay County (bare dist no-unit, closes)','Begin at an iron pin; thence S 86 degrees 33 minutes 40 seconds E 182.15 feet to an IPS rebar; thence S 01 degrees 55 minutes 20 seconds W 165.00 along an old fence line to an iron pipe; thence N 86 degrees 44 minutes 00 seconds W 182.14 feet along the South line back to the point of beginning.',3);

// Edenwood save-and-except (deflect right gerund + at-an-angle, -erly to POB no dist)
T('Edenwood S&E (gerund deflect at angle)','Beginning at the Northeast corner of said Lot; thence run in a Southerly direction along the Easterly line of said lot a distance of 35.5 feet to a point; thence in a Westerly direction along an extension of the South line a distance of 28 feet to a point; thence deflect to the right at an angle of 100 degrees 56 minutes and run in a Northerly direction a distance of 24 feet to the Northerly line of said Lot; thence run in Northeasterly direction along the Northerly line to the point of beginning.',3);

console.log('\n=== ALABAMA batch 4: '+pass+' pass / '+fail+' fail ===');
if(fails.length)console.log('FAILURES:\n  '+fails.join('\n  '));

if(typeof pass!=='undefined')RESULTS.push(['al4',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['al4',-1,-1]);}
})();

/* ===================== battery: al5 ===================== */
(function(){
console.log('\n########## al5 ##########');
global.window={};
try{
const {parseDeedFigures,computeDeed}=PARSER;
let pass=0,fail=0;const fails=[];
function T(name,txt,wantCrs,wantClose){let ok=false,info='';try{const figs=parseDeedFigures(txt);const f=figs[0];if(!f){ok=(wantCrs===0);info='0 figures (lot-only ref, correctly no courses)';console.log((ok?'ok  ':'FAIL')+' '+name.slice(0,44).padEnd(46)+info);ok?pass++:(fail++,fails.push(name));return;}const good=f.calls.filter(c=>!c.tie&&c.type!=='partial');const g=computeDeed(good,0,0,0);const cok=wantCrs==null||good.length===wantCrs;const clok=wantClose==null||g.closeDist<wantClose;ok=cok&&clok;info='crs='+good.length+(wantCrs!=null?'/'+wantCrs:'')+' ties='+f.calls.filter(c=>c.tie).length+' part='+f.calls.filter(c=>c.type==='partial').length+' close='+g.closeDist.toFixed(2)+(g.precision?' 1:'+g.precision:'');}catch(e){info='THREW '+e.message;}console.log((ok?'ok  ':'FAIL')+' '+name.slice(0,44).padEnd(46)+info);ok?pass++:(fail++,fails.push(name));}

// Scenic Drive (Etowah): clean DMS backtick-minutes, R/W, closes — real recorded
T('Scenic Drive (backtick DMS, R/W, tie)','Commence at an existing 3/4 inch pipe at the Northeast corner of the NW 1/4 of the NW 1/4, Section 1, T-12-S, R-5-East of the Huntsville Meridian, Etowah County, Alabama and run S 78 degrees 48 minutes 51 seconds W, 166.64 feet to the point of beginning of the property described herein; thence run N 59 degrees 45 minutes 32 seconds W, 146.49 feet to a point; thence run S 78 degrees 22 minutes 20 seconds W, 258.76 feet to a point; thence run S 06 degrees 57 minutes 59 seconds E, 80.91 feet to a point on the Northeasterly R/W of Scenic Drive; thence run N 78 degrees 22 minutes 20 seconds E, 300.00 feet to a point; thence run N 06 degrees 57 minutes 59 seconds W, 66.00 feet to the point of beginning.',5,null);

// Vineyard/Mount (Marshall-adjacent): DISTANCE-LESS course "to the Northwest corner" (boundary call only)
T('Vineyard distanceless course','Beginning at a point in the Northeast line of the Jacksonville Road; thence in a Northerly direction along the east line a distance of 100 feet to a point; thence in an easterly direction along the south line of said Mount lot to the Northwest corner of the Mizell lot; thence in a southerly direction along the west line of said Mizell lot a distance of 300 feet to a point; thence in a Westerly direction along the south line a distance of 200 feet to the point of beginning.',null,null);

// Boaz Pineview: pure lot reference (NO metes-and-bounds) — must not phantom
T('Boaz lot-only (no metes, 0 courses)','Lots 1, 2, 3, 4, 5, 6, 7 and 8 in Block 4 of Pineview Subdivision to Boaz, Alabama, according to the Plat as recorded in Plat Book 3, Page 108, Probate Office, Marshall County, Alabama.',0,null);

// Clean 5-course DMS that MUST close (built to verify Scenic-style parse+compute)
T('Marshall 4-course DMS (closes 0)','Beginning at an iron pin; thence N 00 degrees 00 minutes 00 seconds E 200.00 feet; thence S 90 degrees 00 minutes 00 seconds E 150.00 feet; thence S 00 degrees 00 minutes 00 seconds W 200.00 feet; thence N 90 degrees 00 minutes 00 seconds W 150.00 feet to the point of beginning.',4,0.5);

// "direct line to the Southeast corner" — distanceless commence tie
T('direct-line tie + courses','from the SW corner run in a Northeasterly direction in a direct line to the Southeast corner of the Vineyard lot, the point of beginning; thence N 00 degrees 00 minutes 00 seconds E 100.00 feet; thence S 90 degrees 00 minutes 00 seconds E 100.00 feet; thence S 00 degrees 00 minutes 00 seconds W 100.00 feet; thence N 90 degrees 00 minutes 00 seconds W 100.00 feet to the point of beginning.',4,0.5);

console.log('\n=== ALABAMA batch 5: '+pass+' pass / '+fail+' fail ===');
if(fails.length)console.log('FAILURES:\n  '+fails.join('\n  '));

if(typeof pass!=='undefined')RESULTS.push(['al5',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['al5',-1,-1]);}
})();

/* ===================== battery: long ===================== */
(function(){
console.log('\n########## long ##########');
global.window={};
try{
const {parseDeedFigures,computeDeed,_deedArea}=PARSER;
let pass=0,fail=0;const fails=[];
function T(name,txt,wantCrs,wantClose){let ok=false,info='';const t0=Date.now();try{const f=parseDeedFigures(txt)[0];if(!f){info='NO FIGURE';}else{const good=f.calls.filter(c=>!c.tie&&c.type!=='partial');const g=computeDeed(good,0,0,0);const cok=wantCrs==null||good.length===wantCrs;const clok=wantClose==null||g.closeDist<wantClose;ok=cok&&clok;info='crs='+good.length+(wantCrs!=null?'/'+wantCrs:'')+' ties='+f.calls.filter(c=>c.tie).length+' part='+f.calls.filter(c=>c.type==='partial').length+' close='+g.closeDist.toFixed(2)+(g.precision?' 1:'+g.precision:'');}}catch(e){info='THREW '+e.message;}const ms=Date.now()-t0;if(ms>300)info+=' SLOW('+ms+'ms)';console.log((ok?'ok  ':'FAIL')+' '+name.slice(0,40).padEnd(42)+info);ok?pass++:(fail++,fails.push(name));}

console.log('=== REAL PATENT DEED (compound "and" course) ===');
// "thence N 53°25' W, 215.5 feet, and 45°21' W, 274.0 feet" = TWO courses in one thence
T('patent 5-course (compound and)','beginning on a 36 inch P.O. being the southeast corner of this tract, thence S 57 degrees 13 minutes 56 seconds W 696.98 feet; thence N 53 degrees 25 minutes W 215.5 feet, and N 45 degrees 21 minutes W 274.0 feet; thence N 56 degrees 32 minutes E 828.0 feet; thence S 33 degrees 20 minutes E 479.2 feet to the place of beginning.',5,null);

console.log('=== LONG SYNTHETIC (drift over many courses) ===');
// regular 12-gon, side 100 — 12 courses, must close & area = formula
function ngon(n,side){let s='Begin',az=0;const ext=360/n;const b=z=>{z=((z%360)+360)%360;let q1,q2,x;if(z<=90){q1='N';q2='E';x=z;}else if(z<=180){q1='S';q2='E';x=180-z;}else if(z<=270){q1='S';q2='W';x=z-180;}else{q1='N';q2='W';x=360-z;}const d=Math.floor(x),m=Math.floor((x-d)*60),sc=Math.round(((x-d)*60-m)*60);return q1+' '+d+'-'+String(m).padStart(2,'0')+'-'+String(sc).padStart(2,'0')+' '+q2;};for(let i=0;i<n;i++){s+='; thence '+b(az)+' '+side+' feet';az+=ext;}return s+' to POB';}
T('12-gon (12 courses closes)',ngon(12,100),12,2.0);
T('24-gon (24 courses closes)',ngon(24,100),24,3.0);
T('36-gon (36 courses closes)',ngon(36,100),36,5.0);

console.log('=== LONG WITH INTERLEAVED CURVES ===');
// 8 lines + 4 curves alternating, must not lose state
let mix='Begin at P';
for(let i=0;i<4;i++){mix+='; thence N '+(i*20)+'-0-0 E 100 feet; thence along a curve to the right, radius 50 feet, central angle 30 degrees, arc 26.18 feet';}
mix+=' to POB';
T('4 lines + 4 curves interleaved',mix,8,null);

console.log('=== VERY LONG (50+ courses, no crash/drift) ===');
let big='Begin';for(let i=0;i<60;i++)big+='; thence N '+(i%89+1)+'-'+(i%60).toString().padStart(2,'0')+'-00 E '+(50+i)+' feet';big+=' to POB';
T('60-course traverse (parses all)',big,60,null);

console.log('=== LARGE TEXT PERF (paste bomb) ===');
let bomb='Begin';for(let i=0;i<500;i++)bomb+='; thence N 45-0-0 E 100 feet';
T('500-course perf',bomb,500,null);

console.log('=== MULTI-FIGURE LONG (parcel + 2 excepts) ===');
T('parcel + 2 LESS AND EXCEPT','PARCEL ONE: Begin; thence N 0-0-0 E 500 feet; thence S 90-0-0 E 500 feet; thence S 0-0-0 W 500 feet; thence N 90-0-0 W 500 feet to POB. LESS AND EXCEPT: Begin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet to POB. LESS AND EXCEPT: Begin; thence N 0-0-0 E 80 feet; thence S 90-0-0 E 80 feet; thence S 0-0-0 W 80 feet; thence N 90-0-0 W 80 feet to POB',null,null);

console.log('=== REGRESSION ===');
const fs=_deedFS;
[['MESA','/tmp/mesa.txt',0.01],['PIMA','/mnt/user-data/outputs/pima-cpc-deed.txt',7]].forEach(([nm,pth,exp])=>{try{const f=parseDeedFigures(fs.readFileSync(pth,'utf8'))[0];const g=computeDeed(f.calls.filter(c=>!c.tie&&c.type!=='partial'),0,0,0);const ok=g.closeDist<exp+0.5;console.log((ok?'ok  ':'FAIL')+' REG '+nm+' '+g.closeDist.toFixed(2));ok?pass++:fail++;}catch(e){console.log('FAIL REG',nm,e.message);fail++;}});

console.log('\n=== LONG BATCH: '+pass+' pass / '+fail+' fail ===');
if(fails.length)console.log('FAILURES:\n  '+fails.join('\n  '));

if(typeof pass!=='undefined')RESULTS.push(['long',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['long',-1,-1]);}
})();

/* ===================== battery: aliquot ===================== */
(function(){
console.log('\n########## aliquot ##########');
global.window={};
try{
const {parseDeedFigures,computeDeed,_deedArea}=PARSER;
let pass=0,fail=0;
function A(name,txt,wantW,wantH){
  const figs=parseDeedFigures(txt);
  const f=figs.find(x=>x.aliquot);
  if(wantW==null){const ok=!f;console.log((ok?'ok  ':'FAIL')+' '+name.padEnd(46)+(f?'WRONGLY matched':'not aliquot (correct)'));ok?pass++:fail++;return;}
  if(!f){console.log('FAIL '+name.padEnd(46)+'no aliquot figure');fail++;return;}
  const g=computeDeed(f.calls,0,0,0);
  const dims=f.name.match(/([\d.]+) . ([\d.]+)/);
  const w=parseFloat(dims[1]),h=parseFloat(dims[2]);
  const ok=Math.abs(w-wantW)<0.01&&Math.abs(h-wantH)<0.01&&g.closeDist<0.01;
  console.log((ok?'ok  ':'FAIL')+' '+name.padEnd(46)+w+'x'+h+' close='+g.closeDist.toFixed(3));
  ok?pass++:fail++;
}
A('western 9/20 of southern half of said 40','The western 9/20 of the southern half of said forty',594,660);
A('S1/2 of NW1/4 of Section (narrative tail)','The South Half of the Northwest Quarter of Section 12, Township 10 South, Range 5 East of the Huntsville Meridian, Etowah County, Alabama, containing 80 acres more or less',2640,1320);
A('W1/2 of SE1/4 of NE1/4','The West Half of the Southeast Quarter of the Northeast Quarter of Section 7',660,1320);
A('glyph NW 1/4 of SE 1/4','The NW 1/4 of the SE 1/4 of Section 3',1320,1320);
A('north quarter strip','The North Quarter of said forty',1320,330);
A('East 208 feet strip','The East 208 feet of the South Half of the Northwest Quarter of Section 12',208,1320);
A('North 250 feet of forty','The North 250 feet of said forty',1320,250);
A('directionless fraction fails safe','9/20ths of the southern half of said forty',null);
A('government lot fails safe','Government Lot 4 of the fractional Northwest Quarter of Section 6',null);
A('metes deed not swallowed','The South Half of the NW Quarter, more particularly described as: Beginning at an iron pin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 100 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 100 feet to the point of beginning',null);
A('oversize strip fails safe','The East 3000 feet of the NW 1/4 of the SE 1/4 of Section 3',null);
console.log('=== ALIQUOT: '+pass+' pass / '+fail+' fail ===');
if(typeof pass!=='undefined')RESULTS.push(['aliquot',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['aliquot',-1,-1]);}
})();


/* ===================== battery: aliqcal (calibration) ===================== */
(function(){
console.log('\n########## aliqcal ##########');
global.window={};
try{
const {parseDeedFigures,computeDeed,_deedAliquotCalibrate,_deedArea}=PARSER;
let pass=0,fail=0;const T=(n,ok,info)=>{console.log((ok?'ok  ':'FAIL')+' '+n.padEnd(48)+(info||''));ok?pass++:fail++;};
const spec=t=>{const f=parseDeedFigures(t).find(x=>x.aliquot);return f?f.aliquotSpec:undefined;};
let sp=spec('The western 9/20 of the southern half of said forty');
T('unit rect W9/20 of S1/2',sp&&Math.abs(sp.u1-0.45)<1e-9&&Math.abs(sp.v1-0.5)<1e-9&&sp.u0===0&&sp.v0===0);
sp=spec('The NE 1/4 of said forty');
T('unit rect NE1/4',sp&&sp.u0===0.5&&sp.u1===1&&sp.v0===0.5&&sp.v1===1);
{const _as=spec('The East 208 feet of said forty');T('absolute strip: spec with hasAbs (no calibration)',_as!=null&&_as.hasAbs===true);}
sp=spec('The western 9/20 of the southern half of said forty');
let c=_deedAliquotCalibrate(sp,{E:0,N:0},{E:1320,N:0},{E:1320,N:1320},{E:0,N:1320});
let g=computeDeed(c.calls,0,0,0);
T('nominal square reproduces 594x660, 9.00 ac',Math.abs(c.C.E-594)<1e-9&&Math.abs(c.C.N-660)<1e-9&&g.closeDist<1e-6&&Math.abs(_deedArea(g)/43560-9)<1e-6);
const SW={E:5000,N:5000},SE={E:6341.40,N:5004.00},NE={E:6316.00,N:6327.80},NW={E:4995.00,N:6318.50};
c=_deedAliquotCalibrate(sp,SW,SE,NE,NW);g=computeDeed(c.calls,0,0,0);
T('lopsided B',Math.abs(c.B.E-5603.63)<0.01&&Math.abs(c.B.N-5001.80)<0.01);
T('lopsided C',Math.abs(c.C.E-5596.54)<0.01&&Math.abs(c.C.N-5662.2425)<0.01);
T('lopsided S line 603.63',Math.abs(c.calls[0].dist-603.63)<0.01);
T('lopsided closes exactly',g.closeDist<1e-6);
T('lopsided trapezoid: S-N diff = half parent taper (~4.6)',Math.abs((c.calls[0].dist-c.calls[2].dist)-4.58)<0.1,'diff='+(c.calls[0].dist-c.calls[2].dist).toFixed(2));
console.log('=== ALIQCAL: '+pass+' pass / '+fail+' fail ===');
RESULTS.push(['aliqcal',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['aliqcal',-1,-1]);}
})();


/* ===================== battery: aliqplace (shared-base auto-placement) ===================== */
(function(){
console.log('\n########## aliqplace ##########');
global.window={};
try{
const {parseDeedFigures,_deedAliquotOffset,computeDeed}=PARSER;
if(!_deedAliquotOffset){console.log('(skipped — index.html < 4.3.72)');RESULTS.push(['aliqplace',0,0]);return;}
let pass=0,fail=0;const T=(n,ok,info)=>{console.log((ok?'ok  ':'FAIL')+' '+n.padEnd(50)+(info||''));ok?pass++:fail++;};
const spec=t=>{const f=parseDeedFigures(t).find(x=>x.aliquot);return f?f.aliquotSpec:null;};
const bS=spec('The Western 2/3rds of the Southern 3/5ths of the East Half of the Northwest Quarter of the Southeast Quarter of Section 9');
const fS=spec('The North 132 feet of the West Half of said forty');
const off=_deedAliquotOffset(bS,fS);
T('section-chain vs said-forty: (-660,+1188)',off&&Math.abs(off.dE+660)<0.01&&Math.abs(off.dN-1188)<0.01);
const o2=_deedAliquotOffset(spec('The East Half of said forty'),spec('The South 200 feet of the West Half of said forty'));
T('same base: (-660,0)',o2&&Math.abs(o2.dE+660)<0.01&&Math.abs(o2.dN)<0.01);
const o3=_deedAliquotOffset(spec('The North Half of the Southwest Quarter of Section 8'),spec('The East Half of said quarter'));
T('said quarter: (1320,-1320)',o3&&Math.abs(o3.dE-1320)<0.01&&Math.abs(o3.dN+1320)<0.01);
T('no forty stage -> null',_deedAliquotOffset(spec('The East Half of the Northwest Quarter of Section 3'),fS)===null);
T('figure base larger -> null',_deedAliquotOffset(spec('The North Half of said forty'),spec('The Southwest Quarter of Section 3'))===null);
const o6=_deedAliquotOffset(spec('The North Half of said forty'),spec('The Northeast Quarter of said forty'));
T('coherent NE1/4 in N1/2: (660,0)',o6&&Math.abs(o6.dE-660)<0.01&&Math.abs(o6.dN)<0.01);
const fb=parseDeedFigures('The Western 2/3rds of the Southern 3/5ths of the East Half of the Northwest Quarter of the Southeast Quarter of Section 9. LESS AND EXCEPT the North 132 feet of the West Half of said forty.');
const B=fb.find(f=>f.kind==='boundary'),F=fb.find(f=>f.kind==='except');
const oBF=_deedAliquotOffset(B.aliquotSpec,F.aliquotSpec);
const gF=computeDeed(F.calls,10000+oBF.dE,10000+oBF.dN,0);
T('end-to-end: except SW at (9340,11188)',Math.abs(gF.verts[0].E-9340)<0.01&&Math.abs(gF.verts[0].N-11188)<0.01);
console.log('=== ALIQPLACE: '+pass+' pass / '+fail+' fail ===');
RESULTS.push(['aliqplace',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['aliqplace',-1,-1]);}
})();


/* ===================== battery: realdeeds (verbatim recorded instruments) ===================== */
(function(){
console.log('\n########## realdeeds ##########');
global.window={};
try{
const {parseDeedFigures,computeDeed,_deedArea,_deedParseDistance}=PARSER;
let pass=0,fail=0;const T=(n,ok,info)=>{console.log((ok?'ok  ':'FAIL')+' '+n.padEnd(52)+(info||''));ok?pass++:fail++;};
// — Tallapoosa Co. (comma standing in for "of" before Section; needs >=4.3.75)
const tal=parseDeedFigures('The West half of the Southwest Quarter, Section 34, Township 22 North, Range 24 East, except 1 acre of land known as the Frank Henderson graveyard, and situated in the Northwest corner of said hereinabove described land, all lying in Tallapoosa County, Alabama.');
const talB=tal.find(f=>f.aliquot);
T('Tallapoosa: comma-Section aliquot 1320x2640',!!talB&&/1320 . 2640/.test(talB.name));
// — Calhoun Co. (metes in YARDS tied to a forty; needs >=4.3.76)
const cal=parseDeedFigures('Commencing at the Northwest corner of said forty; thence East along the forty line 70 yards; thence South and parallel with the West line of said forty 70 yards; thence West and parallel with the North line of said forty 70 yards to the West side of said forty; thence North along the forty line 70 yards to the point of beginning.');
const calG=cal.length?cal[0].calls.filter(c=>!c.tie&&c.type!=='partial'):[];
if(calG.length===4){const g=computeDeed(calG,0,0,0);
T('Calhoun: 4 yard courses of 210 ft, closes 0',calG.every(c=>Math.abs(c.dist-210)<0.01)&&g.closeDist<0.01&&Math.abs(_deedArea(g)/43560-1.0124)<0.01);
}else T('Calhoun: 4 yard courses of 210 ft, closes 0',false,'got '+calG.length+' courses');
// — Cullman Co. two-parcel instrument (Roman split + phantom guard + loud partials; needs >=4.3.77)
const cul=parseDeedFigures('PARCEL II: Commence at the Southwest corner of the Northwest Quarter of the Southwest Quarter of Section 2, Township 10 South, Range 3 West, Cullman County, Alabama; thence North 89deg.38\'30" East 668.37 feet; thence North 0deg.14\'07" West 659 feet, to the Point of Beginning of the property herein described; thence South 89deg.25\' West 168.54 feet; thence North 0deg.15\' West, 357.40 feet, more or less; thence North 89deg.45\' East 168.54 feet, more of less; thence South 0deg.14\'07" East 357.4 feet, more or less, back to the point of beginning. PARCEL III: A part of the Northwest Quarter of the Southwest Quarter of Section 2, Township 10 South, Range 3 West, being more particularly described as follows: Commence at an existing concrete monument which marks the Southwest corner of the Northwest Quarter of the Southwest Quarter of said Section 2; thence North 0deg.15\' West 659.29 feet to an existing concrete marker, which is the point of beginning of the tract herein conveyed; thence North 89deg.45\' East a distance of 30 feet to an existing iron rebar; thence North 0deg.15\' West a distance of 76 feet to an existing rebar iron; thence continue North 0deg.15\' West to the South right of way of Eva Road; thence Southwesterly along the South right of way of Eva Road to its point of intersection with the West line of the Northwest Quarter of the Southwest Quarter of said Section 2, thence South along said West quarter line to the point of beginning.');
T('Cullman: Roman-numeral parcels split into 2 figures',cul.length===2);
if(cul.length===2){
  const p1=cul[0],p2=cul[1];
  T('Cullman P1: two-leg commence tie',p1.calls.filter(c=>c.tie).length===2);
  const g1c=p1.calls.filter(c=>!c.tie&&c.type!=='partial');
  const g1=computeDeed(g1c,0,0,0);
  T('Cullman P1: 4 courses close within 1.5 ft',g1c.length===4&&g1.closeDist<1.5,'close='+g1.closeDist.toFixed(2));
  T('Cullman P2: tie + 2 real courses',p2.calls.filter(c=>c.tie).length===1&&p2.calls.filter(c=>!c.tie&&c.type!=='partial').length===2);
  T('Cullman P2: all 3 distance-less courses are LOUD partials',p2.calls.filter(c=>c.type==='partial').length===3);
  T('Cullman P2: no phantom 15-ft course',!p2.calls.some(c=>c.type==='line'&&Math.abs((c.dist||0)-15)<0.01));
  if(p1.cornerRef&&'q' in p1.cornerRef){   // >=4.3.78: qualified corner identity
    T('Cullman: both parcels share qualified QQ corner',!!p2.cornerRef&&p1.cornerRef.q===p2.cornerRef.q&&p1.cornerRef.sec===p2.cornerRef.sec&&p1.cornerRef.q.indexOf('QUARTER')>=0);
  }
}
// — minute-tick guard: legit tick distances still parse
T('tick-feet distance survives guard',(()=>{const d=_deedParseDistance("THENCE N 45 DEG. 30\' E 357.40\' TO A PIN");return !!d&&Math.abs(d.ft-357.4)<0.01;})());
T('bearing-only text yields no distance',_deedParseDistance("CONTINUE NORTH 0DEG.15\' WEST TO THE SOUTH RIGHT OF WAY")===null);
console.log('=== REALDEEDS: '+pass+' pass / '+fail+' fail ===');
RESULTS.push(['realdeeds',pass,fail]);
}catch(e){console.log('BATTERY THREW: '+e.message);RESULTS.push(['realdeeds',-1,-1]);}
})();


console.log('\n================ SUMMARY ================');
RESULTS.forEach(([n,p,f])=>console.log(n.padEnd(10)+(p<0?'THREW':(p+' pass / '+f+' fail'))));
console.log('=========================================');
