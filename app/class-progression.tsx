"use client";
import {useState, type CSSProperties} from "react";
import {ArrowRight, Check, Crown, Flame, LockKeyhole, Star} from "lucide-react";
import CharacterAvatar, {AttributeIcon, ProfessionIcon} from "./character-avatar";
import {PanelHeading} from "./rpg-ui";
import {attributeIds, attributeNames, BASE_PROFESSION_LEVEL, canAdvance, canBecome, canLearnTalent, evolutionPath, jobTitle, professionOf, professions, professionBonuses, skillRank, skills, talents, type AttributeId, type CharacterState, type Profession} from "@/lib/character-model";

type Shared = {character: CharacterState; busy: boolean; onMutation: (data: object) => Promise<boolean>};
const classLabels = {warrior: "戰士", mage: "法師", ranger: "遊俠", bard: "詩人", artisan: "工匠", healer: "療癒師", wanderer: "旅人"};
export function ClassProgression({character, busy, onMutation, onTrain}: Shared & {onTrain: (profession: Profession) => void}) {
  const [preview, setPreview] = useState<Profession["id"] | null>(null);
  const path = professionOf(preview ?? (character.profession === "wanderer" ? "warrior" : character.profession));
  const stage = character.advancements[path.id];
  return <>
    <PanelHeading eyebrow="CLASS ASCENSION" title="職業與進化" aside={<span className="resource-tag">Lv.{character.level}</span>}/>
    <p className="panel-description">自由學習所有技能。基礎職業從 Lv.2 開始解鎖，進化需要等級與專屬修練。轉職不重置成長。</p>
    <div className="profession-selector" aria-label="預覽職業">{professions.slice(1).map(job => <button key={job.id} aria-pressed={path.id === job.id} onClick={() => setPreview(job.id)}><ProfessionIcon profession={job.id} size={20}/><span>{classLabels[job.id]}</span>{character.profession === job.id && <i/>}</button>)}</div>
    <section className="profession-preview" style={{"--job-color": path.color} as CSSProperties}><CharacterAvatar character={{...character, profession: path.id}}/><div><span className="eyebrow">{canBecome(path, character) ? "CLASS AVAILABLE" : "TRAINING REQUIRED"}</span><h2>{jobTitle(path.id, stage)}</h2><p>{path.description}</p><span className="profession-focus">{path.training.map(id => skills.find(skill => skill.id === id)!.name).join(" · ")}</span></div></section>
    <div className="profession-base-card"><div className="rpg-block-heading"><h3>基礎轉職條件</h3><span>{character.profession === path.id ? "目前職業" : canBecome(path, character) ? "已達成" : "修練中"}</span></div><ul className="requirement-list"><Requirement label={`角色 Lv.${BASE_PROFESSION_LEVEL}`} value={`Lv.${character.level}`} met={character.level >= BASE_PROFESSION_LEVEL}/>{skills.filter(skill => path.skills[skill.id]).map(skill => <Requirement key={skill.id} label={`${skill.name} R${path.skills[skill.id]}`} value={`R${skillRank(character.skillXp[skill.id])}`} met={skillRank(character.skillXp[skill.id]) >= path.skills[skill.id]!}/>)}{attributeIds.filter(id => path.attributes[id]).map(id => <Requirement key={id} label={`${attributeNames[id]} ${path.attributes[id]}`} value={String(character.attributes[id])} met={character.attributes[id] >= path.attributes[id]!}/>)}</ul>
      {character.profession === path.id ? <span className="current-class-note"><Check size={15}/>已選擇這條道路，繼續向下一階進化。</span> : canBecome(path, character) ? <button className="primary-button" disabled={busy} onClick={() => void onMutation({action: "profession", profession: path.id})}>轉職為{jobTitle(path.id, stage)} <ArrowRight size={16}/></button> : <button className="primary-button" disabled={busy} onClick={() => onTrain(path)}>建立基礎修練任務 <ArrowRight size={16}/></button>}
    </div>
    <section className="evolution-tree" aria-label={path.name + "進化路線"}>{evolutionPath(path.id).map(evolution => {
      const completed = stage >= evolution.stage, isNext = stage + 1 === evolution.stage;
      const eligible = isNext && canAdvance(path.id, stage, character);
      const bonus = professionBonuses(path.id, 1);
      return <article key={evolution.stage} className={"evolution-node " + (completed ? "completed" : eligible ? "ready" : "locked")}><div className="evolution-emblem">{completed ? <Check size={22}/> : evolution.stage === 3 ? <Crown size={24}/> : <ProfessionIcon profession={path.id} size={25}/>}<small>{["I", "II", "III"][evolution.stage - 1]}</small></div><div className="evolution-node-copy"><div className="evolution-node-title"><h3>{evolution.name}</h3><span>Lv.{evolution.level}</span></div><p>{evolution.description}</p><ul className="requirement-list"><Requirement label={`角色 Lv.${evolution.level}`} value={`Lv.${character.level}`} met={character.level >= evolution.level}/>{path.training.map(id => <Requirement key={id} label={`${skills.find(skill => skill.id === id)!.name} R${evolution.skillRank}`} value={`R${skillRank(character.skillXp[id])}`} met={skillRank(character.skillXp[id]) >= evolution.skillRank}/>)}</ul><div className="evolution-bonuses">每階職業加成：{attributeIds.filter(id => bonus[id]).map(id => `${attributeNames[id]} +${bonus[id]}`).join(" · ")}</div>
        {completed ? <span className="current-class-note"><Check size={14}/>進化已完成</span> : <button className={eligible ? "primary-button" : "secondary-button"} disabled={busy || !eligible} onClick={() => void onMutation(character.profession === path.id ? {action: "advance"} : {action: "profession", profession: path.id})}>{eligible ? character.profession === path.id ? "進化為" + evolution.name : "先切換至此職業" : !isNext ? "先完成上一階進化" : "等級與修練條件未達成"}{eligible && <Flame size={15}/>}</button>}
      </div></article>;
    })}</section>
    <button className="text-button return-wanderer" disabled={busy || character.profession === "wanderer"} onClick={() => void onMutation({action: "profession", profession: "wanderer"})}>返回初行旅人 · 保留所有職業進度</button><p className="rpg-footnote">職業加成只在使用該職業時生效。角色等級持續累積，完成目前三階進化後仍可升級。</p>
  </>;
}

