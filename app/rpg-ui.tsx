"use client";
import type {CSSProperties, ReactNode} from "react";
import {Crown, Footprints, Shield, Star, Swords} from "lucide-react";
import {Progress} from "@/components/ui/progress";
import CharacterAvatar, {EquipmentIcon, ProfessionIcon} from "./character-avatar";
import {equipment, jobTitle, slotNames, type CharacterState, type Equipment, type EquipmentSlot} from "@/lib/character-model";

export function PanelHeading({eyebrow, title, aside}: {eyebrow: string; title: string; aside?: ReactNode}) {
  return <div className="rpg-panel-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div>{aside}</div>;
}
export function ExperienceBar({character}: {character: CharacterState}) {
  return <div className="character-experience"><div><span>Lv.{character.level}<small>角色經驗</small></span><strong>{character.xpInLevel} / {character.xpForNext} XP</strong></div><Progress value={character.xpInLevel / character.xpForNext * 100} aria-label="角色升級進度"/><small>累積 {character.totalXp.toLocaleString()} XP · 距離升級 {character.xpForNext - character.xpInLevel} XP</small></div>;
}
export function PaperDoll({character, onSlot, compact = false}: {character: CharacterState; onSlot: (slot: EquipmentSlot) => void; compact?: boolean}) {
  return <section className={"paper-doll " + (compact ? "compact" : "")} aria-label="人物與裝備欄"><div className="portrait-backdrop" aria-hidden="true"/><div className="portrait-ring" aria-hidden="true"/><CharacterAvatar character={character}/>{(["head", "weapon", "charm", "outfit", "offhand", "boots"] as EquipmentSlot[]).map((slot, index) => {
    const item = equipment.find(gear => gear.id === character.equipped[slot]);
    return <button className={"paper-doll-slot slot-position-" + index + (item ? " filled" : "")} key={slot} onClick={() => onSlot(slot)} aria-label={`${slotNames[slot]}裝備：${item?.name ?? "空"}`}><small>{slotNames[slot]}</small>{item ? <GearArt item={item}/> : slot === "weapon" ? <Swords size={25}/> : slot === "charm" ? <Star size={25}/> : slot === "head" ? <Crown size={25}/> : slot === "boots" ? <Footprints size={25}/> : <Shield size={25}/>}<span>{item?.name ?? "空"}</span></button>;
  })}<span className="portrait-class-label"><ProfessionIcon profession={character.profession} size={13}/>{jobTitle(character.profession, character.advancements[character.profession])}</span></section>;
}
export function GearArt({item}: {item: Equipment}) {
  const index = equipment.findIndex(gear => gear.id === item.id);
  return <span className="gear-art" aria-hidden="true" style={{"--gear-index": index, backgroundPosition: `${index % 4 / 3 * 100}% ${Math.floor(index / 4) / 3 * 100}%`} as CSSProperties}><EquipmentIcon motif={item.motif} size={34}/></span>;
}
