"use client";
import {useEffect, useState, type CSSProperties} from "react";
import {ArrowRight, Check, ChevronRight, Clock3, Compass, LoaderCircle, MessageCircle, RefreshCw, ScrollText, Sparkles} from "lucide-react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {SkillIcon} from "./character-avatar";
import {skillOf} from "@/lib/character-model";
import {npcOf, npcs, type Npc, type NpcId, type QuestBoardState, type QuestOffer} from "@/lib/quest-model";
import type {Dream} from "@/lib/dream-model";
import {appFetch} from "@/lib/client-api";

type Props = {dreams: Dream[]; busy: boolean; loading: boolean; onAccept: (offerId: string) => Promise<Dream | undefined>; onSelect: (dream: Dream) => void};
const statusText = {available: "可以接取", active: "修練中", complete: "已完成", archived: "已收起"};
export function NpcFullFigure({npc}: {npc: Npc}) {
  return <span className="npc-full-figure" role="img" aria-label={npc.name + "完整立繪"} style={{backgroundPosition: `${npc.portrait % 3 / 2 * 100}% ${Math.floor(npc.portrait / 3) * 100}%`}}/>;
}

export function NpcPortrait({npc, className = ""}: {npc: Npc; className?: string}) {
  return <span role="img" aria-label={`NPC ${npc.name}，${npc.role}`} className={"npc-portrait " + className} style={{backgroundPosition: `${npc.portrait % 3 * 50}% ${Math.floor(npc.portrait / 3) * 100}%`} as CSSProperties}/>;
}

