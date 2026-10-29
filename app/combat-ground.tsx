"use client";
import {useEffect,useLayoutEffect,useRef,useState} from "react";
import type {ArenaState} from "@/lib/arena-engine";
import {useReducedMotion} from "@/lib/use-reduced-motion";
import {loadWorldArt} from "./world-renderer";
import {loadScenery} from "./scenery-art";
import {paintBattle,type BattleTheme} from "./battle-renderer";
export function CombatGround({state,kind,tier,theme,onReady}:{state:ArenaState;kind:string;tier:number;theme:BattleTheme;onReady:(ready:boolean)=>void}){
 const ref=useRef<HTMLCanvasElement|null>(null),[ready,setReady]=useState(false),[error,setError]=useState(""),[attempt,setAttempt]=useState(0),[size,setSize]=useState({width:390,height:844});
 const reduced=useReducedMotion();
 useEffect(()=>{let active=true;const observer=new ResizeObserver(([entry])=>setSize({width:entry.contentRect.width,height:entry.contentRect.height}));if(ref.current)observer.observe(ref.current);
  void Promise.all([loadWorldArt(),loadScenery(true)]).then(()=>{if(active){setReady(true);onReady(true);}}).catch(()=>{if(active)setError("戰場美術尚未載入");});return()=>{active=false;observer.disconnect();};},[attempt,onReady]);
 useLayoutEffect(()=>{if(!ready||!ref.current)return;const canvas=ref.current,ratio=Math.min(2,devicePixelRatio||1);if(canvas.width!==Math.round(size.width*ratio)||canvas.height!==Math.round(size.height*ratio)){canvas.width=Math.round(size.width*ratio);canvas.height=Math.round(size.height*ratio);}const ctx=canvas.getContext("2d")!;ctx.setTransform(ratio,0,0,ratio,0,0);paintBattle(ctx,size.width,size.height,state,kind,tier,theme,reduced);},[ready,size,state,kind,tier,theme,reduced]);
 return <><canvas ref={ref} className="arena-ground" data-ready={ready} data-theme={theme} aria-hidden="true"/>{!ready&&<div className="battle-art-status" role="status">{error?<><span>{error}</span><button onClick={()=>{setError("");setAttempt(v=>v+1);}}>重新載入</button></>:"正在展開試煉場景…"}</div>}</>;
}
