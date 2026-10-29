/** Shared RPG rules. Cloud rewards use server receipts; the browser preview
 * keeps its own local receipts and does not submit progress to the server. */
export const skillIds = ["knowledge", "mindfulness", "fitness", "craft", "expression", "exploration"] as const;
export type SkillId = typeof skillIds[number];
export const attributeIds = ["intellect", "vitality", "agility", "spirit", "charisma", "luck"] as const;
export type AttributeId = typeof attributeIds[number];
export type Attributes = Record<AttributeId, number>;
export const attributeNames: Record<AttributeId, string> = {
  intellect: "智力", vitality: "體能", agility: "敏捷", spirit: "意志", charisma: "魅力", luck: "幸運",
};
export const STEP_XP = 40;
export const DREAM_XP = 100;
export const SKILL_XP = 20;
export const SKILL_RANK_XP = 60;
export const skills: {id: SkillId; name: string; description: string; gains: Partial<Attributes>; examples: string[]}[] = [
  {id: "knowledge", name: "知識研習", description: "閱讀、研究、語言與專業學習", gains: {intellect: 2, spirit: 1}, examples: ["閱讀 10 頁並寫下一個收穫", "學習一個新概念並做筆記", "用自己的話解釋今天學到的事"]},
  {id: "mindfulness", name: "心靈修練", description: "覺察、專注、情緒與自我照顧", gains: {spirit: 2, vitality: 1}, examples: ["留 5 分鐘安靜呼吸", "寫下今天的心情與一件感謝的事", "安排一段不使用螢幕的休息"]},
  {id: "fitness", name: "體能鍛鍊", description: "依自己的狀態運動，累積身體的力量", gains: {vitality: 2, agility: 1}, examples: ["完成 10 分鐘適合自己的伸展", "走路 15 分鐘，留意身體感受", "完成一次自己規劃的輕量運動"]},
  {id: "craft", name: "創作工藝", description: "寫程式、手作、烹飪與動手解題", gains: {agility: 2, intellect: 1}, examples: ["挑選一個想製作的小作品", "動手練習 20 分鐘並記下過程", "完成一件小作品，回顧一個可改進處"]},
  {id: "expression", name: "表達共鳴", description: "音樂、書寫、溝通與人際連結", gains: {charisma: 2, spirit: 1}, examples: ["練習一段旋律或寫下一小段故事", "與一個人分享自己的想法並聆聽回應", "完成一次練習，記錄自己的進步"]},
  {id: "exploration", name: "探索行動", description: "嘗試新事物、觀察世界與生活實驗", gains: {luck: 2, agility: 1}, examples: ["認識一個沒去過的地方或新主題", "規劃一次小小的生活探索", "完成探索，記下一件意外的發現"]},
];
const categoryTraining: Record<string, SkillId> = {travel: "exploration", growth: "knowledge", health: "fitness", career: "craft", life: "mindfulness", other: "exploration"};
export function defaultTraining(category: string): SkillId {return categoryTraining[category] ?? "exploration";}
export function skillOf(id?: string) {return skills.find(skill => skill.id === id);}

