import {z} from "zod";
import type {CharacterState, ProfessionId} from "./character-model.ts";
import type {Dream} from "./dream-model.ts";
import {masteryStage} from "./profession-mastery.ts";
import {npcs, questCategory, type NpcId} from "./quest-model.ts";
import {enemyOf, enemyPatterns, episodeOf, mainEpisodes, volumeOneEpisodes, materials, regions, runes, storyEpisodes, type MaterialId, type RuneId, type StoryEpisode} from "./adventure-catalog.ts";
import {createArena, stepArena, type ArenaState,type CombatTraits} from "./arena-engine.ts";
import {initialField, normalizeField, touchField, walkable, type FieldProgress} from "./field-engine.ts";

export type BattleMove = "strike" | "skill" | "guard" | "mend";
export type Battle = {
  id: string; episodeId: string; enemyId: string; phase: "active" | "won" | "lost";
  turn: number; hp: number; maxHp: number; foeHp: number; foeMaxHp: number; focus: number;
  attack: number; armor: number; healing: number; profession: ProfessionId; runeId: RuneId | null; practice: boolean; log: string[];
  arena?: ArenaState;combat?:CombatTraits;enemyKind?:ArenaState["enemyKind"];boss?:boolean;
};
export type AdventureState = {
  version: 1; entries: Record<string, {dreamId: string; choiceId: string; claimedAt?: string}>;
  materials: Record<MaterialId, number>; runes: RuneId[]; equippedRune: RuneId | null;
  goldEarned: number; goldSpent: number; weeklyTarget: number; equippedTitle: string | null; battle: Battle | null;
  field: FieldProgress;
};
export type LifeReceipt = {dreamId: string; taskId: string; kind: "step" | "dream"; createdAt?: string};
export type AdventureContext = {dreams: (Dream & {deleted?: boolean})[]; receipts: LifeReceipt[]; player: CharacterState; balance: number; now: Date};
export class AdventureError extends Error {
  status: number;
  constructor(message: string, status = 400) {super(message); this.status = status;}
}
function requireThat(condition: unknown, message: string, status = 400): asserts condition {if (!condition) throw new AdventureError(message, status);}

export function initialAdventure(): AdventureState {
  return {version: 1, entries: {}, materials: {ember: 0, fiber: 0, ink: 0}, runes: [], equippedRune: null, goldEarned: 0, goldSpent: 0, weeklyTarget: 2, equippedTitle: null, battle: null, field: initialField()};
}
export function validateAdventure(value: AdventureState) {
  requireThat(value.version === 1 && value.entries && value.materials && Array.isArray(value.runes) &&
    Number.isFinite(value.goldEarned) && Number.isFinite(value.goldSpent) && [2, 4, 6].includes(value.weeklyTarget), "冒險紀錄版本暫時無法讀取，原紀錄已保留", 503);
  value.field ??= initialField();
  requireThat(Array.isArray(value.field.discovered) && Array.isArray(value.field.bellSequence) && Number.isFinite(value.field.x) && Number.isFinite(value.field.y), "場景紀錄暫時無法讀取，原紀錄已保留", 503);
  normalizeField(value.field);
  return value;
}
const hasCompleted = (context: AdventureContext, dreamId: string) => context.receipts.some(receipt => receipt.dreamId === dreamId && receipt.kind === "dream");
export function companionPoints(state: AdventureState, context: AdventureContext, npcId: NpcId) {
  const life = context.dreams.filter(dream => dream.quest?.npcId === npcId && hasCompleted(context, dream.id)).length;
  const story = storyEpisodes.filter(episode => {
    const entry = state.entries[episode.id];
    return entry?.claimedAt && episode.choices.find(choice => choice.id === entry.choiceId)?.npcId === npcId;
  }).length;
  return life + story * 2;
}
export function episodeUnlocked(episode: StoryEpisode, state: AdventureState, context: AdventureContext) {
  return episode.kind === "bond" ? companionPoints(state, context, episode.bondNpc!) >= 1 : !episode.requires || Boolean(state.entries[episode.requires]?.claimedAt);
}
export function unlockedTitles(state: AdventureState) {
  return storyEpisodes.filter(episode => state.entries[episode.id]?.claimedAt && episode.reward.title).map(episode => episode.reward.title!);
}
export function battleIntent(battle: Battle) {
  const foe = enemyOf(battle.enemyId)!;
  const pattern = enemyPatterns[foe.id];
  const kind = pattern[(battle.turn - 1) % pattern.length];
  return {kind, name: kind === "charge" ? "蓄力重擊" : kind === "guard" ? "展開護壁" : "試探攻擊", damage: kind === "guard" ? 0 : Math.round(foe.attack * (kind === "charge" ? 1.6 : 1))};
}
export const professionMoves: Record<ProfessionId, {name: string; description: string}> = {
  wanderer: {name: "旅人突擊", description: "凝聚專注，造成強力傷害。"},
  warrior: {name: "晨曦斬擊", description: "以更強的威力正面突破。"},
  mage: {name: "星火迴響", description: "法術穿透敵人的護壁。"},
  ranger: {name: "逐風連射", description: "快速連射，返還 1 點專注。"},
  bard: {name: "旅歌共鳴", description: "造成傷害並恢復 8 生命。"},
  artisan: {name: "符紋震擊", description: "造成傷害並減輕本回合的反擊。"},
  healer: {name: "月泉光矢", description: "攻擊並恢復 15 生命。"},
};

