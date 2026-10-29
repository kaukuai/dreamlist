"use client";
import {useState} from "react";
import {ArrowRight, BookOpen, Check, ChevronRight, LoaderCircle, Plus, Sparkles, Swords, Target} from "lucide-react";
import {Checkbox} from "@/components/ui/checkbox";
import {Progress} from "@/components/ui/progress";
import CharacterAvatar, {ProfessionIcon, SkillIcon} from "./character-avatar";
import {PanelHeading} from "./rpg-ui";
import QuestHub from "./quest-hub";
import {npcOf,questOf} from "@/lib/quest-model";
import {defaultTraining, jobTitle, skillOf, type CharacterState} from "@/lib/character-model";
import {getStats, progressOf, type Dream, type Task} from "@/lib/dream-model";

type Props = {dreams: Dream[]; character: CharacterState | null; loading: boolean; busy: boolean; onStart: () => void; onSelect: (dream: Dream) => void; onToggle: (dream: Dream, task: Task, done: boolean) => void; onCharacter: () => void; onProfessions: () => void; onAccept: (offerId: string) => Promise<Dream | undefined>; onAdventure?: () => void};
export default function QuestBoard({dreams, character, loading, busy, onStart, onSelect, onToggle, onCharacter, onProfessions, onAccept, onAdventure}: Props) {
  const [filter, setFilter] = useState<"discover" | "active" | "goals">("discover");
  const [visible, setVisible] = useState(12);
  const [taskStatus, setTaskStatus] = useState<"active" | "complete">("active");
  const journalDreams = dreams.filter(dream => !dream.quest && !dream.story);
  const stats = getStats(dreams);
  const tasks = dreams.flatMap(dream => dream.tasks.map(task => ({dream, task}))).filter(({task}) => taskStatus === "complete" ? task.done : !task.done);
  const activeCount = stats.total - stats.completed;
  return <main className="quest-page">
    <PanelHeading eyebrow="YOUR REAL-WORLD ADVENTURE" title="任務大廳" aside={<button className="rpg-icon-button" aria-label="建立任務" disabled={busy || loading} onClick={onStart}><Plus size={22}/></button>}/>
    <section className="quest-hero" aria-label="冒險者成長摘要">{character && <><div className="quest-hero-copy"><span className="job-insignia"><ProfessionIcon profession={character.profession} size={13}/>{jobTitle(character.profession, character.advancements[character.profession])}</span><h2>{dreams.length ? <>每一次行動，<br/>都是你的修練。</> : <>不必想好夢想，<br/>也能開始冒險。</>}</h2><button onClick={onCharacter}>{character.name} <span>Lv.{character.level}</span><ChevronRight size={14}/></button></div><CharacterAvatar character={character}/><div className="quest-hero-xp"><div><strong>Lv.{character.level}</strong><span>{character.xpInLevel} / {character.xpForNext} XP</span></div><Progress value={character.xpInLevel / character.xpForNext * 100} aria-label="角色升級進度"/></div></>}{!character && <div className="quest-hero-copy"><span className="eyebrow">REVERIE · LIFE RPG</span><h2>讓現實的成長，<br/>成為你的力量。</h2></div>}</section>
    {onAdventure && <button className="chronicle-entry" onClick={onAdventure}><span><small>NEW ADVENTURE · 第一卷</small><strong>無聲晨鐘</strong><em>4 個區域・9 段主線・6 位夥伴的故事</em></span><span className="chronicle-entry-action">展開冒險<ArrowRight size={17}/></span></button>}
    {filter !== "discover" && <div className="quest-overview"><div><strong>{activeCount}</strong><span>待完成行動</span></div><div><strong>{stats.fulfilled}</strong><span>已完成篇章</span></div><button onClick={onProfessions}><Swords size={20}/><span>職業進化<ChevronRight size={13}/></span></button></div>}
    <div className="quest-list-header"><div className="rpg-segmented quest-main-tabs" aria-label="任務分類">{[{id: "discover", label: "接取任務"}, {id: "active", label: "我的任務"}, {id: "goals", label: "目標旅誌"}].map(item => <button key={item.id} aria-pressed={filter === item.id} onClick={() => {setFilter(item.id as typeof filter); setVisible(12);}}>{item.label}</button>)}</div></div>
    {filter === "active" && <div className="quest-status-tabs" aria-label="我的任務狀態">{[{id:"active",label:"進行中"},{id:"complete",label:"已完成"}].map(item=><button key={item.id} aria-pressed={taskStatus===item.id} onClick={()=>{setTaskStatus(item.id as typeof taskStatus);setVisible(12);}}>{item.label}</button>)}</div>}
    {filter === "discover" ? <QuestHub dreams={dreams} busy={busy} loading={loading} onAccept={onAccept} onSelect={onSelect}/> : loading ? <div className="loading-panel" role="status"><LoaderCircle className="spin"/>正在讀取任務…</div> : filter === "goals" ? <section className="quest-goal-list" aria-label="人生目標">{journalDreams.length ? journalDreams.map(dream => <button key={dream.id} onClick={() => onSelect(dream)}><BookOpen size={20}/><div><strong>{dream.title}</strong><span>{dream.tasks.filter(task => task.done).length} / {dream.tasks.length} 行動已完成</span><Progress value={progressOf(dream)} aria-label={dream.title + "完成進度"}/></div><b>{progressOf(dream)}%</b><ChevronRight size={17}/></button>) : <EmptyQuests onStart={onStart} onDiscover={()=>setFilter("discover")}/>}</section> : tasks.length ? <>
      <section className="quest-task-list" aria-label={taskStatus === "active" ? "進行中的行動任務" : "已完成的行動任務"}>{tasks.slice(0, visible).map(({dream, task}) => {
        const training = task.training ?? defaultTraining(dream.category);
        const awarded = task.done || task.trainingLocked;
        return <article className={"quest-task " + (task.done ? "is-complete" : "")} key={dream.id + ":" + task.id}><span className={"quest-task-sigil " + training}><SkillIcon skill={training} size={23}/></span><div className="quest-task-copy"><button className="quest-goal-link" onClick={() => onSelect(dream)}>{dream.title}<ChevronRight size={11}/></button><h3>{task.title}</h3><span className="quest-training-label">{dream.quest ? `${npcOf(dream.quest.npcId)?.name ?? "NPC"}・${dream.quest.kind === "daily" ? "每日委託" : questOf(dream.quest.templateId)?.requires?"夥伴委託":"初識委託"} · ` : dream.story ? "編年史修練 · " : ""}{skillOf(training)?.name}{dream.targetDate ? ` · ${dream.targetDate}` : ""}</span><div className="quest-rewards">{awarded ? <span className="reward-recorded"><Check size={11}/>首次獎勵已保存</span> : <><span>40 <b>XP</b></span><span><Sparkles size={11}/>25 星露</span><span>20 熟練</span></>}</div></div><Checkbox className="quest-checkbox" checked={task.done} disabled={busy} onCheckedChange={checked => onToggle(dream, task, checked === true)} aria-label={(task.done ? "取消完成任務：" : "完成任務：") + task.title}/></article>;
      })}</section>{visible < tasks.length && <button className="quest-more-button" onClick={() => setVisible(value => value + 12)}>顯示更多任務（還有 {tasks.length - visible} 個）</button>}
    </> : taskStatus === "complete" ? <div className="rpg-empty"><Check size={34}/><h3>你的第一份完成紀錄，從今天開始。</h3><p>在生活中完成一項行動，再回來標記它。</p></div> : <EmptyQuests onStart={onStart} onDiscover={()=>setFilter("discover")}/>}
    {filter !== "discover" && dreams.length > 0 && <button className="quest-create-button" onClick={onStart} disabled={busy}><Plus size={18}/>建立新的目標任務</button>}
    <p className="rpg-footnote">每一步首次完成 +40 XP；整個目標首次達成再 +100 XP。依自己的節奏前進。</p>
  </main>;
}
function EmptyQuests({onStart, onDiscover}: {onStart: () => void; onDiscover: () => void}) {return <div className="rpg-empty quest-empty"><Target size={40}/><h3>先從一件輕鬆的小事開始。</h3><p>夥伴們準備了不用先設定夢想的生活委託。</p><button className="primary-button" onClick={onDiscover}>看看可接取的任務 <ArrowRight size={17}/></button><button className="text-button" onClick={onStart}><Plus size={15}/>建立自己的目標</button></div>;}
