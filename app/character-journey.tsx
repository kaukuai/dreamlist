"use client";
import {useEffect, useState, type CSSProperties, type FormEvent} from "react";
import {ArrowRight, Check, ChevronRight, Crown, Flame, LoaderCircle, RefreshCw, Settings2, Shield, Sparkles, Star, Swords, Trophy} from "lucide-react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Progress} from "@/components/ui/progress";
import {Input} from "@/components/ui/input";
import {AttributeIcon, avatarPalette, ProfessionIcon, SkillIcon} from "./character-avatar";
import {ClassProgression, TalentTree} from "./class-progression";
import {ExperienceBar, GearArt, PanelHeading, PaperDoll} from "./rpg-ui";
import {attributeIds, attributeNames, avatarColors, canAdvance, equipment, equipmentSlots, jobTitle, nextEvolution, professionOf, professions, skillRank, skills, SKILL_RANK_XP, slotNames, type CharacterState, type EquipmentSlot, type LeaderboardState, type Profession} from "@/lib/character-model";
import type {IslandState} from "@/lib/island-model";
import {appFetch} from "@/lib/client-api";
import {browserPreview} from "@/lib/app-mode";

export type CharacterPanel = "character" | "equipment" | "professions" | "talents" | "skills" | "leaderboard" | "settings";
type Props = {panel: CharacterPanel; character: CharacterState | null; island: IslandState | null; busy: boolean; loading: boolean; onMutation: (data: object) => Promise<boolean>; onTrain: (profession: Profession) => void; onNavigate: (panel: CharacterPanel) => void};

