"use client";
import type {CSSProperties} from "react";
import {Backpack, Sword, WandSparkles, Crosshair, Music2, Hammer, HeartHandshake, BookOpen, Flower2, Dumbbell, Compass, MessageCircle, Brain, Feather, Focus, Clover, Shirt, MoonStar, Shield, Footprints, Crown, type LucideProps} from "lucide-react";
import {jobTitle, type ProfessionId, type SkillId, type AttributeId, type Equipment, type AvatarColor, type CharacterState} from "@/lib/character-model";

const professionIcons = {wanderer: Backpack, warrior: Sword, mage: WandSparkles, ranger: Compass, bard: Music2, artisan: Hammer, healer: HeartHandshake};
const skillIcons = {knowledge: BookOpen, mindfulness: Flower2, fitness: Dumbbell, craft: Hammer, expression: MessageCircle, exploration: Compass};
const attributeIcons = {intellect: Brain, vitality: Dumbbell, agility: Feather, spirit: Focus, charisma: MessageCircle, luck: Clover};
const equipmentIcons = {sword: Sword, staff: WandSparkles, bow: Crosshair, cloak: Shirt, apron: Shirt, clover: Clover, moon: MoonStar, helm: Crown, shield: Shield, boots: Footprints};
export function ProfessionIcon({profession, ...props}: LucideProps & {profession: ProfessionId}) {const Icon = professionIcons[profession] ?? Backpack; return <Icon {...props} aria-hidden="true"/>;}
export function SkillIcon({skill, ...props}: LucideProps & {skill: SkillId}) {const Icon = skillIcons[skill]; return <Icon {...props} aria-hidden="true"/>;}
export function AttributeIcon({attribute, ...props}: LucideProps & {attribute: AttributeId}) {const Icon = attributeIcons[attribute]; return <Icon {...props} aria-hidden="true"/>;}
export function EquipmentIcon({motif, ...props}: LucideProps & {motif: Equipment["motif"]}) {const Icon = equipmentIcons[motif]; return <Icon {...props} aria-hidden="true"/>;}
export const avatarPalette: Record<AvatarColor, {name: string; cloth: string; shade: string; background: string}> = {
  mint: {name: "潮汐鋼藍", cloth: "#87b2ca", shade: "#233b50", background: "#152333"},
  lilac: {name: "虛空紫晶", cloth: "#b39bd4", shade: "#443254", background: "#211b30"},
  sunset: {name: "餘燼赤金", cloth: "#d4a477", shade: "#644331", background: "#302018"},
};

const portraitIndex: Record<ProfessionId, number> = {wanderer: 0, warrior: 1, mage: 2, ranger: 3, bard: 4, artisan: 5, healer: 6};
export default function CharacterAvatar({character, compact = false}: {character: Pick<CharacterState, "name" | "profession" | "avatarColor" | "equipped"> & {advancements?: CharacterState["advancements"]}; compact?: boolean}) {
  const stage = character.advancements?.[character.profession] ?? 0;
  const index = portraitIndex[character.profession] ?? 0;
  const palette = avatarPalette[character.avatarColor] ?? avatarPalette.mint;
  const style = {
    backgroundImage: `url(/art/profession-adventure-${stage > 0 ? "evolved-" : ""}atlas.webp)`,
    backgroundPosition: `${index % 4 / 3 * 100}% ${Math.floor(index / 4) * 100}%`,
    "--portrait-aura": palette.cloth,
  } as CSSProperties;
  return <span role="img" data-profession={character.profession} aria-label={`${character.name}，${jobTitle(character.profession, stage)}，職業立繪`} className={`character-avatar profession-art stage-${stage} ${compact ? "compact" : ""}`} style={style}/>;
}
