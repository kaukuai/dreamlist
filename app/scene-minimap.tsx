"use client";
import {useEffect,useLayoutEffect,useRef,useState} from "react";
import {worldProps,type ZoneId,type WorldPoint} from "@/lib/world-map";
import {placesIn} from "@/lib/field-engine";
import {drawProp,groundCanvas,loadWorldArt} from "./world-renderer";
const maps=new Map<ZoneId,HTMLCanvasElement>();
function mapPlate(zone:ZoneId){
 let canvas=maps.get(zone);if(canvas)return canvas;
 canvas=document.createElement("canvas");canvas.width=360;canvas.height=240;const ctx=canvas.getContext("2d")!;ctx.scale(.3,.3);ctx.drawImage(groundCanvas(zone),0,0);for(const prop of [...worldProps[zone]].sort((a,b)=>a.y-b.y))drawProp(ctx,prop);maps.set(zone,canvas);return canvas;
}
export function SceneMinimap({zone,player,focus,expanded=false}:{zone:ZoneId;player:WorldPoint;focus?:WorldPoint|null;expanded?:boolean}){
 const ref=useRef<HTMLCanvasElement|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{let active=true;void loadWorldArt().then(()=>{if(active)setReady(true);}).catch(()=>{});return()=>{active=false;};},[]);
 useLayoutEffect(()=>{if(!ready||!ref.current)return;const canvas=ref.current,ctx=canvas.getContext("2d")!,w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle="#172b2c";ctx.fillRect(0,0,w,h);
  // A circular local chart on the HUD, a complete chart in the map panel.
  const scale=expanded?w/1200:w/720,x=expanded?0:Math.max(0,Math.min(480,player.x-360)),y=expanded?0:Math.max(0,Math.min(80,player.y-360));
  ctx.save();ctx.scale(scale,scale);ctx.translate(-x,-y);ctx.drawImage(mapPlate(zone),0,0,1200,800);ctx.fillStyle="#10282940";ctx.fillRect(0,0,1200,800);
  for(const place of placesIn(zone).filter(p=>p.kind==="npc"||p.kind==="exit")){ctx.fillStyle=place.kind==="npc"?"#b6d7cd":"#efcc86";ctx.beginPath();ctx.arc(place.x,place.y,expanded?7:9,0,Math.PI*2);ctx.fill();}
  if(focus){ctx.strokeStyle="#f1d397";ctx.lineWidth=2/scale;ctx.beginPath();ctx.arc(focus.x,focus.y,19,0,Math.PI*2);ctx.stroke();}
  ctx.fillStyle="#fff1bd";ctx.strokeStyle="#3e3927";ctx.lineWidth=1/scale;ctx.beginPath();ctx.arc(player.x,player.y,expanded?11:15,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
 },[ready,zone,player,focus,expanded]);
 return <canvas ref={ref} width={expanded?360:164} height={expanded?240:164} aria-hidden="true" data-map-zone={zone}/>;
}