export function startBattle(episode: StoryEpisode, state: AdventureState, context: AdventureContext): Battle {
  const foe = enemyOf(episode.enemyId ?? ""); requireThat(foe, "這個篇章沒有戰鬥試煉");
  const rune = runes.find(rune => rune.id === state.equippedRune);
  const player = context.player;
  const primary = ({warrior: "vitality", mage: "intellect", ranger: "agility", bard: "charisma", artisan: "agility", healer: "spirit", wanderer: "luck"} as const)[player.profession];
  const power = player.profession === "wanderer" ? Math.max(...Object.values(player.effectiveAttributes)) : player.effectiveAttributes[primary];
  const maxHp = Math.round(100 + player.level * 6 + player.effectiveAttributes.vitality * 1.5 + (rune?.hp ?? 0));
  const resonance=Object.fromEntries(["intellect","vitality","agility","spirit","charisma","luck"].map(id=>[id,player.talents[`${id}-resonance` as keyof typeof player.talents]??0]));
  return {combat:{mastery:masteryStage(player),resonance},enemyKind:foe.kind,boss:foe.boss,id: crypto.randomUUID(), episodeId: episode.id, enemyId: foe.id, phase: "active", turn: 1, hp: maxHp, maxHp,
    foeHp: foe.hp, foeMaxHp: foe.hp, focus: 3, attack: Math.round(12 + player.level * 2 + power * .55 + (rune?.attack ?? 0)),
    armor: Math.floor(player.effectiveAttributes.vitality * .12) + (rune?.armor ?? 0), healing: rune?.healing ?? 0,
    profession: player.profession, runeId: state.equippedRune, practice: Boolean(state.entries[episode.id]?.claimedAt),
    log: [`你與${foe.name}相遇。先觀察下一招，再決定自己的節奏。`]};
}

