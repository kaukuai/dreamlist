"use client";
import {memo,useEffect,useLayoutEffect,useRef,useState} from "react";
import {drawMonster,drawSprite,loadWorldArt} from "./world-renderer";
import {spriteLooks,type SpriteIdentity,type SpriteAction} from "@/lib/sprite-catalog";
import type {Facing} from "@/lib/pixel-actors";
export const PixelActor=memo(function PixelActor({identity,direction="down",pose=0,tier=0,label,action="walk"}:{identity:SpriteIdentity;direction?:Facing;pose?:number;tier?:number;label:string;action?:SpriteAction}){
 const ref=useRef<HTMLCanvasElement|null>(null),[ready,setReady]=useState(false);
 useEffect(()=>{let active=true;void loadWorldArt().then(()=>{if(active)setReady(true);}).catch(()=>{});return()=>{active=false;};},[]);
 useLayoutEffect(()=>{if(!ready||!ref.current)return;const ctx=ref.current.getContext("2d")!;ctx.clearRect(0,0,96,96);ctx.imageSmoothingEnabled=false;drawSprite(ctx,identity in spriteLooks?identity:"wanderer",48,88,direction,pose,action,tier);},[ready,identity,direction,pose,action,tier]);
 return <canvas ref={ref} width={96} height={96} className="pixel-actor lpc-actor" role="img" aria-label={label} data-facing={direction} data-walk-pose={pose} data-action={action} data-identity={identity} data-ready={ready}/>;
});
export const PixelEnemy=memo(function PixelEnemy({kind,pose,label}:{kind:string;pose:number;label:string}){
 const ref=useRef<HTMLCanvasElement|null>(null),[ready,setReady]=useState(false);useEffect(()=>{let active=true;void loadWorldArt().then(()=>{if(active)setReady(true);}).catch(()=>{});return()=>{active=false;};},[]);
 useLayoutEffect(()=>{if(!ready||!ref.current)return;const ctx=ref.current.getContext("2d")!;ctx.clearRect(0,0,96,96);ctx.imageSmoothingEnabled=false;drawMonster(ctx,kind,48,88,pose);},[ready,kind,pose]);
 return <canvas ref={ref} width={96} height={96} className="pixel-enemy" role="img" aria-label={label}/>;
});