export const professionIds = ["wanderer", "warrior", "mage", "ranger", "bard", "artisan", "healer"] as const;
export type ProfessionId = typeof professionIds[number];
export type Profession = {id: ProfessionId; name: string; title: string; description: string; color: string; attributes: Partial<Attributes>; skills: Partial<Record<SkillId, number>>; training: SkillId[]};
export const professions: Profession[] = [
  {id: "wanderer", name: "初行旅人", title: "每一條路，都可以是你的路。", description: "自由嘗試所有修練，找到自己喜歡的成長方向。", color: "#078c87", attributes: {}, skills: {}, training: ["exploration"]},
  {id: "warrior", name: "晨曦戰士", title: "把每一次堅持，鍛造成力量。", description: "以身體鍛鍊與日常毅力守護自己的生活。", color: "#bf6546", attributes: {vitality: 16}, skills: {fitness: 1}, training: ["fitness"]},
  {id: "mage", name: "星語法師", title: "讓知識與內心，成為你的魔法。", description: "結合知識研習與心靈修練，探索理解世界的力量。", color: "#8560bb", attributes: {intellect: 16, spirit: 16}, skills: {knowledge: 1, mindfulness: 1}, training: ["knowledge", "mindfulness"]},
  {id: "ranger", name: "逐風遊俠", title: "在世界與雙手之間，找到新路。", description: "透過探索與工藝，培養靈活解決問題的能力。", color: "#408354", attributes: {agility: 16, luck: 16}, skills: {exploration: 1, craft: 1}, training: ["exploration", "craft"]},
  {id: "bard", name: "旅歌詩人", title: "讓你的聲音，與世界產生共鳴。", description: "在音樂、創作與溝通中，把想法化為連結。", color: "#b35f85", attributes: {charisma: 16}, skills: {expression: 1}, training: ["expression"]},
  {id: "artisan", name: "森光工匠", title: "一雙手，也能造出自己的世界。", description: "用手作、程式與實作，把靈感變成真實作品。", color: "#a17530", attributes: {agility: 16}, skills: {craft: 1}, training: ["craft"]},
  {id: "healer", name: "月泉療癒師", title: "先照顧自己，再長出溫柔的力量。", description: "練習覺察與自我照顧，在日常中安定身心。", color: "#397c9c", attributes: {spirit: 16}, skills: {mindfulness: 1}, training: ["mindfulness"]},
];
export function professionOf(id: string) {return professions.find(profession => profession.id === id) ?? professions[0];}
export function levelProgress(totalXp: number) {
  const xp = Math.max(0, Math.floor(totalXp));
  const level = Math.floor((1 + Math.sqrt(1 + xp * .08)) / 2);
  return {level, totalXp: xp, xpInLevel: xp - 50 * level * (level - 1), xpForNext: 100 * level};
}
export function skillRank(xp: number) {return Math.min(10, Math.floor(Math.max(0, xp) / SKILL_RANK_XP));}

export type TalentId = AttributeId | `${AttributeId}-mastery` | `${AttributeId}-awakening` | `${AttributeId}-resonance`;
export type Talent = {id: TalentId; attribute: AttributeId; name: string; description: string; maxRank: number; minLevel: number; gain: number; prerequisite?: {id: TalentId; rank: number}};
export const resonanceDescriptions:Record<AttributeId,string>={intellect:"每階戰鬥射程 +8，永久智力 +2",vitality:"每階試煉承傷減少4%，永久體能 +2",agility:"每階移動速度 +4%，永久敏捷 +2",spirit:"每階調息多恢復3生命，永久意志 +2",charisma:"每階戰技冷卻縮短0.12秒，永久魅力 +2",luck:"每階閃避冷卻縮短0.08秒，永久幸運 +2"};
const rootTalentNames: Record<AttributeId, string> = {intellect: "求知之心", vitality: "堅韌之軀", agility: "靈巧雙手", spirit: "安定意志", charisma: "共鳴之聲", luck: "發現之眼"};
export const talents: Talent[] = attributeIds.flatMap(attribute => [
  {id: attribute, attribute, name: rootTalentNames[attribute], description: `每階永久增加 2 ${attributeNames[attribute]}`, maxRank: 3, minLevel: 2, gain: 2},
  {id: `${attribute}-mastery` as TalentId, attribute, name: `${attributeNames[attribute]}專精`, description: `每階永久增加 3 ${attributeNames[attribute]}`, maxRank: 3, minLevel: 8, gain: 3, prerequisite: {id: attribute, rank: 2}},
  {id: `${attribute}-resonance` as TalentId, attribute, name: `${attributeNames[attribute]}共鳴`, description:resonanceDescriptions[attribute],maxRank:2,minLevel:12,gain:2,prerequisite:{id:attribute,rank:3}},
  {id: `${attribute}-awakening` as TalentId, attribute, name: `${attributeNames[attribute]}覺醒`, description: `永久增加 6 ${attributeNames[attribute]}`, maxRank: 1, minLevel: 20, gain: 6, prerequisite: {id: `${attribute}-mastery` as TalentId, rank: 3}},
]);
export const talentIds = talents.map(talent => talent.id) as [TalentId, ...TalentId[]];
export function canLearnTalent(talent: Talent, state: Pick<CharacterState, "level" | "talents" | "availableTalentPoints">) {
  return state.level >= talent.minLevel && state.availableTalentPoints > 0 && state.talents[talent.id] < talent.maxRank && (!talent.prerequisite || state.talents[talent.prerequisite.id] >= talent.prerequisite.rank);
}