export function takeBattleTurn(battle: Battle, move: BattleMove, expectedTurn: number) {
  requireThat(!battle.arena, "這場試煉使用走位操作，請返回戰場", 409);
  requireThat(battle.phase === "active" && battle.turn === expectedTurn, "戰況已更新，請依目前回合操作", 409);
  const intent = battleIntent(battle), events: string[] = [];
  const skill = professionMoves[battle.profession];
  let guarded = move === "guard";
  if (move === "skill" || move === "mend") requireThat(battle.focus >= 2, "專注不足；普攻或防禦可恢復 1 點專注");
  if (move === "mend") requireThat(battle.hp < battle.maxHp, "生命已滿，不需要調息");
  if (move === "strike" || move === "skill") {
    const multiplier = move === "strike" ? 1 : ({warrior: 1.8, mage: 1.7, ranger: 1.6, bard: 1.55, artisan: 1.65, healer: 1.2, wanderer: 1.65})[battle.profession];
    const reduced = intent.kind === "guard" && !(move === "skill" && battle.profession === "mage");
    const damage = Math.max(1, Math.round(battle.attack * multiplier * (reduced ? .45 : 1)));
    battle.foeHp = Math.max(0, battle.foeHp - damage);
    battle.focus = move === "strike" ? Math.min(3, battle.focus + 1) : battle.focus - 2;
    if (move === "skill" && battle.profession === "ranger") battle.focus = Math.min(3, battle.focus + 1);
    if (move === "skill" && ["bard", "healer"].includes(battle.profession)) battle.hp = Math.min(battle.maxHp, battle.hp + (battle.profession === "healer" ? 15 : 8));
    if (move === "skill" && battle.profession === "artisan") guarded = true;
    events.push(`${move === "skill" ? skill.name : "普攻"}造成 ${damage} 傷害${reduced ? "（護壁減傷）" : ""}。`);
  } else if (move === "guard") {
    battle.focus = Math.min(3, battle.focus + 1); events.push("你穩住架勢，這一回合的傷害降低 70%，恢復 1 專注。");
  } else {
    battle.focus -= 2;
    const healing = Math.min(battle.maxHp - battle.hp, Math.round(battle.maxHp * .28) + battle.healing);
    battle.hp += healing; events.push(`你調整呼吸，恢復 ${healing} 生命。`);
  }
  if (battle.foeHp === 0) {battle.phase = "won"; events.push("試煉通過。你可以帶著這段回聲，繼續故事。");}
  else {
    const damage = Math.max(0, intent.damage === 0 ? 0 : Math.max(1, intent.damage - battle.armor));
    const taken = guarded ? Math.round(damage * .3) : damage;
    battle.hp = Math.max(0, battle.hp - taken);
    events.push(intent.kind === "guard" ? "對手展開護壁，暫時沒有反擊。" : `對手${intent.name}，你受到 ${taken} 傷害。`);
    if (battle.hp === 0 || battle.turn >= 40) {battle.phase = "lost"; events.push("你退回安全的地方。沒有扣除 XP、裝備或材料，可以隨時再試。");}
    else battle.turn += 1;
  }
  battle.log = [...battle.log, ...events].slice(-8);
  return battle;
}

