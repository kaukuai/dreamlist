import {z} from "zod";
import {attributeIds, avatarColors, canAdvance, canBecome, canLearnTalent, characterPower, defaultTraining, DREAM_XP, equipment, equipmentSlots, equipmentStats, professionBonuses, professionIds, professionOf, progression, SKILL_XP, STEP_XP, talents, type CharacterState, type EquipmentSlot, type LeaderboardState, type ProfessionId, type RewardTotal, type SkillId, type TalentId} from "./character-model.ts";
import {inputSchema, normalizeTasks} from "./dream-validation.ts";
import {buildings, islandLevel, type IslandItem, type IslandState} from "./island-model.ts";
import {drawDailyQuests, npcQuests, questCategory, questDay, questOf, questStepTitle, type QuestBoardState, type QuestOffer} from "./quest-model.ts";
import type {Dream} from "./dream-model.ts";

export const PREVIEW_STORAGE_KEY = "dreamlist:browser-preview:v1";
type StoredDream = Dream & {deleted?: boolean};
type Receipt = RewardTotal & {dreamId: string; taskId: string; kind: "step" | "dream"; coins: number};
type PreviewState = {
  version: 1; playerId: string; dreams: StoredDream[]; receipts: Receipt[];
  profile: {name: string; profession: ProfessionId; avatarColor: CharacterState["avatarColor"]};
  talents: Partial<Record<TalentId, number>>; advancements: Record<ProfessionId, number>;
  inventory: {itemId: string; cost: number}[]; equipped: Record<EquipmentSlot, string | null>;
  island: {name: string; items: IslandItem[]}; dailyBoards: Record<string, string[]>;
  contracts: {offerId: string; dreamId: string}[];
};
type PreviewStorage = Pick<Storage, "getItem" | "setItem">;

class PreviewError extends Error {
  status: number;
  constructor(status: number, message: string) {super(message); this.status = status;}
}
const reject = (message: string, status = 400): never => {throw new PreviewError(status, message);};

function initialState(): PreviewState {
  return {version: 1, playerId: crypto.randomUUID(), dreams: [], receipts: [],
    profile: {name: "初行旅人", profession: "wanderer", avatarColor: "mint"}, talents: {},
    advancements: Object.fromEntries(professionIds.map(id => [id, 0])) as PreviewState["advancements"],
    inventory: [], equipped: Object.fromEntries(equipmentSlots.map(slot => [slot, null])) as PreviewState["equipped"],
    island: {name: "曙光小島", items: []}, dailyBoards: {}, contracts: []};
}

function readState(raw: string | null): PreviewState {
  if (raw === null) return initialState();
  try {
    const value = JSON.parse(raw) as PreviewState;
    if (value.version !== 1 || typeof value.playerId !== "string" || !Array.isArray(value.dreams) ||
      !Array.isArray(value.receipts) || !Array.isArray(value.inventory) || !Array.isArray(value.contracts) ||
      !value.profile || !value.equipped || !value.advancements || !value.talents || !value.dailyBoards || !Array.isArray(value.island?.items)) throw new Error();
    return value;
  } catch {return reject("此瀏覽器的試玩紀錄暫時無法讀取，原紀錄已保留，請勿清除網站資料。", 503);}
}

function character(state: PreviewState): CharacterState {
  const growth = progression(state.receipts, state.talents);
  const equipmentBonuses = equipmentStats(state.equipped);
  const stage = state.advancements[state.profile.profession];
  const jobBonuses = professionBonuses(state.profile.profession, stage);
  const effectiveAttributes = Object.fromEntries(attributeIds.map(id => [id, growth.attributes[id] + equipmentBonuses[id] + jobBonuses[id]])) as CharacterState["attributes"];
  return {...growth, ...state.profile, leaderboardOptIn: false, inventory: state.inventory.map(item => item.itemId),
    equipped: {...state.equipped}, advancements: {...state.advancements}, equipmentBonuses, professionBonuses: jobBonuses,
    effectiveAttributes, power: characterPower(growth.level, effectiveAttributes, Object.values(state.equipped).filter(Boolean).length, stage)};
}