export type Evolution = {stage: number; name: string; level: number; skillRank: number; description: string};
const evolutionNames: Record<Exclude<ProfessionId, "wanderer">, string[]> = {
  warrior: ["曙光騎士", "誓約守護者", "黎明聖騎"], mage: ["奧術使", "星界賢者", "天穹魔導師"],
  ranger: ["疾風獵人", "荒野追獵者", "蒼穹遊俠"], bard: ["戰歌奏者", "靈魂詠唱者", "永恆詩聖"],
  artisan: ["符文鍛造師", "秘技工匠", "造物宗師"], healer: ["聖泉祭司", "光誓賢者", "晨星聖使"],
};
export function evolutionPath(profession: ProfessionId): Evolution[] {
  if (profession === "wanderer") return [];
  return evolutionNames[profession].map((name, index) => ({stage: index + 1, name, level: [10, 25, 50][index], skillRank: [2, 5, 10][index], description: ["完成基礎試煉，覺醒職業的真正力量。", "將長期修練融入生活，邁向職業大師。", "讓日常堅持成為傳說，開啟覺醒之路。"][index]}));
}
export function jobTitle(profession: ProfessionId, stage = 0) {return evolutionPath(profession).find(path => path.stage === stage)?.name ?? professionOf(profession).name;}
export function nextEvolution(profession: ProfessionId, stage = 0) {return evolutionPath(profession).find(path => path.stage === stage + 1) ?? null;}
export function canAdvance(profession: ProfessionId, stage: number, state: Pick<CharacterState, "level" | "skillXp">) {
  const next = nextEvolution(profession, stage);
  return Boolean(next && state.level >= next.level && professionOf(profession).training.every(skill => skillRank(state.skillXp[skill]) >= next.skillRank));
}
export function professionBonuses(profession: ProfessionId, stage: number): Attributes {
  const bonuses = emptyAttributes();
  const gains: Record<ProfessionId, Partial<Attributes>> = {wanderer: {}, warrior: {vitality: 3, spirit: 1}, mage: {intellect: 3, spirit: 1}, ranger: {agility: 3, luck: 1}, bard: {charisma: 3, spirit: 1}, artisan: {agility: 2, intellect: 2}, healer: {spirit: 3, vitality: 1}};
  for (const id of attributeIds) bonuses[id] = (gains[profession][id] ?? 0) * stage;
  return bonuses;
}
export function characterPower(level: number, attributes: Attributes, equippedCount: number, stage: number) {return Math.round(level * 12 + Object.values(attributes).reduce((sum, value) => sum + value, 0) * 4 + equippedCount * 6 + stage * 50);}

