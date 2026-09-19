import {signal,useSignalEffect} from '@preact/signals';
import {Map,NavigationControl} from 'maplibre-gl';
export const mainMap=signal<Map|null>(null);
export const rightSidebar=signal<string|null>(null);
export const routerRoute=signal({id:'index',sidebarOverlay:true});
export const initMainMap=(container:HTMLElement)=>{
  const map=new Map({container,style:{version:8,sources:{landmarks:{type:'geojson',data:{type:'FeatureCollection',features:[[-0.01,0],[0,0],[0.01,0.01]].map(coordinates=>({type:'Feature',geometry:{type:'Point',coordinates},properties:{}}))}}},layers:[{id:'background',type:'background',paint:{'background-color':'#eef3fa'}},{id:'dots',type:'circle',source:'landmarks',paint:{'circle-color':'#cc3344','circle-radius':7}}]},center:[0,0],zoom:12,minZoom:1,maxZoom:19,attributionControl:false,canvasContextAttributes:{preserveDrawingBuffer:true}});
  map.addControl(new NavigationControl({visualizePitch:true}),'top-right');
  map.on('error',e=>window.fixtureErrors.push(e.error.message));
  mainMap.value=map;
  map.once('load',()=>{window.fixtureReady=true;});
};
export const IndexRouterOutlet=()=>{
  const route=routerRoute.value;
  useSignalEffect(()=>{
    if(routerRoute.value.id==='focus') mainMap.value!.jumpTo({center:[0.04,0.03],zoom:13});
  });
  return route.sidebarOverlay?null:<div class="action-sidebar top-panel">Top sidebar (40vh)</div>;
};
export const RightSidebarOutlet=()=>rightSidebar.value?<div class="sidebar map-sidebar bottom-panel">Bottom sidebar (50vh)</div>:null;