function island(state: PreviewState): IslandState {
  const earned = state.receipts.reduce((sum, receipt) => sum + receipt.coins, 0);
  const spent = state.inventory.reduce((sum, item) => sum + item.cost, 0) + state.island.items.reduce((sum, item) => sum + item.cost, 0);
  return {earned, balance: 100 + earned - spent, level: islandLevel(earned), name: state.island.name,
    items: [...state.island.items].sort((a, b) => a.slot - b.slot), steps: state.receipts.filter(receipt => receipt.kind === "step").length,
    dreamsFulfilled: state.receipts.filter(receipt => receipt.kind === "dream").length};
}

function award(state: PreviewState) {
  const keys = new Set(state.receipts.map(receipt => JSON.stringify([receipt.dreamId, receipt.taskId, receipt.kind])));
  for (const dream of state.dreams.filter(dream => !dream.deleted)) {
    for (const task of dream.tasks.filter(task => task.done)) {
      const key = JSON.stringify([dream.id, task.id, "step"]);
      if (keys.has(key)) continue;
      state.receipts.push({dreamId: dream.id, taskId: task.id, kind: "step", skillId: task.training ?? defaultTraining(dream.category), xp: STEP_XP, skillXp: SKILL_XP, coins: 25});
      keys.add(key);
    }
    const key = JSON.stringify([dream.id, "", "dream"]);
    if (dream.tasks.length && dream.tasks.every(task => task.done) && !keys.has(key)) {
      state.receipts.push({dreamId: dream.id, taskId: "", kind: "dream", skillId: null, xp: DREAM_XP, skillXp: 0, coins: 100});
      keys.add(key);
    }
  }
}

const findDream = (state: PreviewState, id: string) => state.dreams.find(dream => dream.id === id && !dream.deleted) ?? reject("這個任務不存在，請重新整理", 404);
const rewardState = (state: PreviewState) => ({character: character(state), island: island(state)});

async function questBoard(state: PreviewState, now: Date): Promise<QuestBoardState> {
  const clock = questDay(now);
  if (!state.dailyBoards[clock.dayKey]) state.dailyBoards[clock.dayKey] = (await drawDailyQuests(state.playerId, clock.dayKey)).map(quest => quest.id);
  const daily = state.dailyBoards[clock.dayKey].map(id => questOf(id));
  if (daily.length !== 3 || daily.some(quest => !quest || quest.kind !== "daily")) reject("每日委託目錄暫時無法讀取", 503);
  const offer = (quest: NonNullable<ReturnType<typeof questOf>>): QuestOffer => {
    const offerId = quest.kind === "daily" ? `daily:${clock.dayKey}:${quest.id}` : `npc:${quest.id}`;
    const contract = state.contracts.find(contract => contract.offerId === offerId);
    const dream = contract ? state.dreams.find(dream => dream.id === contract.dreamId) : null;
    const rewarded = contract && state.receipts.some(receipt => receipt.dreamId === contract.dreamId && receipt.kind === "dream");
    return {...quest, offerId, status: !contract ? "available" : rewarded ? "complete" : !dream || dream.deleted ? "archived" : "active",
      dreamId: dream && !dream.deleted ? dream.id : null, completedSteps: dream?.tasks.filter(task => task.done).length ?? 0,
      xp: quest.steps.length * STEP_XP + DREAM_XP, coins: quest.steps.length * 25 + 100};
  };
  return {...clock, serverTime: now.toISOString(), daily: daily.map(quest => offer(quest!)), introductions: npcQuests.map(offer)};
}

