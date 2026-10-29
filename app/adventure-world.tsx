"use client";
import {useCallback, useEffect, useRef, useState, type CSSProperties} from "react";
import {ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Compass, Crown, Flame, Gem, Hammer, Heart, LoaderCircle, LockKeyhole, Map, MoonStar, ScrollText, Shield, Sparkles, Star, Swords, Users, X} from "lucide-react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Progress} from "@/components/ui/progress";
import {toast} from "sonner";
import {appFetch} from "@/lib/client-api";
import {battleIntent, professionMoves, type AdventureView, type BattleMove} from "@/lib/adventure-model";
import {enemies, enemyOf, materials, regions, type RegionId} from "@/lib/adventure-catalog";
import {npcOf} from "@/lib/quest-model";
import {skillOf, type CharacterState} from "@/lib/character-model";
import CharacterAvatar, {SkillIcon} from "./character-avatar";
import {NpcPortrait} from "./quest-hub";
import {PanelHeading} from "./rpg-ui";
import ActionArena from "./action-arena";
import {useGameSound} from "./game-sound";

type Episode = AdventureView["episodes"][number];
type Props = {character: CharacterState | null; progressStamp: string; onRefresh: () => Promise<unknown>; onQuest: (id: string) => void; onExit: () => void; initialEpisodeId?: string; encounter?: boolean};
const statusNames = {available: "可以啟程", active: "生活修練中", ready: "準備好試煉", cleared: "回聲已尋回", locked: "尚未開啟"};
const regionStyle = (id: RegionId): CSSProperties => {
  const region = regions.find(region => region.id === id)!;
  return {"--region-color": region.color, backgroundPosition: `${region.art % 2 * 100}% ${Math.floor(region.art / 2) * 100}%`} as CSSProperties;
};