export default function QuestHub({dreams, busy, loading, onAccept, onSelect}: Props) {
  const [data, setData] = useState<QuestBoardState | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<{npcId: NpcId; offerId?: string} | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void appFetch("/api/quests", {signal: controller.signal}).then(async response => {
      const body = await response.json() as QuestBoardState & {error?: string};
      if (!response.ok) throw new Error(body.error ?? "暫時無法讀取冒險委託");
      setData(body); setError("");
    }).catch(error => {if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "暫時無法讀取冒險委託");});
    return () => controller.abort();
  }, [refresh, dreams]);
  useEffect(() => {
    if (!data) return;
    // Relative server time keeps the refresh independent of the device clock.
    const timer = setTimeout(() => setRefresh(value => value + 1), Math.max(1000, Date.parse(data.nextResetAt) - Date.parse(data.serverTime) + 500));
    const resume = () => {if (document.visibilityState === "visible") setRefresh(value => value + 1);};
    document.addEventListener("visibilitychange", resume);
    return () => {clearTimeout(timer); document.removeEventListener("visibilitychange", resume);};
  }, [data]);

  const npc = selected ? npcOf(selected.npcId) : null;
  const choices = data && npc ? [...data.daily.filter(offer => offer.npcId === npc.id), ...data.introductions.filter(offer => offer.npcId === npc.id)] : [];
  const offer = choices.find(offer => offer.offerId === selected?.offerId) ?? choices.find(offer => offer.status === "available") ?? choices[0];
  const openExisting = (offer: QuestOffer) => {const dream = dreams.find(dream => dream.id === offer.dreamId); if (dream) {setSelected(null); onSelect(dream);} else setRefresh(value => value + 1);};
  async function accept(offer: QuestOffer) {
    const dream = await onAccept(offer.offerId);
    if (dream) {setSelected(null); onSelect(dream);}
    else setRefresh(value => value + 1);
  }

  return <section className="quest-hub" aria-label="可接取的冒險委託">
    <div className="quest-discovery-note"><Compass size={23}/><div><strong>還沒想好目標？先接一個小委託。</strong><p>每天 3 個輕鬆選擇，從生活裡的小事練出你的角色。</p></div></div>
    {error ? <div className="quest-service-error" role="alert"><p>{error}</p><button className="secondary-button" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={15}/>重新讀取委託</button></div> : !data ? <div className="loading-panel" role="status"><LoaderCircle className="spin"/>看看大家今天有什麼委託…</div> : <>
      <div className="rpg-block-heading daily-section-heading"><div><span className="eyebrow">TODAY · SMALL ADVENTURES</span><h2>今日冒險委託</h2></div><span>{data.daily.filter(offer => offer.status !== "available").length} / 3 已接取</span></div>
      <p className="daily-refresh-note"><Clock3 size={12}/>每日 04:00 更新・台北時間<span>接下後不過期</span></p>
      <div className="daily-offer-list">{data.daily.map(offer => {
        const author = npcOf(offer.npcId)!;
        return <button key={offer.offerId} className={"daily-offer-card is-" + offer.status} onClick={() => setSelected({npcId: author.id, offerId: offer.offerId})} style={{"--npc-color": author.color} as CSSProperties}><span className="daily-portrait-frame"><NpcPortrait npc={author}/><span><SkillIcon skill={offer.skill} size={12}/></span></span><span className="daily-offer-copy"><span className="daily-offer-author">{author.name}的委託 <span>輕鬆・{offer.minutes} 分鐘</span></span><strong>{offer.title}</strong><span className="daily-offer-rewards">{offer.status === "complete" ? <><Check size={12}/>首次成長已保存</> : <><b>{offer.xp} XP</b><span><Sparkles size={11}/>{offer.coins}</span><span>{skillOf(offer.skill)?.name}</span></>}</span></span><span className={"offer-status " + offer.status}>{offer.status === "available" ? <><span>接取</span><ChevronRight size={15}/></> : statusText[offer.status]}</span></button>;
      })}</div>
      <div className="rpg-block-heading npc-section-heading"><div><span className="eyebrow">THE PEOPLE OF MORNINGBELL</span><h2>晨鐘鎮的夥伴</h2></div><MessageCircle size={20}/></div><p className="npc-section-note">認識一位夥伴，接下第一份修練。每份初識委託約 2～4 分鐘。</p>
      <div className="npc-grid">{npcs.map(npc => {
        const intro = data.introductions.find(offer => offer.npcId === npc.id)!;
        const daily = data.daily.find(offer => offer.npcId === npc.id && offer.status === "available");
        return <button key={npc.id} className={"npc-card " + intro.status} aria-label={`拜訪${npc.name}，${npc.role}`} style={{"--npc-color": npc.color} as CSSProperties} onClick={() => setSelected({npcId: npc.id, offerId: intro.status === "available" ? intro.offerId : daily?.offerId ?? intro.offerId})}><span className="npc-card-art"><NpcPortrait npc={npc}/></span><span className="npc-card-copy"><strong>{npc.name}<small>{npc.role}</small></strong><span>{intro.status === "complete" ? <><Check size={10}/>已完成初識</> : intro.status === "active" ? "初識修練中" : intro.status === "archived" ? "初識委託已收起" : <><ScrollText size={11}/>有初識委託</>}</span></span><ChevronRight size={14}/></button>;
      })}</div>
      <p className="rpg-footnote">每天換一些靈感，也可以只挑想做的一件。依自己的狀態調整，不需要連續登入。</p>
    </>}
    <Dialog open={Boolean(npc && offer)} onOpenChange={open => {if (!open && !busy) setSelected(null);}}><DialogContent className="npc-dialog">{npc && offer && <>
      <div className="npc-dialog-scene" style={{"--npc-color": npc.color} as CSSProperties}><NpcPortrait npc={npc}/><DialogHeader><span className="eyebrow">{npc.location}</span><DialogTitle>{npc.name}<small>{npc.role}</small></DialogTitle><DialogDescription>{offer.status === "complete" ? npc.thanks : npc.greeting}</DialogDescription></DialogHeader></div>
      <div className="npc-dialog-body"><details className="npc-lore"><summary>關於{npc.name}</summary><p>{npc.personality}</p></details>
        {choices.length > 1 && <div className="npc-offer-choices" aria-label="這位 NPC 的委託">{choices.map(choice => <button key={choice.offerId} aria-pressed={choice.offerId === offer.offerId} onClick={() => setSelected({npcId: npc.id, offerId: choice.offerId})}>{choice.kind === "daily" ? "今日委託" : "初識委託"}{choice.status === "complete" && <Check size={12}/>}</button>)}</div>}
        <div className="npc-quest-title"><div><span className="quest-difficulty"><Clock3 size={12}/>輕鬆・約 {offer.minutes} 分鐘</span><h3>{offer.title}</h3></div><span className="npc-skill-tag"><SkillIcon skill={offer.skill} size={15}/>{skillOf(offer.skill)?.name}</span></div><p className="npc-quest-description">{offer.description}</p>
        <ol className="npc-quest-steps">{offer.steps.map((step, index) => <li key={step.title}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{step.title}</strong>{step.alternative && <small>也可以：{step.alternative}</small>}</div></li>)}</ol>
        <div className="npc-quest-rewards"><span>首次完成整份委託</span><strong>{offer.xp} <small>XP</small></strong><strong><Sparkles size={14}/>{offer.coins} <small>星露</small></strong></div>
        <p className="npc-quest-reward-note">每步 +40 XP、20 熟練，整份首次完成再 +100 XP。接下後可慢慢完成，跨日仍保留。</p>
        {offer.status === "available" ? <button className="primary-button accept-offer-button" disabled={busy || loading} onClick={() => void accept(offer)}>{busy ? <LoaderCircle className="spin" size={17}/> : <ScrollText size={17}/>}接下這份委託<ArrowRight size={17}/></button> : <button className="secondary-button accept-offer-button" disabled={busy || !offer.dreamId} onClick={() => openExisting(offer)}>{offer.status === "complete" ? <Check size={16}/> : <ScrollText size={16}/>} {offer.dreamId ? offer.status === "complete" ? "查看完成紀錄" : "繼續這份委託" : statusText[offer.status]}</button>}
      </div>
    </>}</DialogContent></Dialog>
  </section>;
}
