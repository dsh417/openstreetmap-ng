import './bootstrap-state';
import 'production-app';
import {mainMap,rightSidebar,routerRoute} from 'fixture-state';
import {batch} from '@preact/signals';
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
let landmarks:number[][]=[[0,0],[-0.01,0],[0.01,0.01]];
let anchor:number[]|null=null;
const snapshot=()=>{
  const m=mainMap.value!,r=m.getContainer().getBoundingClientRect(),c=m.getCenter(),canvas=m.getCanvas();
  const project=(ll:number[])=>{const p=m.project(ll as [number,number]);return [p.x+r.left,p.y+r.top];};
  const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
  return {rect:{top:r.top,left:r.left,width:r.width,height:r.height},center:[c.lng,c.lat],zoom:m.getZoom(),pitch:m.getPitch(),bearing:m.getBearing(),moving:m.isMoving(),projection:m.getProjection(),points:landmarks.map(project),anchor:anchor?project(anchor):null,canvas:[canvas.width,canvas.height],webgl:gl?{renderer:gl.getParameter(gl.RENDERER),lost:gl.isContextLost()}:null,renderedDots:m.queryRenderedFeatures({layers:['dots']}).length,errors:window.fixtureErrors};
};
const layout=(top:boolean,bottom:boolean)=>batch(()=>{
  routerRoute.value={id:top?'panel':'index',sidebarOverlay:!top};
  rightSidebar.value=bottom?'layers':null;
});
window.fixture={
  frames,snapshot,
  async reset(){layout(false,false);await frames();const m=mainMap.value!;m.setProjection({type:'mercator'});m.jumpTo({center:[0,0],zoom:12,pitch:0,bearing:0});anchor=null;landmarks=[[0,0],[-0.01,0],[0.01,0.01]];await frames();return snapshot();},
  async camera(options){const m=mainMap.value!;const idle=new Promise(resolve=>m.once('idle',resolve));m.setProjection({type:options.projection||'mercator'});m.jumpTo({center:options.center||[0,0],zoom:options.zoom??12,pitch:options.pitch??0,bearing:options.bearing??0});await idle;await frames();return snapshot();},
  equalPanels(enabled:boolean){document.documentElement.style.setProperty('--bottom-height',enabled?'40vh':'50vh');},
  markAnchor(edge:'top'|'bottom'){const m=mainMap.value!,r=m.getContainer().getBoundingClientRect();const p=m.unproject([r.width/2,edge==='top'?0:r.height]);anchor=[p.lng,p.lat];return snapshot();},
};
document.getElementById('top')!.onclick=()=>layout(true,false);
document.getElementById('bottom')!.onclick=()=>layout(false,true);
document.getElementById('close')!.onclick=()=>layout(false,false);
document.getElementById('focus')!.onclick=()=>{routerRoute.value={id:'focus',sidebarOverlay:false};};
document.getElementById('animate')!.onclick=()=>{mainMap.value!.flyTo({center:[0.04,0.03],zoom:13,duration:1200,essential:true});rightSidebar.value='layers';};
