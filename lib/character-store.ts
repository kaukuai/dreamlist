import {prepared} from "./dream-store";
import {attributeIds, characterPower, equipmentStats, levelProgress, professionBonuses, professionIds, progression, skillIds, talentIds, STEP_XP, DREAM_XP, SKILL_XP, type TalentId, type AvatarColor, type CharacterState, type LeaderboardEntry, type LeaderboardState, type ProfessionId, type RewardTotal, type SkillId} from "./character-model";

/** Re-read committed goals; classification is frozen in the first completion receipt. */
export function characterRewardStatements(ownerId: string) {
  const db = prepared();
  const now = new Date().toISOString();
  const fallback = `CASE d.category WHEN 'growth' THEN 'knowledge' WHEN 'health' THEN 'fitness' WHEN 'career' THEN 'craft' WHEN 'life' THEN 'mindfulness' ELSE 'exploration' END`;
  const allowed = skillIds.map(id => `'${id}'`).join(",");
  const training = `CASE WHEN json_extract(t.value,'$.training') IN (${allowed}) THEN json_extract(t.value,'$.training') ELSE ${fallback} END`;
  return [
    db.prepare(`INSERT OR IGNORE INTO character_rewards(owner_id,dream_id,task_id,kind,skill_id,xp,skill_xp,created_at)
      SELECT ?,d.id,json_extract(t.value,'$.id'),'step',${training},${STEP_XP},${SKILL_XP},?
      FROM dreams d,json_each(d.tasks) t
      WHERE d.owner_id=? AND d.deleted_at IS NULL AND json_extract(t.value,'$.done')=1`).bind(ownerId, now, ownerId),
    db.prepare(`INSERT OR IGNORE INTO character_rewards(owner_id,dream_id,task_id,kind,skill_id,xp,skill_xp,created_at)
      SELECT ?,d.id,'','dream',NULL,${DREAM_XP},0,? FROM dreams d
      WHERE d.owner_id=? AND d.deleted_at IS NULL AND json_array_length(d.tasks)>0
      AND NOT EXISTS(SELECT 1 FROM json_each(d.tasks) t WHERE json_extract(t.value,'$.done')!=1)`).bind(ownerId, now, ownerId),
  ];
}

export async function characterState(ownerId: string): Promise<CharacterState> {
  const db = prepared();
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO character_profiles(owner_id) VALUES(?)").bind(ownerId),
    ...characterRewardStatements(ownerId),
  ]);
  const results = await db.batch<Record<string, unknown>>([
    db.prepare("SELECT * FROM character_profiles WHERE owner_id=?").bind(ownerId),
    db.prepare("SELECT skill_id,SUM(xp) xp,SUM(skill_xp) skill_xp FROM character_rewards WHERE owner_id=? GROUP BY skill_id").bind(ownerId),
    db.prepare("SELECT talent_id,rank FROM character_talents WHERE owner_id=?").bind(ownerId),
    db.prepare("SELECT item_id FROM character_inventory WHERE owner_id=? ORDER BY created_at,item_id").bind(ownerId),
    db.prepare("SELECT profession,stage FROM character_advancements WHERE owner_id=?").bind(ownerId),
  ]);
  const profile = results[0].results[0];
  const rewards: RewardTotal[] = results[1].results.map(row => ({skillId: row.skill_id as SkillId | null, xp: Number(row.xp), skillXp: Number(row.skill_xp)}));
  const learned: Partial<Record<TalentId, number>> = {};
  for (const row of results[2].results) if (talentIds.includes(row.talent_id as TalentId)) learned[row.talent_id as TalentId] = Number(row.rank);
  const growth = progression(rewards, learned);
  const inventory = results[3].results.map(row => String(row.item_id));
  const equipped = {weapon: profile.weapon_id as string | null, outfit: profile.outfit_id as string | null, charm: profile.charm_id as string | null, head: profile.head_id as string | null, offhand: profile.offhand_id as string | null, boots: profile.boots_id as string | null};
  const bonuses = equipmentStats(equipped);
  const advancements = Object.fromEntries(professionIds.map(id => [id, Number(results[4].results.find(row => row.profession === id)?.stage ?? 0)])) as Record<ProfessionId, number>;
  const jobBonuses = professionBonuses(profile.profession as ProfessionId, advancements[profile.profession as ProfessionId]);
  const effectiveAttributes = Object.fromEntries(attributeIds.map(id => [id, growth.attributes[id] + bonuses[id] + jobBonuses[id]])) as CharacterState["attributes"];
  return {
    ...growth, name: String(profile.name), profession: profile.profession as ProfessionId,
    avatarColor: profile.avatar_color as AvatarColor, leaderboardOptIn: Boolean(profile.leaderboard_opt_in),
    inventory, equipped, equipmentBonuses: bonuses,
    advancements, professionBonuses: jobBonuses, effectiveAttributes,
    power: characterPower(growth.level, effectiveAttributes, Object.values(equipped).filter(Boolean).length, advancements[profile.profession as ProfessionId]),
  };
}

export async function leaderboardState(ownerId: string): Promise<LeaderboardState> {
  // Consent is checked on every request, so opting out removes a character immediately.
  const rows = await prepared().prepare(`WITH scores AS (
    SELECT p.owner_id,p.name,p.profession,p.avatar_color,COALESCE(SUM(r.xp),0) total_xp
    FROM character_profiles p LEFT JOIN character_rewards r ON r.owner_id=p.owner_id
    WHERE p.leaderboard_opt_in=1 GROUP BY p.owner_id
  ), ranked AS (
    SELECT *,RANK() OVER (ORDER BY total_xp DESC) place FROM scores
  ), first_fifty AS (
    SELECT * FROM ranked ORDER BY total_xp DESC,name,owner_id LIMIT 50
  ) SELECT * FROM first_fifty UNION ALL
    SELECT * FROM ranked WHERE owner_id=? AND owner_id NOT IN (SELECT owner_id FROM first_fifty)
    ORDER BY total_xp DESC,name,owner_id`).bind(ownerId).all();
  const entries: LeaderboardEntry[] = rows.results.map(row => ({
    rank: Number(row.place), name: String(row.name), profession: row.profession as ProfessionId,
    avatarColor: row.avatar_color as AvatarColor, totalXp: Number(row.total_xp),
    level: levelProgress(Number(row.total_xp)).level, isYou: row.owner_id === ownerId,
  }));
  return {entries: entries.slice(0, 50), yourEntry: entries.find(entry => entry.isYou) ?? null};
}
