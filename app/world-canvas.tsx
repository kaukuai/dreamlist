"use client";
import {useEffect,useLayoutEffect,useRef,useState} from "react";
import {zoneInfo} from "@/lib/world-map";
import {loadWorldArt,paintWorld,warmSprite,type WorldFrame} from "./world-renderer";
export default function WorldCanvas({state,width,height}:{state:WorldFrame;width:number;height:number}){
 const ref=useRef<HTMLCanvasElement|null>(null),[ready,setReady]=useState(false),[error,setError]=useState(""),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;void loadWorldArt().then(()=>{if(active){warmSprite(state.identity);setReady(true);}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[state.identity,attempt]);
 useLayoutEffect(()=>{if(!ready||!ref.current)return;const canvas=ref.current,ratio=Math.min(2,window.devicePixelRatio||1);if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}const ctx=canvas.getContext("2d")!;ctx.setTransform(ratio,0,0,ratio,0,0);paintWorld(ctx,width,height,state);},[ready,state,width,height]);
 return <><canvas ref={ref} className="world-canvas" role="img" aria-label={`${zoneInfo[state.zone].name}場景地圖`} data-renderer="layered-world" data-zone={state.zone} data-ready={ready} data-camera-x={state.camera.x} data-camera-y={state.camera.y} data-zoom={state.zoom}/>{!ready&&<div className="world-art-loading" role="status">{error?<><span>{error}</span><button onClick={()=>{setError("");setAttempt(value=>value+1);}}>重新載入場景</button></>:"正在展開旅途…"}</div>}</>;
}
