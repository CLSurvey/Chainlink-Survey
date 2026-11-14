// Extra scenarios for the compatibility fixtures (see make-fixtures.js).
const LOCAL_CSV="Point,Northing,Easting,Elevation,Description,Type,Flag\n1,10000.0000,10000.0000,0.0000,CP,Setup,\n2,10300.0000,10000.0000,0.0000,,Shot,\n3,10300.0000,10250.0000,0.0000,,Shot,\n4,10000.0000,10250.0000,0.0000,,Shot,\n";
const pre=`if(typeof _stageNewJob==="function")_stageNewJob(); if(typeof _jobPendingNew!=="undefined")_jobPendingNew=true; units="ft";`;
const ALE=`_SPC_ZONES.find(q=>/^AL East/.test(q.name))`;
module.exports={
  // a job on assumed coordinates (10000/10000), anchored at point 1 by phone GPS, imagery on
  local:`(function(){ ${pre} jobName="LOCALJOB";
    points=[{Point:1,Northing:10000,Easting:10000,Elevation:100,Type:"Setup",Description:"CP1",Flag:""},
      {Point:2,Northing:10120.55,Easting:10000,Elevation:100.5,Type:"Shot",Description:"IPF",Flag:"",From:1,HorizDist:120.55},
      {Point:3,Northing:10120.55,Easting:10088.31,Elevation:101,Type:"Shot",Description:"IPF",Flag:"",From:1},
      {Point:4,Northing:10000,Easting:10088.31,Elevation:100.2,Type:"Shot",Description:"IPS",Flag:"",From:1}];
    pointCounter=5; currentPoint=points[0];
    plotConnections=[{from:1,to:2,style:"solid"},{from:2,to:3,style:"solid"},{from:3,to:4,style:"solid"},{from:4,to:1,style:"solid"}];
    _setAnchor(34.0012,-85.8123,${ALE},10000,10000); satOn=true;
    if(typeof satRotNudge!=="undefined")satRotNudge=0.4; if(typeof _BASEMAPS!=="undefined"&&_BASEMAPS.usgs)satBasemap="usgs";
    saveData(); })()`,
  // an anchored local job open, then a State Plane CSV loaded as a new job: older versions kept the open job's anchor
  copiedAnchor:bac=>`(function(){ ${pre} jobName="HOUSE";
    points=[{Point:1,Northing:5000,Easting:5000,Elevation:0,Type:"Setup",Description:"",Flag:""}]; pointCounter=2; currentPoint=points[0]; plotConnections=[];
    _setAnchor(34.02,-86.0,${ALE},5000,5000); satOn=true; saveData();
    _jobFileAsNew=true; _parseCSV(${JSON.stringify(bac)},"OLDJOB.csv"); try{closeAllModals();}catch(e){} })()`,
  // the same with two local jobs that both start at 10000/10000: the copy is tied at a real point of the new job
  copiedLocal:`(function(){ ${pre} jobName="HOUSE";
    points=[{Point:1,Northing:10000,Easting:10000,Elevation:0,Type:"Setup",Description:"",Flag:""},{Point:2,Northing:10050,Easting:10010,Elevation:0,Type:"Shot",Description:"",Flag:""},{Point:3,Northing:10050,Easting:10060,Elevation:0,Type:"Shot",Description:"",Flag:""}];
    pointCounter=4; currentPoint=points[0]; plotConnections=[];
    _setAnchor(34.02,-86.0,${ALE},10000,10000); satOn=true; saveData();
    _jobFileAsNew=true; _doParseCSV(${JSON.stringify(LOCAL_CSV)},"FARM.csv",{pt:0,n:1,e:2,z:3,desc:4,type:5,flag:6,_skipHeader:true},null); try{closeAllModals();}catch(e){} })()`,
};
