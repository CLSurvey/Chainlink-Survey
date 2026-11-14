// One job, built the same way in every version: State Plane coordinates near
// Gadsden (AL East, US survey ft), raw observations, lines, a polyline, an area
// label, a deed, an anchor with imagery on, and non-default settings. Written
// against typeof checks so versions that lack a feature simply skip it.
module.exports=`(function(){
  try{ if(typeof _stageNewJob==="function") _stageNewJob(); }catch(e){}
  if(typeof _jobPendingNew!=="undefined") _jobPendingNew=true;
  units="ft"; jobName="COMPAT";
  const N0=1271228.583, E0=665013.963;
  points=[
    {Point:1,Northing:N0,Easting:E0,Elevation:550.4,Type:"Setup",Description:"IPF START",Flag:"",ih:5.1},
    {Point:2,Northing:N0+100,Easting:E0,Elevation:551.25,Type:"Shot",Description:"IPS, CAPPED \\"LS 123\\"",Flag:"",ih:0,From:1,InstReading:"0.0000",RawAz:"0°00'00\\"",TrueAz:"0°00'00\\"",HorizDist:100},
    {Point:3,Northing:N0+100,Easting:E0+55.5,Elevation:552.1,Type:"Shot",Description:"PP",Flag:"",ih:0,From:2,InstReading:"90.0000",RawAz:"90°00'00\\"",TrueAz:"90°00'00\\"",HorizDist:55.5},
    {Point:4,Northing:N0,Easting:E0+55.5,Elevation:550.9,Type:"Shot",Description:"OAK 24",Flag:"X",ih:0,From:1,HorizDist:55.5}];
  pointCounter=5; currentPoint=points[1];
  plotConnections=[{from:1,to:2,style:"solid"},{from:2,to:3,style:"dashed"},{from:3,to:4,style:"solid"},{from:4,to:1,style:"solid"}];
  if(typeof _polylines!=="undefined") _polylines=[{name:"FENCE",verts:[{E:E0,N:N0},{E:E0+20,N:N0+40},{E:E0+55.5,N:N0+100}],segs:[{type:"line"},{type:"line"}]}];
  if(typeof _areaLabels!=="undefined") _areaLabels=[{E:E0+27.75,N:N0+50,label:"0.127 ac",ptNums:[1,2,3,4],u:"ft",arcSigs:[]}];
  surveyMode="3D"; distMode="HD"; prismConstant=-0.03; combinedScaleFactor=0.99991;
  if(typeof footKind!=="undefined") footKind="us";
  if(typeof _ngsMarks!=="undefined"){ _ngsMarks=[{pid:"AA1234",name:"GADSDEN TEST",lat:34.0,lon:-85.8,E:E0+900,N:N0+1200,orthoHt:180.5,cond:"GOOD"}]; _ngsShow=false; }
  if(typeof _ppmEnabled!=="undefined"){ _ppmEnabled=true; }
  try{ if(typeof _ppmValue!=="undefined") _ppmValue=4.2; if(typeof _atmTempC!=="undefined") _atmTempC=28; if(typeof _atmPressHPa!=="undefined") _atmPressHPa=990; }catch(e){}
  try{
    if(typeof parseDeedFigures==="function"&&typeof _mkDeed==="function"){
      const figs=parseDeedFigures("Beginning at an iron pin; thence N 0-0-0 E 100 feet; thence S 90-0-0 E 55.5 feet; thence S 0-0-0 W 100 feet; thence N 90-0-0 W 55.5 feet to the point of beginning, containing 0.127 acres.");
      figs.forEach(f=>{f.pobE=E0;f.pobN=N0;f.ptNums=f.ptNums||[];});
      _deedPlot=_mkDeed(figs,0); if(typeof _deedRecompute==="function")_deedRecompute();
    }
  }catch(e){}
  try{
    if(typeof _setAnchor==="function"&&typeof _SPC_ZONES!=="undefined"){
      const z=_SPC_ZONES.find(q=>/^AL East/.test(q.name)), u=3937/1200, ll=_projInverse(E0/u,N0/u,z);
      _setAnchor(ll.lat,ll.lon,z,E0,N0);
      satOn=true; if(typeof satOpacity!=="undefined")satOpacity=0.6; if(typeof satRotNudge!=="undefined")satRotNudge=0.15;
      if(typeof satBasemap!=="undefined"&&typeof _BASEMAPS!=="undefined"&&_BASEMAPS.usgs) satBasemap="usgs";
    }
  }catch(e){}
  saveData();
})()`;