export const equipmentSlots = ["weapon", "head", "offhand", "outfit", "boots", "charm"] as const;
export type EquipmentSlot = typeof equipmentSlots[number];
export const slotNames: Record<EquipmentSlot, string> = {weapon: "主手", head: "頭部", offhand: "副手", outfit: "護甲", boots: "足部", charm: "飾品"};
export type Equipment = {id: string; name: string; slot: EquipmentSlot; cost: number; level: number; description: string; bonuses: Partial<Attributes>; motif: "hammer" | "lute" | "sword" | "staff" | "bow" | "cloak" | "apron" | "clover" | "moon" | "helm" | "shield" | "boots"};
export const equipment: Equipment[] = [
  {id: "training-sword", name: "黎明鋼劍", slot: "weapon", cost: 45, level: 1, description: "記住每一次願意出發的自己。", bonuses: {vitality: 2}, motif: "sword"},
  {id: "oak-staff", name: "星紋秘杖", slot: "weapon", cost: 60, level: 1, description: "每一個新知，都是微小的魔法。", bonuses: {intellect: 2}, motif: "staff"},
  {id: "trail-bow", name: "逐風獵弓", slot: "weapon", cost: 70, level: 2, description: "留一份好奇，給尚未抵達的地方。", bonuses: {agility: 2}, motif: "bow"},
  {id: "linen-cloak", name: "守望披風", slot: "outfit", cost: 50, level: 1, description: "慢一點也沒關係，旅途一直都在。", bonuses: {spirit: 2}, motif: "cloak"},
  {id: "craft-apron", name: "森光工作服", slot: "outfit", cost: 75, level: 2, description: "雙手留下的痕跡，是成長的證明。", bonuses: {agility: 1, intellect: 1}, motif: "apron"},
  {id: "lucky-pin", name: "四葉秘徽", slot: "charm", cost: 40, level: 1, description: "幸運，是多看世界一眼的獎勵。", bonuses: {luck: 2}, motif: "clover"},
  {id: "crescent-brooch", name: "月歌胸針", slot: "charm", cost: 90, level: 3, description: "為自己的故事，留一段溫柔的回聲。", bonuses: {charisma: 2}, motif: "moon"},
  {id: "sentinel-helm", name: "衛士戰盔", slot: "head", cost: 80, level: 3, description: "為每一次迎向挑戰做好準備。", bonuses: {vitality: 2, spirit: 1}, motif: "helm"},
  {id: "iron-buckler", name: "鐵誓圓盾", slot: "offhand", cost: 70, level: 2, description: "以穩定的步伐守住自己的節奏。", bonuses: {vitality: 2}, motif: "shield"},
  {id: "wind-boots", name: "疾風戰靴", slot: "boots", cost: 65, level: 2, description: "每一步行動，都讓遠方更近。", bonuses: {agility: 2}, motif: "boots"},
  {id: "runic-orb", name: "奧術法器", slot: "offhand", cost: 110, level: 5, description: "凝聚知識與意志的符文核心。", bonuses: {intellect: 2, spirit: 1}, motif: "staff"},
  {id: "vanguard-cuirass", name: "先鋒重甲", slot: "outfit", cost: 180, level: 10, description: "承載長期修練的進階戰甲。", bonuses: {vitality: 4, spirit: 2}, motif: "shield"},
  {id: "astral-crown", name: "星界冠冕", slot: "head", cost: 200, level: 10, description: "為持續探索知識的旅人加冕。", bonuses: {intellect: 4, spirit: 2}, motif: "helm"},
  {id:"workshop-hammer",name:"木光工匠錘",slot:"weapon",cost:65,level:2,description:"奧里親手校準的輕錘，讓每次動手都更有把握。",bonuses:{agility:2,intellect:1},motif:"hammer"},
  {id:"echo-lute",name:"旅歌琉特琴",slot:"weapon",cost:80,level:2,description:"露榭為第一位願意開口的旅人調好琴弦。",bonuses:{charisma:3},motif:"lute"},
  {id:"moon-scepter",name:"月泉枝杖",slot:"weapon",cost:115,level:5,description:"白木杖頭映著月泉的顏色，記住照顧自己的約定。",bonuses:{spirit:3,vitality:1},motif:"staff"},
  {id:"oath-blade",name:"晨誓長刃",slot:"weapon",cost:260,level:10,description:"刃脊刻著巡衛的誓言：不讓同行的人被遺落。",bonuses:{vitality:5,spirit:2},motif:"sword"},
  {id:"meteor-staff",name:"星墜秘杖",slot:"weapon",cost:275,level:10,description:"流星碎片嵌入法杖，回應長久積累的理解。",bonuses:{intellect:5,spirit:2},motif:"staff"},
  {id:"hawk-bow",name:"蒼羽獵弓",slot:"weapon",cost:250,level:10,description:"青金弓臂像展開的羽翼，為新的路留下準星。",bonuses:{agility:5,luck:2},motif:"bow"},
  {id:"moon-vestments",name:"月泉祭衣",slot:"outfit",cost:155,level:5,description:"米菈以月白與薄荷綠配成的輕衣，陪伴長途修練。",bonuses:{spirit:3,charisma:1},motif:"cloak"},
  {id:"voyager-hood",name:"遠行者兜帽",slot:"head",cost:95,level:3,description:"擋住山間的晚風，也留著抬頭看路的空間。",bonuses:{agility:2,luck:1},motif:"helm"},
  {id:"scholar-boots",name:"星頁行靴",slot:"boots",cost:120,level:5,description:"書庫到林徑之間，每一條路都算研習的一部分。",bonuses:{intellect:2,agility:2},motif:"boots"},
  {id:"starglass-pendant",name:"回聲星玻璃",slot:"charm",cost:170,level:8,description:"鐘亭留下的微光凝在玻璃裡，像一段仍有溫度的記憶。",bonuses:{luck:3,spirit:2},motif:"moon"},

];
export const avatarColors = ["mint", "lilac", "sunset"] as const;
export type AvatarColor = typeof avatarColors[number];
export type CharacterState = ReturnType<typeof progression> & {
  name: string; profession: ProfessionId; avatarColor: AvatarColor; leaderboardOptIn: boolean; title?: string;
  inventory: string[]; equipped: Record<EquipmentSlot, string | null>; equipmentBonuses: Attributes; professionBonuses: Attributes; effectiveAttributes: Attributes; advancements: Record<ProfessionId, number>; power: number;
};
export type RewardTotal = {skillId: SkillId | null; xp: number; skillXp: number};
export function emptyAttributes(base = 0): Attributes {return Object.fromEntries(attributeIds.map(id => [id, base])) as Attributes;}
export function progression(rewards: RewardTotal[], learned: Partial<Record<TalentId, number>> = {}) {
  const skillXp = Object.fromEntries(skillIds.map(id => [id, rewards.filter(reward => reward.skillId === id).reduce((total, reward) => total + reward.skillXp, 0)])) as Record<SkillId, number>;
  const attributes = emptyAttributes(10);
  const ranks = Object.fromEntries(talents.map(talent => [talent.id, learned[talent.id] ?? 0])) as Record<TalentId, number>;
  for (const skill of skills) for (const id of attributeIds) attributes[id] += Math.floor(skillXp[skill.id] / SKILL_XP) * (skill.gains[id] ?? 0);
  for (const talent of talents) attributes[talent.attribute] += ranks[talent.id] * talent.gain;
  const levels = levelProgress(rewards.reduce((total, reward) => total + reward.xp, 0));
  const spent = Object.values(ranks).reduce((total, rank) => total + rank, 0);
  return {...levels, skillXp, attributes, talents: ranks, availableTalentPoints: Math.max(0, levels.level - 1 - spent)};
}
export const BASE_PROFESSION_LEVEL = 2;
export function canBecome(profession: Profession, state: Pick<CharacterState, "level" | "attributes" | "skillXp">) {
  return (profession.id === "wanderer" || state.level >= BASE_PROFESSION_LEVEL) && attributeIds.every(id => state.attributes[id] >= (profession.attributes[id] ?? 0)) && skillIds.every(id => skillRank(state.skillXp[id]) >= (profession.skills[id] ?? 0));
}
export function equipmentStats(equipped: Record<EquipmentSlot, string | null>) {
  const bonuses = emptyAttributes();
  for (const slot of equipmentSlots) {
    const item = equipment.find(item => item.id === equipped[slot] && item.slot === slot);
    if (item) for (const id of attributeIds) bonuses[id] += item.bonuses[id] ?? 0;
  }
  return bonuses;
}
export type LeaderboardEntry = {rank: number; name: string; profession: ProfessionId; avatarColor: AvatarColor; totalXp: number; level: number; isYou: boolean};
export type LeaderboardState = {entries: LeaderboardEntry[]; yourEntry: LeaderboardEntry | null};
