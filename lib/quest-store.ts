import {companionQuests} from "./npc-stories";
import {ApiError, findDream, prepared} from "./dream-store";
import {DREAM_XP, STEP_XP} from "./character-model";
import {drawDailyQuests, npcQuests, questCategory, questDay, questOf, questStepTitle, type QuestBoardState, type QuestOffer, type QuestTemplate} from "./quest-model";
import type {Task} from "./dream-model";

type Contract = {offer_id: string; dream_id: string; tasks: string | null; deleted_at: string | null; goal_present: number; rewarded: number};
const offerKey = (quest: QuestTemplate, dayKey: string) => quest.kind === "daily" ? `daily:${dayKey}:${quest.id}` : `npc:${quest.id}`;

async function dailySnapshot(ownerId: string, dayKey: string, now: string): Promise<QuestTemplate[]> {
  const db = prepared();
  let saved = await db.prepare("SELECT template_ids FROM quest_daily_boards WHERE owner_id=? AND day_key=?").bind(ownerId, dayKey).first<{template_ids: string}>();
  if (!saved) {
    const drawn = await drawDailyQuests(ownerId, dayKey);
    await db.prepare("INSERT OR IGNORE INTO quest_daily_boards(owner_id,day_key,template_ids,created_at) VALUES(?,?,?,?)").bind(ownerId, dayKey, JSON.stringify(drawn.map(quest => quest.id)), now).run();
    saved = await db.prepare("SELECT template_ids FROM quest_daily_boards WHERE owner_id=? AND day_key=?").bind(ownerId, dayKey).first<{template_ids: string}>();
  }
  const ids: string[] = JSON.parse(saved!.template_ids);
  const quests = ids.map(id => questOf(id));
  if (quests.length !== 3 || quests.some(quest => !quest || quest.kind !== "daily")) throw new ApiError(503, "每日委託目錄暫時無法讀取，請稍後重試");
  return quests as QuestTemplate[];
}

export async function questBoardState(ownerId: string, now = new Date()): Promise<QuestBoardState> {
  const clock = questDay(now), serverTime = now.toISOString();
  const daily = await dailySnapshot(ownerId, clock.dayKey, serverTime);
  const contracts = await prepared().prepare(`SELECT q.offer_id,q.dream_id,d.tasks,d.deleted_at,d.id IS NOT NULL goal_present,
    EXISTS(SELECT 1 FROM character_rewards r WHERE r.owner_id=q.owner_id AND r.dream_id=q.dream_id AND r.kind='dream') rewarded
    FROM quest_contracts q LEFT JOIN dreams d ON d.id=q.dream_id AND d.owner_id=q.owner_id
    WHERE q.owner_id=? AND (q.kind='npc' OR q.day_key=?)`).bind(ownerId, clock.dayKey).all<Contract>();
  const offer = (quest: QuestTemplate): QuestOffer => {
    const offerId = offerKey(quest, clock.dayKey);
    const contract = contracts.results.find(row => row.offer_id === offerId);
    const tasks: Task[] = contract?.tasks ? JSON.parse(contract.tasks) : [];
    const completedSteps = tasks.filter(task => task.done).length;
    const present = Boolean(contract?.goal_present && !contract.deleted_at);
    const status = !contract ? quest.requires&&!contracts.results.some(c=>c.offer_id===`npc:${quest.requires}`&&c.rewarded) ? "locked" : "available" : contract.rewarded ? "complete" : !present ? "archived" : "active";
    return {...quest, offerId, status, dreamId: present ? contract!.dream_id : null, completedSteps, xp: quest.steps.length * STEP_XP + DREAM_XP, coins: quest.steps.length * 25 + 100};
  };
  return {...clock, serverTime, daily: daily.map(offer), introductions: npcQuests.map(offer),sideQuests:companionQuests.map(offer)};
}

export async function acceptQuest(ownerId: string, offerId: string, now = new Date()) {
  const db = prepared();
  // A retry still opens the original contract, even after the next daily reset.
  const existing = await db.prepare("SELECT dream_id FROM quest_contracts WHERE owner_id=? AND offer_id=?").bind(ownerId, offerId).first<{dream_id: string}>();
  if (existing) return {dream: await existingDream(existing.dream_id, ownerId), created: false};
  const board = await questBoardState(ownerId, now);
  const offer = [...board.daily, ...board.introductions,...(board.sideQuests??[])].find(offer => offer.offerId === offerId);
  if (!offer) throw new ApiError(400, "這份委託不在目前的清單中；每日委託可能已更新，請重新整理");
  if(offer.status==="locked")throw new ApiError(409,"先完成前一份夥伴委託，再來接取這段故事");
  const id = crypto.randomUUID(), timestamp = now.toISOString();
  const tasks: Task[] = offer.steps.map((step, index) => ({id: `quest-${id}-${index + 1}`, title: questStepTitle(step), training: offer.skill, done: false, completedAt: null}));
  const dayKey = offer.kind === "daily" ? board.dayKey : "";
  // Contract and goal are committed together. Losing a concurrent INSERT cannot
  // create a second goal, and even a changed catalog cannot exceed three dailies.
  const results = await db.batch([
    db.prepare(`INSERT OR IGNORE INTO quest_contracts(owner_id,offer_id,kind,template_id,npc_id,day_key,dream_id,accepted_at)
      SELECT ?,?,?,?,?,?,?,? WHERE ?='npc' OR
      (SELECT COUNT(*) FROM quest_contracts WHERE owner_id=? AND kind='daily' AND day_key=?)<3`)
      .bind(ownerId, offerId, offer.kind, offer.id, offer.npcId, dayKey, id, timestamp, offer.kind, ownerId, dayKey),
    db.prepare(`INSERT INTO dreams(id,owner_id,title,description,category,target_date,tasks,revision,created_at,updated_at)
      SELECT dream_id,?,?,?,?,?,?,1,?,? FROM quest_contracts WHERE owner_id=? AND offer_id=? AND dream_id=?`)
      .bind(ownerId, offer.title, offer.description, questCategory(offer.skill), "", JSON.stringify(tasks), timestamp, timestamp, ownerId, offerId, id),
  ]);
  const saved = await db.prepare("SELECT dream_id FROM quest_contracts WHERE owner_id=? AND offer_id=?").bind(ownerId, offerId).first<{dream_id: string}>();
  if (!saved) throw new ApiError(409, "今天的 3 份每日委託都已接取，明天會有新的選擇");
  return {dream: await existingDream(saved.dream_id, ownerId), created: results[0].meta.changes === 1};
}
async function existingDream(id: string, ownerId: string) {
  try {return await findDream(id, ownerId);}
  catch (error) {if (error instanceof ApiError && error.status === 404) throw new ApiError(409, "這份委託已收起，接取紀錄仍會保留，不能重複領取"); throw error;}
}
