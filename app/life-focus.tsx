"use client";
import {useState} from "react";
import {ArrowLeft, ArrowRight, Check, Leaf, Sparkles} from "lucide-react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {skillOf, defaultTraining} from "@/lib/character-model";
import type {Dream, Task} from "@/lib/dream-model";
import {episodeOf} from "@/lib/adventure-catalog";

export default function LifeFocus({dream, busy, onComplete, onClose}: {dream: Dream | undefined; busy: boolean; onComplete: (dream: Dream, task: Task) => Promise<unknown>; onClose: () => void}) {
  const [error, setError] = useState("");
  const isTrial = !!(dream?.story && episodeOf(dream.story.episodeId)?.enemyId);
  const task = dream?.tasks.find(task => !task.done), done = dream?.tasks.filter(task => task.done).length ?? 0;
  const finish = async () => {if (!dream || !task || busy) return;try {await onComplete(dream, task);setError("");} catch (error) {setError(error instanceof Error ? error.message : "暫時無法保存成長");}};
  return <Dialog open={!!dream} onOpenChange={open => {if (!open && !busy) onClose();}}><DialogContent className="life-focus-dialog" showCloseButton={false}>{dream && <><button className="life-focus-back text-button" disabled={busy} onClick={onClose}><ArrowLeft size={15}/>先回到旅途</button><DialogHeader><span className="eyebrow">{task ? "A SMALL STEP, IN REAL LIFE" : "YOUR GROWTH RETURNS WITH YOU"}</span><DialogTitle>{task ? <>讓角色的下一步，<br/>發生在生活裡。</> : "你把成長帶回來了。"}</DialogTitle><DialogDescription>{dream.title}</DialogDescription></DialogHeader><div className="life-step-path" aria-label={`${done} / ${dream.tasks.length} 個行動已完成`}>{dream.tasks.map((item, index) => <span key={item.id} className={item.done ? "done" : task?.id === item.id ? "current" : ""}>{item.done ? <Check size={15}/> : index + 1}</span>)}</div>{task ? <><div className="life-action-card"><span><Leaf size={18}/>{skillOf(task.training ?? defaultTraining(dream.category))?.name}・第 {done + 1} 步</span><h2>{task.title}</h2><p>可以先放下手機，到生活中做完再回來。沒有倒數，不需要一直開著遊戲，晚點繼續也沒關係。</p></div><button className="primary-button life-focus-primary" disabled={busy} onClick={() => void finish()}><Check size={19}/>{busy ? "正在留下成長…" : "我已在生活中完成"}</button>{error && <p role="alert">{error}</p>}<div className="life-reward-note"><Sparkles size={15}/>{task.trainingLocked ? "這一步的首次成長已留下" : "首次完成 +40 XP・技能熟練・25 星露"}</div><button className="text-button" onClick={onClose} disabled={busy}>先去做，稍後再回來</button></> : <div className="life-complete"><Sparkles size={42}/><h2>{isTrial ? "回聲之門，正在等你。" : "這份修練，已成為你的力量。"}</h2><p>{isTrial ? "你完成了生活修練。回到場景，前往試煉，把故事帶向下一段。" : "每一個真正完成的小步驟，都留在你的角色裡。回到小鎮，繼續自己的旅程。"}</p><button className="primary-button" onClick={onClose}>回到冒險<ArrowRight size={17}/></button></div>}</>}</DialogContent></Dialog>;
}