export default function CharacterJourney({panel, character, island, busy, loading, onMutation, onTrain, onNavigate}: Props) {
  const [inventoryMode, setInventoryMode] = useState<"bag" | "shop">("bag");
  const [slotFilter, setSlotFilter] = useState<EquipmentSlot | "all">("all");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  if (loading || !character) return <main className="rpg-page"><div className="loading-panel" role="status"><LoaderCircle className="spin"/>正在載入角色資料…</div></main>;
  const stage = character.advancements[character.profession];
  const title = jobTitle(character.profession, stage);
  const next = nextEvolution(character.profession, stage);
  const item = equipment.find(item => item.id === selectedItem);
  const onSlot = (slot: EquipmentSlot) => {setSlotFilter(slot); setInventoryMode("bag"); onNavigate("equipment");};
  const shownItems = equipment.filter(item => (slotFilter === "all" || item.slot === slotFilter) && (inventoryMode === "shop" || character.inventory.includes(item.id)));

  return <main className={"rpg-page rpg-panel-" + panel}>
    {panel === "character" && <>
      <PanelHeading eyebrow="CHARACTER DOSSIER" title="角色檔案" aside={<button className="rpg-icon-button" aria-label="角色設定" onClick={() => onNavigate("settings")}><Settings2 size={20}/></button>}/>
      <div className="character-nameplate"><div><span className="job-insignia"><ProfessionIcon profession={character.profession} size={15}/>{title}</span><h2>{character.name}</h2></div><span className="character-level">Lv.<b>{character.level}</b></span></div>
      <PaperDoll character={character} onSlot={onSlot}/>
      <div className="character-power"><span><Swords size={16}/>綜合戰力</span><strong title="依等級、屬性、穿戴裝備與職業進化計算的角色評級">{character.power.toLocaleString()}</strong><small>{["初階", "進階", "大師", "覺醒"][stage]}職業</small></div>
      <ExperienceBar character={character}/>
      <button className={"evolution-banner " + (canAdvance(character.profession, stage, character) ? "is-ready" : "")} onClick={() => onNavigate("professions")}><Flame size={22}/><span><strong>{next ? `${next.name} · Lv.${next.level} 進化` : character.profession === "wanderer" ? "選擇你的第一個職業" : "職業已覺醒，等級持續成長"}</strong><small>{next ? `角色 Lv.${character.level} / ${next.level} · 查看修練條件` : "所有技能與成長都會保留"}</small></span><ChevronRight size={19}/></button>
      <section className="attribute-section" aria-labelledby="attribute-heading"><div className="rpg-block-heading"><h2 id="attribute-heading">角色屬性</h2><span>修練 ＋ 裝備 ＋ 職業</span></div><div className="combat-attributes">{attributeIds.map(id => <div key={id}><AttributeIcon attribute={id} size={19}/><span>{attributeNames[id]}</span><strong>{character.effectiveAttributes[id]}</strong><small>基礎 {character.attributes[id]}{character.equipmentBonuses[id] ? ` · 裝 +${character.equipmentBonuses[id]}` : ""}{character.professionBonuses[id] ? ` · 職 +${character.professionBonuses[id]}` : ""}</small></div>)}</div></section>
      <div className="character-shortcuts"><button onClick={() => onNavigate("skills")}><Sparkles size={21}/><span>生活技能<small>六條修練路線，可同時學習</small></span><ChevronRight size={17}/></button><button onClick={() => onNavigate("talents")}><Star size={21}/><span>天賦迴路<small>{character.availableTalentPoints} 點可用天賦</small></span><ChevronRight size={17}/></button></div>
    </>}
    {panel === "equipment" && <>
      <PanelHeading eyebrow="ARMORY & EQUIPMENT" title="裝備與背包" aside={<span className="resource-tag"><Sparkles size={14}/>{island?.balance ?? 0}</span>}/>
      <PaperDoll character={character} onSlot={onSlot} compact/>
      <div className="equipment-summary"><span>{Object.values(character.equipped).filter(Boolean).length} / 6 部位已穿戴</span><strong>戰力 {character.power.toLocaleString()}</strong></div>
      <div className="inventory-toolbar"><div className="rpg-segmented" aria-label="裝備來源"><button aria-pressed={inventoryMode === "bag"} onClick={() => setInventoryMode("bag")}>背包 <small>{character.inventory.length}</small></button><button aria-pressed={inventoryMode === "shop"} onClick={() => setInventoryMode("shop")}>軍需商店</button></div><label className="slot-filter"><span className="sr-only">裝備部位</span><select value={slotFilter} onChange={event => setSlotFilter(event.target.value as EquipmentSlot | "all")}><option value="all">全部部位</option>{equipmentSlots.map(slot => <option key={slot} value={slot}>{slotNames[slot]}</option>)}</select></label></div>
      {shownItems.length ? <section className="inventory-grid" aria-label={inventoryMode === "bag" ? "背包裝備" : "軍需裝備"}>{shownItems.map(gear => <button key={gear.id} className={"inventory-tile rarity-" + (gear.level >= 10 ? "epic" : gear.level >= 3 ? "rare" : "common")} onClick={() => setSelectedItem(gear.id)} aria-label={`${gear.name}，${inventoryMode === "shop" ? gear.cost + " 星露" : character.equipped[gear.slot] === gear.id ? "穿戴中" : "已擁有"}`}><span className="item-level">Lv.{gear.level}</span><GearArt item={gear}/>{character.equipped[gear.slot] === gear.id && <span className="item-worn"><Check size={10}/>穿戴</span>}<strong>{gear.name}</strong><small>{inventoryMode === "shop" ? <><Sparkles size={11}/>{gear.cost}</> : slotNames[gear.slot]}</small></button>)}</section> : <div className="rpg-empty"><Shield size={36}/><h3>{slotFilter === "all" ? "背包尚無裝備" : `尚未收藏${slotNames[slotFilter]}裝備`}</h3><p>完成生活任務累積星露，為你的角色添上第一件戰具。</p><button className="primary-button" onClick={() => setInventoryMode("shop")}>前往軍需商店 <ArrowRight size={16}/></button></div>}
      <p className="rpg-footnote">裝備與營地共用星露。各裝備只需購買一次，更換與卸下免費。</p>
    </>}
    {panel === "professions" && <ClassProgression character={character} busy={busy} onMutation={onMutation} onTrain={onTrain}/>}
    {panel === "talents" && <TalentTree character={character} busy={busy} onMutation={onMutation}/>}
    {panel === "skills" && <>
      <PanelHeading eyebrow="LIFE SKILL TRAINING" title="生活技能"/><p className="panel-description">現實中的學習與行動，就是你的修練。所有路線都可同時成長。</p><section className="skill-training-list">{skills.map(skill => {
        const xp = character.skillXp[skill.id], rank = skillRank(xp), maxed = rank === 10;
        return <article className="skill-training-row" key={skill.id}><span className={"skill-sigil " + skill.id}><SkillIcon skill={skill.id} size={25}/></span><div className="skill-training-copy"><div><h3>{skill.name}</h3><b>R{rank}</b></div><p>{skill.description}</p><Progress value={maxed ? 100 : xp % SKILL_RANK_XP / SKILL_RANK_XP * 100} aria-label={skill.name + "熟練進度"}/><small>{maxed ? `${xp} 熟練 · 持續累積屬性` : `${xp % SKILL_RANK_XP} / ${SKILL_RANK_XP} 熟練`}</small><span className="skill-stat-gains">{attributeIds.filter(id => skill.gains[id]).map(id => `${attributeNames[id]} +${skill.gains[id]}`).join(" · ")}</span></div><button aria-label={"建立" + skill.name + "修練"} disabled={busy} onClick={() => onTrain({...professions[0], name: skill.name, training: [skill.id]})}><ChevronRight size={21}/></button></article>;
      })}</section><p className="rpg-footnote">小目標首次完成獲得 40 XP 與 20 熟練；重新勾選不會重複發放。成長保留，不隨取消完成而退回。</p>
    </>}
    {panel === "leaderboard" && <Leaderboard character={character} onSettings={() => onNavigate("settings")}/>}
    {panel === "settings" && <><PanelHeading eyebrow="ADVENTURER SETTINGS" title="角色設定"/><ProfileSettings character={character} busy={busy} onMutation={onMutation}/></>}
    <Dialog open={Boolean(item)} onOpenChange={open => {if (!open && !busy) setSelectedItem(null);}}><DialogContent className="equipment-detail-dialog">{item && <><DialogHeader><DialogTitle>{item.name}</DialogTitle><DialogDescription>{slotNames[item.slot]} · Lv.{item.level} 以上</DialogDescription></DialogHeader><div className="equipment-detail-art"><GearArt item={item}/></div><p className="equipment-lore">{item.description}</p><div className="equipment-detail-stats">{attributeIds.filter(id => item.bonuses[id]).map(id => <div key={id}><AttributeIcon attribute={id} size={18}/><span>{attributeNames[id]}</span><strong>+{item.bonuses[id]}</strong></div>)}</div><p className="equipment-wallet">星露餘額 <strong>{island?.balance ?? 0}</strong></p>{character.inventory.includes(item.id) ? <button className="primary-button" disabled={busy} onClick={() => void onMutation({action: "equip", slot: item.slot, itemId: character.equipped[item.slot] === item.id ? null : item.id})}>{busy ? <LoaderCircle className="spin" size={16}/> : <Shield size={16}/>} {character.equipped[item.slot] === item.id ? "卸下裝備" : "穿戴裝備"}</button> : <button className="primary-button" disabled={busy || character.level < item.level || (island?.balance ?? 0) < item.cost} onClick={() => void onMutation({action: "purchase", itemId: item.id})}>{busy ? <LoaderCircle className="spin" size={16}/> : <Sparkles size={16}/>} {character.level < item.level ? `Lv.${item.level} 解鎖` : (island?.balance ?? 0) < item.cost ? `${item.cost} 星露 · 餘額不足` : `${item.cost} 星露 · 購買`}</button>}</>}</DialogContent></Dialog>
  </main>;
}

