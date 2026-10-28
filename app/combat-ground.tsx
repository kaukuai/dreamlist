"use client";
import {useEffect,useRef} from "react";
import {drawProp,groundCanvas,loadWorldArt} from "./world-renderer";
export function CombatGround(){
 const ref=useRef<HTMLCanvasElement|null>(null);
 useEffect(()=>{let active=true,ready=false;const canvas=ref.current;if(!canvas)return;const draw=()=>{if(!active||!ready)return;const box=canvas.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(box.width*ratio);canvas.height=Math.round(box.height*ratio);const ctx=canvas.getContext("2d")!;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle="#37532f";ctx.fillRect(0,0,box.width,box.height);ctx.drawImage(groundCanvas("woods"),-704,0);for(const [x,y] of [[-24,150],[box.width+26,100],[-26,box.height-150],[box.width+30,box.height-90]])drawProp(ctx,{id:"edge-tree",kind:"pine",x,y});ctx.fillStyle="#182f3826";ctx.fillRect(0,0,box.width,box.height);};const observer=new ResizeObserver(draw);observer.observe(canvas);void loadWorldArt().then(()=>{ready=true;draw();}).catch(()=>{});return()=>{active=false;observer.disconnect();};},[]);
 return <canvas ref={ref} className="arena-ground" aria-hidden="true"/>;
}