export function TalentTree({character, busy, onMutation}: Shared) {
  const [attribute, setAttribute] = useState<AttributeId>("intellect");
  return <>
    <PanelHeading eyebrow="TALENT CIRCUIT" title="天賦迴路" aside={<span className="resource-tag"><Star size={15}/>{character.availableTalentPoints} AP</span>}/>
    <p className="panel-description">每次升級獲得 1 AP。沿著基礎、專精到覺醒投入天賦，建立自己的永久能力。</p>
    <div className="talent-branch-selector" aria-label="天賦分支">{attributeIds.map(id => <button key={id} aria-pressed={id === attribute} onClick={() => setAttribute(id)}><AttributeIcon attribute={id} size={22}/><span>{attributeNames[id]}</span></button>)}</div>
    <section className="talent-tree" aria-label={attributeNames[attribute] + "天賦樹"}>{talents.filter(talent => talent.attribute === attribute).map((talent, index) => {
      const rank = character.talents[talent.id], available = canLearnTalent(talent, character);
      const prerequisite = talent.prerequisite ? talents.find(node => node.id === talent.prerequisite!.id)! : null;
      return <article key={talent.id} className={"talent-node " + (rank > 0 ? "learned" : available ? "available" : "locked")}><span className="talent-node-icon"><AttributeIcon attribute={attribute} size={28}/><small>{["I", "II", "III"][index]}</small></span><div className="talent-node-copy"><div className="talent-node-title"><h3>{talent.name}</h3><span>Lv.{talent.minLevel}</span></div><p>{talent.description}</p><div className="talent-rank-pips" aria-label={`${rank} / ${talent.maxRank} 階`}>{Array.from({length: talent.maxRank}, (_, n) => <Star key={n} size={16} className={rank > n ? "lit" : ""}/>)}<small>{rank} / {talent.maxRank}</small></div>{prerequisite && <p className="talent-prerequisite">前置：{prerequisite.name} {character.talents[prerequisite.id]} / {talent.prerequisite!.rank} 階</p>}<button className={available ? "primary-button" : "secondary-button"} disabled={busy || !available} onClick={() => void onMutation({action: "talent", talentId: talent.id})}>{rank >= talent.maxRank ? "已達滿階" : character.level < talent.minLevel ? `Lv.${talent.minLevel} 解鎖` : prerequisite && character.talents[prerequisite.id] < talent.prerequisite!.rank ? "前置天賦尚未完成" : character.availableTalentPoints < 1 ? "AP 不足" : "投入 1 AP"}</button></div></article>;
    })}</section><p className="rpg-footnote">天賦為永久分配，目前不提供重置。轉職時保留所有已投入的天賦。</p>
  </>;
}
function Requirement({label, value, met}: {label: string; value: string; met: boolean}) {return <li className={met ? "met" : ""}>{met ? <Check size={12}/> : <LockKeyhole size={12}/>}<span>{label}</span><b>{value}</b></li>;}