async function dispatch(state: PreviewState, path: string, method: string, body: unknown, now: Date): Promise<unknown> {
  if (path === "/api/dreams" && method === "GET") return {dreams: state.dreams.filter(dream => !dream.deleted)};
  if (path === "/api/character" && method === "GET") return {character: character(state)};
  if (path === "/api/island" && method === "GET") return {island: island(state)};
  if (path === "/api/quests" && method === "GET") return questBoard(state, now);
  if (path === "/api/leaderboard" && method === "GET") {
    const player = character(state);
    const entry = {rank: 1, name: player.name, profession: player.profession, avatarColor: player.avatarColor, totalXp: player.totalXp, level: player.level, isYou: true};
    return {entries: [entry], yourEntry: entry} satisfies LeaderboardState;
  }
  if (path === "/api/dreams" && method === "POST") {
    const data = inputSchema.parse(body);
    const dream: StoredDream = {...data, id: crypto.randomUUID(), revision: 1, createdAt: now.toISOString(), tasks: normalizeTasks(data.tasks, [], true, data.category)};
    state.dreams.unshift(dream);
    return {dream};
  }
  if (path.startsWith("/api/dreams/") && ["PUT", "DELETE"].includes(method)) {
    const dream = findDream(state, decodeURIComponent(path.slice("/api/dreams/".length)));
    if (method === "DELETE") {dream.deleted = true; dream.revision = (dream.revision ?? 0) + 1; return {ok: true};}
    const data = inputSchema.parse(body);
    if (typeof data.revision !== "number" || data.revision !== dream.revision) return reject("任務已在另一個視窗更新，請重新載入後再試", 409);
    if (dream.quest && (data.title !== dream.title || data.description !== dream.description || data.category !== dream.category || data.targetDate !== dream.targetDate || data.tasks.length !== dream.tasks.length || data.tasks.some((task, index) => {const old = dream.tasks[index]; return task.id !== old.id || task.title !== old.title || (task.training ?? old.training) !== old.training;}))) reject("NPC 委託內容固定，可以完成行動或另外建立自己的目標");
    const awarded = new Map(state.receipts.filter(receipt => receipt.dreamId === dream.id && receipt.kind === "step").map(receipt => [receipt.taskId, receipt.skillId as SkillId]));
    Object.assign(dream, data, {revision: data.revision + 1, tasks: normalizeTasks(data.tasks, dream.tasks, false, data.category, awarded)});
    award(state);
    return {dream, ...rewardState(state)};
  }
  if (path === "/api/quests" && method === "POST") {
    const {offerId} = z.object({offerId: z.string().min(1).max(160)}).parse(body);
    const existing = state.contracts.find(contract => contract.offerId === offerId);
    if (existing) {
      const dream = state.dreams.find(dream => dream.id === existing.dreamId && !dream.deleted);
      if (!dream) reject("這份委託已收起，接取紀錄仍保留，不能重複領取", 409);
      return {dream, created: false};
    }
    const board = await questBoard(state, now);
    const offer = [...board.daily, ...board.introductions].find(offer => offer.offerId === offerId) ?? reject("委託已更新，請重新整理清單");
    const id = crypto.randomUUID();
    const dream: StoredDream = {id, title: offer.title, description: offer.description, category: questCategory(offer.skill), targetDate: "", revision: 1, createdAt: now.toISOString(),
      tasks: offer.steps.map((step, index) => ({id: `quest-${id}-${index + 1}`, title: questStepTitle(step), training: offer.skill, done: false, completedAt: null})),
      quest: {kind: offer.kind, npcId: offer.npcId, templateId: offer.id, dayKey: offer.kind === "daily" ? board.dayKey : ""}};
    state.contracts.push({offerId, dreamId: id}); state.dreams.unshift(dream);
    return {dream, created: true};
  }
  if (path === "/api/character" && method === "POST") {
    const action = z.object({action: z.string()}).parse(body).action;
    const player = character(state);
    if (action === "profile") {
      const data = z.object({name: z.string().trim().min(1).max(24), avatarColor: z.enum(avatarColors)}).parse(body);
      Object.assign(state.profile, data);
    } else if (action === "profession") {
      const {profession} = z.object({profession: z.enum(professionIds)}).parse(body);
      if (!canBecome(professionOf(profession), player)) reject("尚未完成這個職業的基礎修練");
      state.profile.profession = profession;
    } else if (action === "talent") {
      const {talentId} = z.object({talentId: z.string()}).parse(body);
      const talent = talents.find(talent => talent.id === talentId) ?? reject("這個天賦不存在");
      if (!canLearnTalent(talent, player)) reject("天賦點不足，或尚未達到等級與前置條件");
      state.talents[talent.id] = (state.talents[talent.id] ?? 0) + 1;
    } else if (action === "advance") {
      const profession = player.profession, stage = state.advancements[profession];
      if (!canAdvance(profession, stage, player)) reject("尚未達到下一階職業進化的等級與技能條件");
      state.advancements[profession] = stage + 1;
    } else if (action === "purchase") {
      const {itemId} = z.object({itemId: z.string()}).parse(body);
      const item = equipment.find(item => item.id === itemId) ?? reject("這件裝備不存在");
      if (player.inventory.includes(item.id)) return rewardState(state);
      if (player.level < item.level) reject("角色等級還沒解鎖這件裝備");
      if (island(state).balance < item.cost) reject("星露不足，完成小目標就能累積更多");
      state.inventory.push({itemId: item.id, cost: item.cost});
    } else if (action === "equip") {
      const {slot, itemId} = z.object({slot: z.enum(equipmentSlots), itemId: z.string().nullable()}).parse(body);
      const item = equipment.find(item => item.id === itemId);
      if (itemId !== null && (!item || item.slot !== slot || !player.inventory.includes(item.id))) reject("只能穿戴已擁有且位置相符的裝備");
      state.equipped[slot] = itemId;
    } else reject("不支援這項角色操作");
    return rewardState(state);
  }
  if (path === "/api/island" && method === "POST") {
    const action = z.object({action: z.string()}).parse(body).action;
    if (action === "rename") state.island.name = z.object({name: z.string().trim().min(1).max(24)}).parse(body).name;
    else if (action === "move") {
      const {id, slot} = z.object({id: z.string(), slot: z.number().int().min(0).max(5)}).parse(body);
      const item = state.island.items.find(item => item.id === id) ?? reject("找不到這項建設", 404);
      const occupied = state.island.items.find(other => other.slot === slot && other.id !== id);
      if (occupied) occupied.slot = item.slot;
      item.slot = slot;
    } else if (action === "purchase") {
      const data = z.object({kind: z.string(), slot: z.number().int().min(0).max(5), requestId: z.string().uuid()}).parse(body);
      const item = buildings.find(item => item.id === data.kind) ?? reject("這項建設不存在");
      const previous = state.island.items.find(item => item.id === data.requestId);
      if (previous) {
        if (previous.kind !== data.kind || previous.slot !== data.slot) reject("購買識別已使用", 409);
        return {island: island(state)};
      }
      if (island(state).level < item.level) reject("營地等級還未解鎖這項建設");
      if (state.island.items.some(item => item.slot === data.slot || item.kind === data.kind)) reject("建設或位置已使用", 409);
      if (island(state).balance < item.cost) reject("星露不足，完成小目標就能獲得更多");
      state.island.items.push({id: data.requestId, kind: item.id, cost: item.cost, slot: data.slot});
    } else reject("不支援這項營地操作");
    return {island: island(state)};
  }
  return reject("試玩版不支援這個操作", 404);
}