export default function AdventureWorld({character, progressStamp, onRefresh, onQuest, onExit, initialEpisodeId, encounter = false}: Props) {
  const sound = useGameSound();
  const [data, setData] = useState<AdventureView | null>(null);
  const [tab, setTab] = useState<"world" | "companions" | "forge" | "codex">("world");
  const [region, setRegion] = useState<RegionId>("morningbell");
  const [selectedId, setSelectedId] = useState<string | null>(initialEpisodeId ?? null);
  const [scene, setScene] = useState(0);
  const [showBattle, setShowBattle] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false), sequence = useRef(0), firstLoad = useRef(true);
  const load = useCallback((signal?: AbortSignal) => {
    const version = ++sequence.current;
    return appFetch("/api/adventure", {signal}).then(async response => {
      const body = await response.json() as {adventure?: AdventureView; error?: string};
      if (!response.ok || !body.adventure) throw new Error(body.error ?? "暫時無法讀取冒險紀錄");
      return body.adventure;
    }).then(adventure => {if (version === sequence.current) {setData(adventure);setError("");if (firstLoad.current) {firstLoad.current = false;if (encounter && adventure.battle && adventure.battle.episodeId === initialEpisodeId && adventure.battle.phase === "active") setShowBattle(true);}}})
      .catch(error => {if (!signal?.aborted && version === sequence.current) setError(error instanceof Error ? error.message : "暫時無法讀取冒險");});
  }, [encounter, initialEpisodeId]);
  useEffect(() => {const controller = new AbortController();void load(controller.signal);return () => controller.abort();}, [load, progressStamp]);
  useEffect(() => {const refresh = (event: StorageEvent) => {if (event.key === "dreamlist:browser-preview:v1") void load();};window.addEventListener("storage", refresh);return () => window.removeEventListener("storage", refresh);}, [load]);
  async function act(action: object) {
    if (lock.current) return;
    lock.current = true;setBusy(true);const version = ++sequence.current;
    try {
      const response = await appFetch("/api/adventure", {method: "POST", body: JSON.stringify(action)});
      const body = await response.json() as {adventure?: AdventureView; error?: string};
      if (!response.ok || !body.adventure) {if (response.status === 409) void load();throw new Error(body.error ?? "暫時無法保存冒險");}
      if (version === sequence.current) {setData(body.adventure);setError("");}if ((action as {action?: string}).action === "claimEpisode") sound.cue("win");await onRefresh();return body.adventure;
    } catch (error) {setError(error instanceof Error ? error.message : "暫時無法保存冒險");}
    finally {lock.current = false;setBusy(false);}
  }
  const open = (episode: Episode) => {setScene(0);setSelectedId(episode.id);};
  const chooseTab = (next: typeof tab) => {setTab(next);window.scrollTo({top: 0, behavior: "instant"});};
  const openQuest = (episode: Episode) => {if (episode.entry) {setSelectedId(null);onQuest(episode.entry.dreamId);}};
  const begin = async (episode: Episode, choiceId: string) => {
    const updated = await act({action: "beginEpisode", episodeId: episode.id, choiceId});
    const entry = updated?.episodes.find(item => item.id === episode.id)?.entry;
    if (entry) {setSelectedId(null);onQuest(entry.dreamId);}
  };
  const fight = async (episode: Episode) => {
    const updated = await act({action: "startBattle", episodeId: episode.id, mode: "action"});
    if (updated?.battle) {toast.dismiss();setSelectedId(null);setShowBattle(true);window.scrollTo({top: 0, behavior: "instant"});}
  };
  if (!data || !character) return <main className="rpg-page adventure-page"><PanelHeading eyebrow="THE MORNINGBELL CHRONICLES" title="世界冒險"/>{error ? <div className="rpg-empty" role="alert"><p>{error}</p><button className="secondary-button" onClick={() => void load()}>重新讀取</button></div> : <div className="loading-panel" role="status"><LoaderCircle className="spin"/>正在展開世界地圖…</div>}</main>;
  const selected = data.episodes.find(episode => episode.id === selectedId);
  const activeRegion = data.regions.find(item => item.id === region)!;
  const next = data.episodes.find(episode => episode.kind === "main" && episode.status !== "cleared");
  const activeBattleEpisode = data.episodes.find(episode => episode.id === data.battle?.episodeId);
  if (showBattle && data.battle) {
    const back = () => {if (encounter) onExit();else setShowBattle(false);};
    const story = () => {setShowBattle(false);if (activeBattleEpisode) open(activeBattleEpisode);};
    if (data.battle.arena) return <ActionArena key={data.battle.id} data={data} character={character} error={error} onAction={act} onBack={back} onStory={story}/>;
    const tactical = <BattlePanel data={data} character={character} busy={busy} error={error} onAction={act} onBack={back} onStory={story}/>;
    return encounter ? <div className="field-legacy-battle">{tactical}</div> : tactical;
  }

  return <main className={"rpg-page adventure-page" + (encounter ? " encounter-mode" : "")}>
    <button className="world-back text-button" onClick={onExit}><ArrowLeft size={15}/>任務大廳</button>
    <PanelHeading eyebrow="THE MORNINGBELL CHRONICLES" title="世界冒險" aside={<span className="resource-tag"><Sparkles size={13}/>{data.balance}</span>}/>
    {error && <div className="adventure-error" role="alert">{error}</div>}
    <nav className="adventure-tabs" aria-label="冒險內容">{[{id: "world", label: "世界", Icon: Map}, {id: "companions", label: "夥伴", Icon: Users}, {id: "forge", label: "工坊", Icon: Hammer}, {id: "codex", label: "圖鑑", Icon: BookOpen}].map(item => <button key={item.id} aria-pressed={tab === item.id} onClick={() => chooseTab(item.id as typeof tab)}><item.Icon size={17}/>{item.label}</button>)}</nav>
    {data.battle?.phase === "active" && <button className="battle-resume" onClick={() => setShowBattle(true)}><Swords size={20}/><span>試煉尚未結束<small>{enemyOf(data.battle.enemyId)?.name}・第 {data.battle.turn} 回合</small></span><ChevronRight size={18}/></button>}
    {tab === "world" && <>
      <section className="chronicle-banner"><span className="eyebrow">THE SILENT BELL · AFTER ECHOES</span><h2>無聲晨鐘・星頁餘響</h2><p>當世界逐漸忘記名字，你的每一次生活行動，<br/>都會成為尋回回聲的力量。</p><div><span>{data.mainCleared} / {data.mainTotal} 第一卷與卷外篇</span><span>4 個故事區域・6 位夥伴</span></div><Progress value={data.mainCleared / data.mainTotal * 100} aria-label="第一卷與卷外篇進度"/></section>
      <WorldMap regions={data.regions} active={region} onSelect={setRegion}/>
      {next ? <button className="next-story-card" onClick={() => {setRegion(next.region);open(next);}}><span className="story-seal"><ScrollText size={24}/></span><span><small>{next.act}・{statusNames[next.status]}</small><strong>{next.title}</strong><em>{next.status === "active" ? "繼續生活修練，讓故事向前" : next.status === "ready" ? "生活修練完成，準備面對試煉" : "讀一段故事，選擇自己的下一步"}</em></span><ArrowRight size={20}/></button> : <section className="volume-complete"><Crown size={30}/><h3>第一卷・回聲已歸來</h3><p>{data.ending?.text}</p><button className="secondary-button" onClick={() => chooseTab("codex")}>翻閱我們的故事<BookOpen size={16}/></button></section>}
      <div className="region-selector" aria-label="世界區域">{data.regions.map(item => <button key={item.id} aria-pressed={region === item.id} disabled={!item.unlocked} onClick={() => setRegion(item.id)}><span className="region-card-art" style={regionStyle(item.id)}/><span><strong>{item.name}</strong><small>{item.unlocked ? item.subtitle : "前一幕完成後開放"}</small></span>{!item.unlocked && <LockKeyhole size={15}/>}</button>)}</div>
      <section className="region-chapters"><div className="rpg-block-heading"><h2>{activeRegion.name}</h2><span>主線篇章</span></div><p>{activeRegion.description}</p><div className="episode-list">{data.episodes.filter(episode => episode.kind === "main" && episode.region === region).map(episode => <EpisodeCard key={episode.id} episode={episode} onOpen={() => open(episode)}/>)}</div></section>
      <section className="journey-rhythm"><div><span className="eyebrow">YOUR OWN PACE</span><h3>替生活留一點冒險</h3><p>本週新完成 <strong>{data.rhythm.count}</strong> 個生活行動</p></div><span className="rhythm-mark">{data.rhythm.count >= data.rhythm.target ? <Check size={25}/> : <Star size={25}/>}</span><div className="rhythm-targets" aria-label="每週自選行動目標">{[2, 4, 6].map(target => <button key={target} disabled={busy} aria-pressed={data.rhythm.target === target} onClick={() => void act({action: "setRhythm", target})}>{target} 步</button>)}</div><Progress value={Math.min(100, data.rhythm.count / data.rhythm.target * 100)} aria-label="本週自選行動進度"/><small>{data.rhythm.count >= data.rhythm.target ? "這週的目標已達成。想繼續或先休息，都由你決定。" : "只是一個自己選的小方向，不是必須每天完成的功課。"} 沒有斷簽扣分。</small></section>
    </>}
    {tab === "companions" && <><section className="adventure-intro"><span className="eyebrow">SIX LIVES, SIX UNTOLD STORIES</span><h2>不只發任務的人</h2><p>完成夥伴的生活委託，或在主線與他同行，會慢慢讀到他不曾說出口的故事。</p></section><div className="companion-stories">{data.companions.map(npc => {
      const episode = data.episodes.find(episode => episode.bondNpc === npc.id)!;
      return <article className="companion-story" key={npc.id} style={{"--npc-color": npc.color} as CSSProperties}><div className="companion-portrait"><NpcPortrait npc={npc}/></div><div className="companion-copy"><span>{npc.role}</span><h3>{npc.name}<small>{npc.bond}</small></h3><p>{episode.summary}</p><div className="bond-pips" aria-label={`${npc.points} 點同行紀錄`}>{[1, 2, 5, 9].map(point => <Heart key={point} size={13} className={npc.points >= point ? "lit" : ""}/>)}</div><button className={episode.status === "locked" ? "secondary-button" : "primary-button"} onClick={() => episode.status === "locked" ? onExit() : open(episode)}>{episode.status === "locked" ? "先接一份夥伴委託" : episode.status === "cleared" ? "重溫夥伴故事" : episode.status === "active" || episode.status === "ready" ? "繼續這段故事" : "聽聽他的故事"}<ChevronRight size={15}/></button></div></article>;
    })}</div></>}
    {tab === "forge" && <Forge data={data} busy={busy} onAction={act}/>}
    {tab === "codex" && <>
      <section className="adventure-intro"><span className="eyebrow">MEMORIES THAT STAY</span><h2>回聲圖鑑 <small>{data.memories.length} / {data.episodes.length}</small></h2><p>留下來的不只是獎勵，也是你親自走過的故事。沒有期限，沒有錯過就消失的收藏。</p></section>
      <div className="memory-grid">{data.episodes.map(episode => <button key={episode.id} disabled={episode.status !== "cleared"} className={episode.status === "cleared" ? "found" : "unknown"} onClick={() => open(episode)}>{episode.status === "cleared" ? <BookOpen size={25}/> : <LockKeyhole size={24}/>}<small>{episode.kind === "main" ? `主線 ${episode.number}` : "夥伴回聲"}</small><strong>{episode.status === "cleared" ? episode.memory.title : "尚未尋回的故事"}</strong></button>)}</div>
      <section className="earned-titles"><div className="rpg-block-heading"><h3>旅程稱號</h3><Crown size={19}/></div>{data.titles.length ? data.titles.map(title => <button key={title} disabled={busy} aria-pressed={data.equippedTitle === title} onClick={() => void act({action: "equipTitle", title: data.equippedTitle === title ? null : title})}><Crown size={16}/><span>{title}</span><small>{data.equippedTitle === title ? "使用中・點選卸下" : "使用稱號"}</small></button>) : <p>完成每一幕的終章，留下屬於你的名字。</p>}</section>
      <section className="bestiary"><div className="rpg-block-heading"><h3>試煉見聞</h3><span>{data.episodes.filter(episode => episode.enemyId && episode.status === "cleared").length} / {enemies.length}</span></div>{data.episodes.filter(episode => episode.enemyId && episode.status === "cleared").map(episode => {const enemy = enemyOf(episode.enemyId!)!;return <article key={enemy.id}><EnemyFigure kind={enemy.kind}/><div><h4>{enemy.name}{enemy.boss && <small>守關者</small>}</h4><p>{enemy.lore}</p></div></article>;})}</section>
    </>}
    <p className="rpg-footnote">生活行動帶來角色 XP；戰鬥與故事帶來固定的首次收藏。<br/>可以暫停、休息，再沿著原來的路繼續。</p>
    <Dialog open={Boolean(selected)} onOpenChange={open => {if (!open && !busy) {setSelectedId(null);if (encounter) onExit();}}}><DialogContent className="story-dialog" showCloseButton={false}>{selected && <>
      <button className="story-close rpg-icon-button" aria-label="關閉故事" disabled={busy} onClick={() => {setSelectedId(null);if (encounter) onExit();}}><X size={19}/></button>
      <div className="story-scene" style={regionStyle(selected.region)}><span className="story-scene-shade"/>{(() => {const speaker = selected.entry ? selected.choices.find(choice => choice.id === selected.entry!.choiceId)?.npcId : selected.intro[scene].speaker;const npc = npcOf(speaker ?? "");return npc ? <NpcPortrait npc={npc}/> : null;})()}<DialogHeader><span className="eyebrow">{selected.act}・{regions.find(region => region.id === selected.region)?.name}</span><DialogTitle>{selected.title}</DialogTitle><DialogDescription>{selected.summary}</DialogDescription></DialogHeader></div>
      <div className="story-dialog-body">
        {!selected.entry ? <>{encounter ? <div className="story-dialogue encounter-dialogue">{selected.intro.map((line, index) => <div key={index}><small>{npcOf(line.speaker)?.name ?? "旅程旁白"}</small><p>{line.text}</p></div>)}</div> : <div className="story-dialogue"><small>{npcOf(selected.intro[scene].speaker)?.name ?? "旅程旁白"}<span>{scene + 1} / {selected.intro.length}</span></small><p>{selected.intro[scene].text}</p></div>}{!encounter && scene < selected.intro.length - 1 ? <button className="primary-button story-primary" onClick={() => setScene(value => value + 1)}>下一段對話<ArrowRight size={16}/></button> : <><h3 className="story-choice-heading">這一次，你想怎麼靠近？</h3><div className="story-choices">{selected.choices.map(choice => <button key={choice.id} disabled={busy} onClick={() => void begin(selected, choice.id)}><SkillIcon skill={choice.skill} size={21}/><span><strong>{choice.label}</strong><small>{skillOf(choice.skill)?.name}・{choice.steps.length} 個輕量行動</small></span><ChevronRight size={17}/></button>)}</div><p className="story-choice-note">選擇影響這段修練與故事回應，不會封鎖職業或後續篇章。接取不發獎。</p></>}</> : <>
          <p className="chosen-path"><Compass size={14}/>{selected.choices.find(choice => choice.id === selected.entry!.choiceId)?.label}</p>
          {selected.status === "cleared" ? <><p className="story-ending">{selected.ending}</p><blockquote>{selected.memory.text}</blockquote>{selected.id === "bell-09" && <p className="story-ending personal-ending">{data.ending?.text}</p>}<div className="story-cleared"><Check size={17}/>首次回聲與獎勵已保存</div>{selected.kind === "main" && next && <button className="primary-button story-primary" onClick={() => {setRegion(next.region);open(next);}}>前往下一篇章<ArrowRight size={16}/></button>}{selected.enemyId && <button className="secondary-button story-primary" disabled={busy} onClick={() => void fight(selected)}>再度挑戰・不重複發獎<Swords size={16}/></button>}</> : <><p className="story-response">{selected.choices.find(choice => choice.id === selected.entry!.choiceId)?.response}</p><div className="story-training-progress"><span>生活修練</span><strong>{selected.completedSteps} / {selected.totalSteps}</strong><Progress value={selected.totalSteps ? selected.completedSteps / selected.totalSteps * 100 : 0} aria-label="篇章生活修練進度"/></div>{selected.status === "active" ? <button className="primary-button story-primary" onClick={() => openQuest(selected)}>繼續生活修練<ArrowRight size={17}/></button> : selected.enemyId && !(data.battle?.episodeId === selected.id && data.battle.phase === "won" && !data.battle.practice) ? <button className="primary-button story-primary" disabled={busy} onClick={() => void fight(selected)}><Swords size={18}/>{data.battle?.episodeId === selected.id && data.battle.phase === "active" ? "繼續這場試煉" : "進入回聲試煉"}</button> : <button className="primary-button story-primary" disabled={busy} onClick={() => void act({action: "claimEpisode", episodeId: selected.id})}>{busy ? <LoaderCircle size={17} className="spin"/> : <Sparkles size={17}/>}收下回聲，完成篇章</button>}<div className="story-loot"><span>故事首次完成</span><strong>{selected.reward.gold} 星露</strong><small>{Object.entries(selected.reward.materials).map(([id, amount]) => `${materials.find(material => material.id === id)?.name} ×${amount}`).join("・")}</small>{selected.reward.title && <small>稱號「{selected.reward.title}」</small>}</div></>}
          <details className="story-recap"><summary>回顧開場對話</summary>{selected.intro.map((line, index) => <p key={index}><strong>{npcOf(line.speaker)?.name ?? "旁白"}</strong>{line.text}</p>)}</details>
        </>}
      </div>
    </>}</DialogContent></Dialog>
  </main>;
}