function ProfileSettings({character, busy, onMutation}: Pick<Props, "busy" | "onMutation"> & {character: CharacterState}) {
  async function submit(event: FormEvent<HTMLFormElement>) {event.preventDefault(); const data = new FormData(event.currentTarget); await onMutation({action: "profile", name: data.get("name"), avatarColor: data.get("avatarColor"), leaderboardOptIn: !browserPreview && data.get("leaderboardOptIn") === "on"});}
  return <section className="character-settings"><form key={`${character.name}-${character.avatarColor}-${character.leaderboardOptIn}`} onSubmit={event => void submit(event)}><label htmlFor="character-name">角色名稱</label><Input id="character-name" name="name" required maxLength={24} defaultValue={character.name} disabled={busy}/><fieldset disabled={busy}><legend>靈魂色澤</legend><div className="aura-picker">{avatarColors.map(color => <label key={color} style={{"--palette": avatarPalette[color].cloth} as CSSProperties}><input type="radio" name="avatarColor" value={color} defaultChecked={color === character.avatarColor}/><span/>{avatarPalette[color].name}</label>)}</div></fieldset>{browserPreview?<p className="rpg-footnote">角色與任務只保存在目前瀏覽器；清除網站資料或更換裝置會有不同進度。</p>:<label className="leaderboard-consent"><input type="checkbox" name="leaderboardOptIn" defaultChecked={character.leaderboardOptIn} disabled={busy}/><span><strong>加入成長排行榜</strong><small>同站玩家可見角色名稱、職業與經驗。生活任務內容保持私密；取消並儲存即可退出。</small></span></label>}<button className="primary-button" disabled={busy}><Check size={16}/>儲存角色設定</button></form></section>;
}