/** Every request reads the latest persisted snapshot; unsuccessful writes never
 * replace it. Browser Web Locks serialize this queue across tabs when available. */
export function createBrowserPreviewStore(storage: PreviewStorage, clock = () => new Date()) {
  let pending: Promise<unknown> = Promise.resolve();
  const execute = async (path: string, method: string, body?: unknown) => {
    try {
      const before = storage.getItem(PREVIEW_STORAGE_KEY);
      const state = readState(before);
      const data = await dispatch(state, path, method, body, clock());
      const after = JSON.stringify(state);
      if (after !== before) storage.setItem(PREVIEW_STORAGE_KEY, after);
      return Response.json(data, {headers: {"Cache-Control": "no-store"}});
    } catch (error) {
      const message = error instanceof PreviewError ? error.message : error instanceof z.ZodError ? error.issues[0]?.message ?? "請檢查輸入內容" : "此瀏覽器目前無法保存試玩紀錄，請確認網站儲存空間與權限後重試。";
      return Response.json({error: message}, {status: error instanceof PreviewError ? error.status : error instanceof z.ZodError ? 400 : 503});
    }
  };
  return {
    request(path: string, method = "GET", body?: unknown) {
      const request = pending.then(() => execute(path, method, body));
      pending = request.catch(() => undefined);
      return request;
    },
  };
}