function EpisodeCard({episode, onOpen}: {episode: Episode; onOpen: () => void}) {
  return <button className={"episode-card " + episode.status} disabled={episode.status === "locked"} onClick={onOpen}><span className="episode-number">{episode.status === "cleared" ? <Check size={20}/> : episode.status === "locked" ? <LockKeyhole size={19}/> : episode.number}</span><span><small>{episode.act}・{statusNames[episode.status]}</small><strong>{episode.title}</strong><p>{episode.summary}</p></span>{episode.enemyId && enemyOf(episode.enemyId)?.boss ? <Crown className="chapter-boss" size={18}/> : <ChevronRight size={17}/>}</button>;
}
function WorldMap({regions: world, active, onSelect}: {regions: AdventureView["regions"]; active: RegionId; onSelect: (id: RegionId) => void}) {
  return <section className="world-map" aria-label="回聲大陸地圖"><svg viewBox="0 0 400 230" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="world-grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#b0bca6" strokeOpacity=".055"/></pattern></defs><rect width="400" height="230" fill="url(#world-grid)"/><path d="M18 210 Q70 142 90 177 T160 132 Q195 130 230 65 T305 77 Q335 65 387 19" stroke="#647d7750" strokeWidth="28" fill="none"/><path d="M68 161 Q110 156 160 99 T264 55 Q300 62 340 131" fill="none" stroke="#d0ba7c77" strokeWidth="1.3" strokeDasharray="4 6"/><path d="M170 55l15-28 15 28m24-18 18-31 18 31m-163 8 15-25 15 25m173 148 15-28 15 28" stroke="#a1b7ab33" fill="#83958a0c"/><text x="19" y="29" fill="#a3b6a2" fontSize="8" letterSpacing="4">THE ECHO LANDS</text><text x="290" y="214" fill="#a3b6a2" fontSize="8" letterSpacing="2">N ↑</text></svg>{world.map(region => <button key={region.id} className={"world-map-pin " + (region.unlocked ? "discovered" : "locked") + (active === region.id ? " selected" : "")} style={{left: region.x + "%", top: region.y + "%", "--region-color": region.color} as CSSProperties} aria-label={`地圖：${region.name}${region.unlocked ? "" : "，尚未開放"}`} disabled={!region.unlocked} onClick={() => onSelect(region.id)}><span>{region.unlocked ? <Compass size={17}/> : <LockKeyhole size={15}/>}</span><strong>{region.name}</strong></button>)}</section>;
}
function Forge({data, busy, onAction}: {data: AdventureView; busy: boolean; onAction: (action: object) => Promise<unknown>}) {
  return <><section className="adventure-intro"><span className="eyebrow">THE RUNESMITH’S WORKBENCH</span><h2>木光刻印工坊</h2><p>把故事尋回的固定材料，製成可以帶進試煉的戰術刻印。不抽取、不消耗現金，每份配方只需製作一次。</p></section><div className="material-wallet">{data.materials.map(material => <div key={material.id} style={{"--material-color": material.color} as CSSProperties}><Gem size={22}/><strong>{material.amount}</strong><span>{material.name}</span></div>)}</div><div className="rune-recipes">{data.runes.map(rune => {
    const enough = Object.entries(rune.materials).every(([id, amount]) => data.materials.find(material => material.id === id)!.amount >= amount);
    const Icon = rune.motif === "shield" ? Shield : rune.motif === "flame" ? Flame : MoonStar;
    return <article className={"rune-recipe " + (rune.equipped ? "equipped" : "")} key={rune.id}><div className="rune-icon"><Icon size={32}/></div><div><span className="eyebrow">{rune.equipped ? "EQUIPPED" : rune.owned ? "CRAFTED" : "BLUEPRINT"}</span><h3>{rune.name}</h3><p>{rune.description}</p><ul>{Object.entries(rune.materials).map(([id, amount]) => <li key={id}>{data.materials.find(material => material.id === id)?.name}<strong>×{amount}</strong></li>)}<li>星露<strong>{rune.gold}</strong></li></ul><button className={rune.owned ? "secondary-button" : "primary-button"} disabled={busy || !rune.owned && (!enough || data.balance < rune.gold)} onClick={() => void onAction(rune.owned ? {action: "equipRune", runeId: rune.equipped ? null : rune.id} : {action: "craftRune", runeId: rune.id})}>{rune.owned ? rune.equipped ? "卸下刻印" : "攜帶這枚刻印" : !enough ? "故事材料不足" : data.balance < rune.gold ? "星露不足" : "製作刻印"}{rune.owned ? <Check size={15}/> : <Hammer size={15}/>}</button></div></article>;
  })}</div><p className="rpg-footnote">每次出戰攜帶一枚刻印。更換免費，於下一場試煉生效。<br/>工坊、裝備商店與營地共用星露。</p></>;
}