function rhythm(context: AdventureContext, target: number) {
  const shifted = new Date(context.now.getTime() + 8 * 3600000);
  const monday = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - (shifted.getUTCDay() + 6) % 7 * 86400000 - 8 * 3600000;
  const count = context.receipts.filter(receipt => receipt.kind === "step" && receipt.createdAt && Date.parse(receipt.createdAt) >= monday && Date.parse(receipt.createdAt) < monday + 7 * 86400000).length;
  return {count, target, weekStart: new Date(monday).toISOString()};
}
export function adventureView(state: AdventureState, context: AdventureContext) {
  const episodes = storyEpisodes.map(episode => {
    const entry = state.entries[episode.id];
    const dream = context.dreams.find(dream => dream.id === entry?.dreamId && !dream.deleted);
    const completed = entry && hasCompleted(context, entry.dreamId);
    const status = entry?.claimedAt ? "cleared" : !episodeUnlocked(episode, state, context) ? "locked" : !entry ? "available" : completed ? "ready" : "active";
    return {...episode, status: status as "cleared" | "locked" | "available" | "ready" | "active", entry: entry ?? null,
      completedSteps: dream?.tasks.filter(task => task.done).length ?? 0, totalSteps: dream?.tasks.length ?? 0};
  });
  const cleared = mainEpisodes.filter(episode => state.entries[episode.id]?.claimedAt).length;
  return {
    episodes, mainCleared: cleared, mainTotal: mainEpisodes.length, regions: regions.map(region => ({...region, unlocked: !region.requires || Boolean(state.entries[region.requires]?.claimedAt)})),
    materials: materials.map(material => ({...material, amount: state.materials[material.id]})), runes: runes.map(rune => ({...rune, owned: state.runes.includes(rune.id), equipped: state.equippedRune === rune.id})),
    companions: npcs.map(npc => {const points = companionPoints(state, context, npc.id);return {...npc, points, bond: points >= 9 ? "同行" : points >= 5 ? "信賴" : points >= 2 ? "相識" : "初遇"};}),
    memories: episodes.filter(episode => episode.status === "cleared").map(episode => ({id: episode.id, ...episode.memory, ending: episode.ending, npcId: episode.choices.find(choice => choice.id === episode.entry?.choiceId)?.npcId})),
    titles: unlockedTitles(state), equippedTitle: state.equippedTitle, battle: state.battle ? {...state.battle, intent: battleIntent(state.battle)} : null,
    rhythm: rhythm(context, state.weeklyTarget), balance: context.balance, field: state.field,
    ending: volumeOneEpisodes.every(episode=>state.entries[episode.id]?.claimedAt) ? endingReflection(state) : null,
  };
}
export type AdventureView = ReturnType<typeof adventureView>;
function endingReflection(state: AdventureState) {
  const values = {courage: 0, curiosity: 0, care: 0};
  for (const episode of volumeOneEpisodes) {const choice = episode.choices.find(choice => choice.id === state.entries[episode.id]?.choiceId);if (choice) values[choice.vow] += 1;}
  const strongest = (Object.keys(values) as (keyof typeof values)[]).sort((a, b) => values[b] - values[a])[0];
  return {values, text: ({courage: "大家記得，你在不確定的時候仍願意踏出一步。勇氣不是沒有猶豫，而是讓猶豫的自己也能出發。", curiosity: "大家記得，你總願意再多問一個問題。那些細小的好奇，替失落的世界找回了方向。", care: "大家記得，你替疲憊與不完美留了位置。正因為有人願意照顧彼此，晨鐘才又有了回聲。"})[strongest]};
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({action: z.literal("beginEpisode"), episodeId: z.string(), choiceId: z.string()}).strict(),
  z.object({action: z.literal("startBattle"), episodeId: z.string(), mode: z.literal("action").optional()}).strict(),
  z.object({action: z.literal("battleAction"), battleId: z.string(), turn: z.number().int().min(1), move: z.enum(["strike", "skill", "guard", "mend"])}).strict(),
  z.object({action: z.literal("retreatBattle"), battleId: z.string()}).strict(),
  z.object({action: z.literal("claimEpisode"), episodeId: z.string()}).strict(),
  z.object({action: z.literal("craftRune"), runeId: z.string()}).strict(),
  z.object({action: z.literal("equipRune"), runeId: z.string().nullable()}).strict(),
  z.object({action: z.literal("equipTitle"), title: z.string().nullable()}).strict(),
  z.object({action: z.literal("setRhythm"), target: z.union([z.literal(2), z.literal(4), z.literal(6)])}).strict(),
  z.object({action: z.literal("saveField"), x: z.number().finite(), y: z.number().finite(), zone:z.enum(["town","woods","library"]).optional()}).strict(),
  z.object({action: z.literal("fieldInteract"), placeId: z.string(), x: z.number().finite(), y: z.number().finite(), zone:z.enum(["town","woods","library"]).optional()}).strict(),
  z.object({action: z.literal("arenaAdvance"), battleId: z.string(), fromTick: z.number().int().min(0), frames: z.array(z.object({x: z.number().min(-1).max(1), y: z.number().min(-1).max(1), attack: z.boolean(), dash: z.boolean(), skill: z.boolean(), mend: z.boolean()}).strict()).min(1).max(45)}).strict(),
  z.object({action: z.literal("arenaAssist"), battleId: z.string(), fromTick: z.number().int().min(0), enabled: z.boolean()}).strict(),
]);
export function adventureAction(state: AdventureState, input: unknown, context: AdventureContext) {
  const data = actionSchema.parse(input);
  if (data.action === "beginEpisode") {
    const episode = episodeOf(data.episodeId); requireThat(episode, "找不到這個篇章");
    requireThat(episodeUnlocked(episode, state, context), "先完成前一篇章，或與這位夥伴完成一份委託");
    const choice = episode.choices.find(choice => choice.id === data.choiceId); requireThat(choice, "請選擇一條有效的故事路線");
    const entry = state.entries[episode.id];
    if (entry) {requireThat(entry.choiceId === choice.id, "這段故事已選定路線，請繼續既有修練", 409);return;}
    const id = crypto.randomUUID();
    context.dreams.unshift({id, revision: 1, title: `${episode.kind === "main" ? "主線" : "夥伴篇"}・${episode.title}`, description: choice.response, category: questCategory(choice.skill), targetDate: "", createdAt: context.now.toISOString(), story: {episodeId: episode.id, choiceId: choice.id},
      tasks: choice.steps.map((title, index) => ({id: `story-${id}-${index + 1}`, title, training: choice.skill, done: false, completedAt: null}))});
    state.entries[episode.id] = {choiceId: choice.id, dreamId: id};
  } else if (data.action === "startBattle") {
    const episode = episodeOf(data.episodeId);requireThat(episode, "找不到這個篇章");
    const entry = state.entries[episode.id];requireThat(entry && hasCompleted(context, entry.dreamId), "完成這個篇章的生活修練，再進入試煉");
    if (state.battle?.phase === "active") {
      requireThat(state.battle.episodeId === episode.id, "先完成目前的試煉，或返回目前戰況", 409);
      if (data.mode === "action" && !state.battle.arena) state.battle.arena = createArena(state.battle, enemyOf(state.battle.enemyId)!.attack);
      return;
    }
    if (state.battle?.phase === "won" && state.battle.episodeId === episode.id && !entry.claimedAt) return;
    state.battle = startBattle(episode, state, context);
    if (data.mode === "action") state.battle.arena = createArena(state.battle, enemyOf(state.battle.enemyId)!.attack);
  } else if (data.action === "battleAction") {
    requireThat(state.battle && state.battle.id === data.battleId, "戰況已更新，請重新查看", 409);
    takeBattleTurn(state.battle, data.move, data.turn);
  } else if (data.action === "retreatBattle") {
    requireThat(state.battle?.id === data.battleId && state.battle.phase === "active", "戰況已更新，請重新查看", 409);
    state.battle.phase = "lost";state.battle.log.push("你選擇回到安全的地方。所有成長與收藏都保留，可以隨時再試。");
  } else if (data.action === "claimEpisode") {
    const episode = episodeOf(data.episodeId);requireThat(episode, "找不到這個篇章");
    const entry = state.entries[episode.id];requireThat(entry && hasCompleted(context, entry.dreamId), "請先完成這個篇章的生活修練");
    if (entry.claimedAt) return;
    if (episode.enemyId) requireThat(state.battle?.episodeId === episode.id && state.battle.phase === "won" && !state.battle.practice, "通過本篇試煉後才能完成故事");
    entry.claimedAt = context.now.toISOString();state.goldEarned += episode.reward.gold;
    for (const [id, amount] of Object.entries(episode.reward.materials)) state.materials[id as MaterialId] += amount;
    if (episode.reward.title && !state.equippedTitle) state.equippedTitle = episode.reward.title;
  } else if (data.action === "craftRune") {
    const rune = runes.find(rune => rune.id === data.runeId);requireThat(rune, "這份刻印配方不存在");
    if (state.runes.includes(rune.id)) return;
    requireThat(context.balance >= rune.gold, "星露不足，完成生活行動可以累積更多");
    for (const [id, amount] of Object.entries(rune.materials)) requireThat(state.materials[id as MaterialId] >= amount, "製作材料不足，故事初次完成會獲得固定材料");
    for (const [id, amount] of Object.entries(rune.materials)) state.materials[id as MaterialId] -= amount;
    state.goldSpent += rune.gold;state.runes.push(rune.id);
  } else if (data.action === "equipRune") {
    requireThat(data.runeId === null || state.runes.includes(data.runeId as RuneId), "只能攜帶已製作的刻印");
    state.equippedRune = data.runeId as RuneId | null;
  } else if (data.action === "equipTitle") {
    requireThat(data.title === null || unlockedTitles(state).includes(data.title), "這個稱號尚未解鎖");
    state.equippedTitle = data.title;
  } else if (data.action === "saveField") {
    requireThat((data.zone??"town")===(state.field.zone??"town"),"所在區域已變更，請重新載入",409);requireThat(walkable(data,state.field.zone??"town"), "這裡不是可行走的道路");state.field.x = data.x;state.field.y = data.y;
  } else if (data.action === "fieldInteract") {
    requireThat((data.zone??"town")===(state.field.zone??"town"),"所在區域已變更，請重新載入",409);
    try {touchField(state.field, data.placeId, data);} catch (error) {throw new AdventureError(error instanceof Error ? error.message : "先靠近互動目標");}
  } else if (data.action === "arenaAdvance" || data.action === "arenaAssist") {
    const battle = state.battle;
    requireThat(battle?.id === data.battleId && battle.arena && battle.arena.tick === data.fromTick, "戰況已在另一個視窗更新，請重新接續", 409);
    if (data.action === "arenaAssist") battle.arena.assist = data.enabled;
    else {
      requireThat(battle.phase === "active", "這場試煉已結束，請返回篇章", 409);
      for (const frame of data.frames) stepArena(battle.arena, frame);
      battle.hp = battle.arena.hp;battle.foeHp = battle.arena.enemyHp;battle.foeMaxHp = battle.arena.enemyMaxHp;
      battle.focus = battle.arena.focus;battle.phase = battle.arena.phase;
      if (battle.phase === "won") battle.log.push("你透過觀察、走位與職業戰技，尋回了這段回聲。");
      if (battle.phase === "lost") battle.log.push("你退回安全的地方。所有生活成長與收藏都保留。");
    }
  } else state.weeklyTarget = data.target;
}