function Leaderboard({character, onSettings}: {character: CharacterState; onSettings: () => void}) {
  const [data, setData] = useState<LeaderboardState | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {const controller = new AbortController(); void appFetch("/api/leaderboard", {signal: controller.signal}).then(async response => {const body = await response.json() as LeaderboardState & {error?: string}; if (!response.ok) throw new Error(body.error ?? "暫時無法讀取排行榜"); setData(body); setError("");}).catch(error => {if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "暫時無法讀取排行榜");}); return () => controller.abort();}, [refresh, character.leaderboardOptIn, character.totalXp, character.name]);
  return <><PanelHeading eyebrow="HALL OF GROWTH" title={browserPreview?"個人成長紀錄":"旅人成長榜"} aside={<button className="rpg-icon-button" aria-label="重新整理排行榜" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={19}/></button>}/><div className="ranking-consent-note"><Trophy size={22}/><div><strong>{browserPreview ? "此瀏覽器的冒險紀錄" : character.leaderboardOptIn ? "你已加入成長榜" : "你的紀錄目前不公開"}</strong><p>{browserPreview?"試玩版只顯示自己的角色，不上傳玩家排行":"自主紀錄的累積 XP 排名 · 前 50 位 · 同分並列"}</p></div><button className="text-button" onClick={onSettings}>設定</button></div>{error ? <div className="rpg-empty" role="alert"><p>{error}</p><button className="secondary-button" onClick={() => setRefresh(value => value + 1)}>重試</button></div> : !data ? <div className="loading-panel" role="status"><LoaderCircle className="spin"/>讀取排行中…</div> : <section className="ranking-board" aria-label="成長排行榜">{!data.entries.length ? <div className="rpg-empty"><Crown size={40}/><h3>第一段傳說，等你書寫。</h3><p>目前沒有公開角色紀錄。加入後才會出現在這裡。</p></div> : <ol className="ranking-list">{data.entries.map((entry, index) => <li key={index} className={entry.isYou ? "is-you" : ""}><span className="rank-position">{browserPreview?<Star size={16}/>:<>{entry.rank <= 3 ? <Crown size={14}/> : "#"}{entry.rank}</>}</span><ProfessionIcon profession={entry.profession} size={24}/><div><strong>{entry.name}{entry.isYou && <small>你</small>}</strong><span>{professionOf(entry.profession).name} · Lv.{entry.level}</span></div><b>{entry.totalXp.toLocaleString()}<small>XP</small></b></li>)}</ol>}{data.yourEntry && !data.entries.some(entry => entry.isYou) && <p className="rpg-footnote">你的名次 #{data.yourEntry.rank} · {data.yourEntry.totalXp.toLocaleString()} XP</p>}</section>}<p className="rpg-footnote">{browserPreview?"開發試玩版尚未連接跨玩家排行榜。":"排行記錄行動累積，不代表真實能力的比較。"}</p></>;
}