function BattlePanel({data, character, busy, error, onAction, onBack, onStory}: {data: AdventureView; character: CharacterState; busy: boolean; error: string; onAction: (action: object) => Promise<unknown>; onBack: () => void; onStory: () => void}) {
  const battle = data.battle!, enemy = enemyOf(battle.enemyId)!, episode = data.episodes.find(episode => episode.id === battle.episodeId)!;
  const intent = battleIntent(battle), skill = professionMoves[battle.profession];
  const move = (move: BattleMove) => void onAction({action: "battleAction", battleId: battle.id, turn: battle.turn, move});
  return <main className="rpg-page adventure-page battle-page">
    <button className="text-button world-back" onClick={onBack}><ArrowLeft size={15}/>暫離試煉・保留戰況</button>
    {battle.phase === "active" && <button className="secondary-button" disabled={busy} onClick={() => void onAction({action: "startBattle", episodeId: battle.episodeId, mode: "action"})}><Swords size={17}/>改用走位試煉・保留目前生命</button>}
    <PanelHeading eyebrow={battle.practice ? "PRACTICE · NO EXTRA REWARDS" : "ECHO TRIAL"} title={enemy.name} aside={<span className="battle-turn">第 {battle.turn} 回合{enemy.boss && <small>守關者</small>}</span>}/>
    {error && <div className="adventure-error" role="alert">{error}</div>}
    <section className={"battle-stage " + battle.phase} style={regionStyle(episode.region)} aria-label="回聲試煉戰場"><span className="battle-stage-shade"/><div className="battle-hero"><CharacterAvatar character={{...character, profession: battle.profession}}/></div><div className="battle-foe"><EnemyFigure kind={enemy.kind}/></div><span className="battle-vs">✦</span><div className="foe-health"><span>{enemy.name}<b>{battle.foeHp} / {battle.foeMaxHp}</b></span><Progress value={battle.foeHp / battle.foeMaxHp * 100} aria-label="對手生命"/></div></section>
    {battle.phase === "active" ? <><div className={"enemy-intent " + intent.kind}><span>{intent.kind === "charge" ? <Flame size={20}/> : intent.kind === "guard" ? <Shield size={20}/> : <Swords size={20}/>}</span><div><strong>對手下一招：{intent.name}</strong><small>{intent.kind === "charge" ? "建議防禦，重擊傷害較高" : intent.kind === "guard" ? "護壁會減少傷害，也適合趁機調息" : "觀察戰況，選擇適合的行動"}</small></div><b>{intent.damage ? `${intent.damage} 基礎傷害` : "不反擊"}</b></div><div className="hero-health"><span><Heart size={14}/>{character.name}<strong>{battle.hp} / {battle.maxHp}</strong></span><Progress value={battle.hp / battle.maxHp * 100} aria-label="你的生命"/><small>專注 <b>{battle.focus} / 3</b>・普攻／防禦恢復 1 點</small></div><div className="battle-actions"><button disabled={busy} onClick={() => move("strike")}><Swords size={20}/><strong>普攻</strong><small>穩定輸出・+1 專注</small></button><button disabled={busy || battle.focus < 2} onClick={() => move("skill")}><Sparkles size={20}/><strong>{skill.name}</strong><small>消耗 2 專注</small></button><button disabled={busy} onClick={() => move("guard")}><Shield size={20}/><strong>防禦</strong><small>減傷 70%・+1 專注</small></button><button disabled={busy || battle.focus < 2 || battle.hp === battle.maxHp} onClick={() => move("mend")}><Heart size={20}/><strong>調息</strong><small>恢復生命・2 專注</small></button></div><p className="battle-skill-note">{skill.description}</p></> : <section className={"battle-result " + battle.phase}>{battle.phase === "won" ? <><Crown size={33}/><h2>試煉通過</h2><p>{battle.practice ? "這次是再次挑戰，不會重複發放故事獎勵。" : "把尋回的回聲帶回故事，看看夥伴們想說的話。"}</p><button className="primary-button" onClick={onStory}>回到篇章，繼續故事<ArrowRight size={16}/></button></> : <><Shield size={31}/><h2>先回到安全的地方</h2><p>XP、裝備與材料都沒有減少。可以換個策略再試，也可以先休息。</p><button className="primary-button" disabled={busy} onClick={() => void onAction({action: "startBattle", episodeId: episode.id})}>再試一次<Swords size={16}/></button><button className="text-button" onClick={onBack}>先回世界地圖</button></>}</section>}
    <div className="battle-latest" aria-live="polite">{battle.log.slice(-2).map((line, index) => <p key={index}>{line}</p>)}</div><details className="battle-log"><summary>戰鬥紀錄與提示</summary><p>{enemy.tell}</p>{battle.log.map((line, index) => <p key={index}>{line}</p>)}<p>出戰時的能力固定；換裝與刻印於下一場生效。戰鬥不發角色 XP，生活行動才會帶來修練成長。</p></details>{battle.phase === "active" && <button className="text-button battle-retreat" disabled={busy} onClick={() => void onAction({action: "retreatBattle", battleId: battle.id})}>撤退・保留所有成長</button>}
  </main>;
}

