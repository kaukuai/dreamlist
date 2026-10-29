"use client";
import NextImage from "next/image";
import {useCallback,useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,BookOpen,Check,LoaderCircle,Pause,Play,Volume2,VolumeX,X} from 'lucide-react';
import {appFetch} from '@/lib/client-api';
import {browserPreview} from '@/lib/app-mode';
import {openingScenes,guideSteps,type OpeningProgress} from '@/lib/opening-model';
import {useReducedMotion} from '@/lib/use-reduced-motion';
import {GameButton} from './field-controls';
import {useGameSound} from './game-sound';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
export function useOpening(stamp:string){
 const [opening,setOpening]=useState<OpeningProgress|null>(null),[error,setError]=useState('');
 const generation=useRef(0);
 const reload=useCallback(async()=>{if(!browserPreview)return;const version=++generation.current;try{const r=await appFetch('/api/opening'),data=await r.json() as {opening:OpeningProgress;error?:string};if(!r.ok)throw new Error(data.error);if(version===generation.current){setOpening(data.opening);setError('');}}catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'序章紀錄暫時無法讀取');}},[]);
 useEffect(()=>{void Promise.resolve().then(reload);},[reload,stamp]);
 useEffect(()=>{if(!opening?.seen||opening.guideDismissed||opening.completed.length===guideSteps.length)return;const timer=setInterval(()=>void reload(),3000);return()=>clearInterval(timer);},[opening,reload]);
 useEffect(()=>{const sync=(e:StorageEvent)=>{if(e.key==='dreamlist:browser-preview:v1')void reload();};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[reload]);
 const update=async(action:{scene?:number;finish?:boolean;dismissGuide?:boolean})=>{++generation.current;try{const r=await appFetch('/api/opening',{method:'POST',body:JSON.stringify(action)}),data=await r.json() as {opening:OpeningProgress;error?:string};if(!r.ok)throw new Error(data.error);setOpening(data.opening);setError('');return true;}catch(e){setError(e instanceof Error?e.message:'序章進度尚未保存，請重試');return false;}};
 return{opening,error,reload,update};
}
export function OpeningPrologue({initialScene=0,replay=false,error,onScene,onFinish}:{initialScene?:number;replay?:boolean;error:string;onScene:(scene:number)=>Promise<boolean>;onFinish:(skipGuide:boolean)=>Promise<boolean>}){
 const [index,setIndex]=useState(initialScene),[busy,setBusy]=useState(false),[failedArt,setFailedArt]=useState(false),[retry,setRetry]=useState(0),[still,setStill]=useState(false);
 const sound=useGameSound(),reduced=useReducedMotion(),scene=openingScenes[index],nextRef=useRef<HTMLButtonElement|null>(null);
 const actions=useRef({next:()=>{},previous:()=>{},skip:()=>{}});
 async function turn(next:number){if(busy||next<0||next>=openingScenes.length)return;setBusy(true);try{if(replay||await onScene(next)){setIndex(next);setFailedArt(false);}}finally{setBusy(false);}}
 async function finish(skipGuide=false){if(busy)return;setBusy(true);try{await onFinish(skipGuide);}finally{setBusy(false);}}
 useEffect(()=>{nextRef.current?.focus();sound.mood('town');},[index,sound]);
 useEffect(()=>{const next=openingScenes[index+1];if(next){const img=new Image();img.src='/art/prologue/'+next.art+'.webp';}},[index]);
 useEffect(()=>{actions.current={next:()=>{if(index===openingScenes.length-1)void finish();else void turn(index+1);},previous:()=>void turn(index-1),skip:()=>void finish(false)};});
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='ArrowRight'){e.preventDefault();actions.current.next();}else if(e.key==='ArrowLeft'){e.preventDefault();actions.current.previous();}else if(e.key==='Escape'){e.preventDefault();actions.current.skip();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 return <section className={'opening-screen '+(reduced||still?'opening-still':'')} role="dialog" aria-modal="true" aria-labelledby="opening-title" aria-describedby="opening-copy" data-scene={scene.id}>
 <div className="opening-art" key={scene.art+'-'+retry}><NextImage fill unoptimized priority sizes="100vw" src={'/art/prologue/'+scene.art+'.webp'+(retry?'?retry='+retry:'')} alt="" onError={()=>setFailedArt(true)}/></div><div className="opening-shade"/>
 <header className="opening-toolbar"><span>REVERIE <i/> {replay?'旅途回憶':'序章'}</span><div><GameButton aria-label={sound.settings.enabled?'關閉序章聲音':'開啟序章聲音'} onActivate={()=>sound.settings.enabled?sound.update({...sound.settings,enabled:false}):void sound.enable()}>{sound.settings.enabled?<Volume2 size={19}/>:<VolumeX size={19}/>}</GameButton><GameButton aria-label={reduced?'系統已減少分鏡動態':still?'開啟分鏡動態':'減少分鏡動態'} disabled={reduced} onActivate={()=>setStill(!still)}>{still||reduced?<Play size={18}/>:<Pause size={18}/>}</GameButton><GameButton onActivate={()=>void finish(false)} disabled={busy}>{replay?'返回冒險':'跳過序章'}</GameButton></div></header>
 <div className="opening-caption" key={scene.id}><div className="opening-kicker"><span>{scene.eyebrow}</span><b>{String(index+1).padStart(2,'0')} / 05</b></div><h1 id="opening-title">{scene.title}</h1><span className="opening-speaker">{scene.speaker}</span><div id="opening-copy"><p>{scene.text}</p><p>{scene.after}</p></div>
 {failedArt&&<div className="opening-art-error" role="status">分鏡圖片尚未載入，仍可繼續閱讀。<button onClick={()=>{setFailedArt(false);setRetry(v=>v+1);}}>重新載入CG</button></div>}{error&&<p className="opening-save-error" role="alert">{error}</p>}
 <div className="opening-navigation"><button aria-label="上一幕" disabled={busy||index===0} onClick={()=>void turn(index-1)}><ArrowLeft size={18}/></button><div className="opening-dots" aria-label="序章進度">{openingScenes.map((s,i)=><span key={s.id} className={i===index?'current':i<index?'read':''}/>)}</div><button ref={nextRef} className="opening-next" disabled={busy} onClick={()=>index===openingScenes.length-1?void finish(false):void turn(index+1)}>{busy?<LoaderCircle size={16} className="spin"/>:index===openingScenes.length-1?'進入晨鐘鎮':'下一幕'}<ArrowRight size={17}/></button></div>
 {index===openingScenes.length-1&&<button className="opening-free" disabled={busy} onClick={()=>void finish(true)}>自由探索，略過旅人指引</button>}<small className="opening-footnote">隨時可從旅人手札重看。聲音可自行開啟，點按或方向鍵翻頁。</small></div></section>;
}
export function TravelerGuide({progress,onDismiss,onNavigate,open,onOpenChange,showChip=true}:{progress:OpeningProgress;onDismiss:()=>void;onNavigate:(page:string)=>void;open:boolean;showChip?:boolean;onOpenChange:(value:boolean)=>void}){
 const next=guideSteps.find(s=>!progress.completed.includes(s.id)),active=!progress.guideDismissed&&Boolean(next);
 return <>{active&&showChip&&<aside className="traveler-guide-chip"><button onClick={()=>onOpenChange(true)} aria-label="開啟旅人指引"><BookOpen size={15}/><span><small>旅人指引 {progress.completed.length} / 6</small><strong>{next?.title}</strong></span><ArrowRight size={13}/></button><button aria-label="收起旅人指引" onClick={onDismiss}><X size={14}/></button></aside>}<Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="traveler-guide-dialog"><DialogHeader><span className="eyebrow">A PATH YOU CAN CHOOSE</span><DialogTitle>旅人指引</DialogTitle><DialogDescription>你可以自己選擇順序，隨時收起。指引只記錄已完成的體驗，不額外發獎，也不替你完成生活任務。</DialogDescription></DialogHeader><ol>{guideSteps.map((step,i)=><li key={step.id} className={progress.completed.includes(step.id)?'done':''}><span>{progress.completed.includes(step.id)?<Check size={17}/>:String(i+1).padStart(2,'0')}</span><div><h3>{step.title}</h3><p>{step.text}</p><button onClick={()=>{onOpenChange(false);onNavigate(step.page);}}>{step.action}<ArrowRight size={14}/></button></div></li>)}</ol><button className="secondary-button" onClick={()=>{onDismiss();onOpenChange(false);}}>收起指引，自由探索</button></DialogContent></Dialog></>;
}