function EnemyFigure({kind}: {kind: string}) {
  return <svg className={"enemy-figure enemy-" + kind} viewBox="0 0 180 210" aria-hidden="true"><ellipse cx="90" cy="189" rx="59" ry="12" fill="currentColor" opacity=".13"/><g stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d={kind === "wisp" ? "M89 25C126 35 147 71 136 108C126 142 149 159 140 178C112 167 99 175 88 189C76 169 47 183 38 174C57 155 29 135 35 101C39 65 56 39 89 25Z" : kind === "thorn" ? "M89 22L109 56L144 41L133 83L159 111L129 122L141 169L105 153L91 186L71 154L35 170L46 128L19 108L48 83L35 45L71 58Z" : kind === "crown" ? "M30 47L58 69L68 22L91 55L117 20L127 68L153 44L140 99L128 129L143 177L111 169L91 190L69 169L36 177L54 128L40 97Z" : "M69 23L112 23L125 58L145 81L132 109L146 153L127 184L105 179L91 194L75 179L53 184L35 153L49 108L35 81L57 58Z"} fill="#1d2938"/><path d="M57 77L89 59L123 77L115 111L91 134L65 111Z" fill="#344451"/><path d="M61 87L78 91M103 91L120 87" stroke="#e3c288" strokeWidth="5"/><path d="M82 111L91 117L101 110M90 136V175M61 131L50 155M119 131L132 155" opacity=".8"/>{kind === "guardian" && <><path d="M41 54L23 20L65 40M119 40L157 20L140 54" fill="#344451"/><path d="M90 33V51M70 43H111"/></>}{kind === "knight" && <><path d="M25 75L7 146L37 161L60 99Z" fill="#344451"/><path d="M141 81L171 130M165 121L151 141" strokeWidth="6"/></>}</g><circle cx="90" cy="90" r="54" fill="none" stroke="currentColor" strokeOpacity=".15" strokeDasharray="2 8"/></svg>;
}
