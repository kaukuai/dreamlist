import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {dailyQuests, drawDailyQuests, npcQuests, npcs, questDay, questStepTitle, questTemplates} from '../lib/quest-model.ts';
import {canBecome, professionOf, progression} from '../lib/character-model.ts';

test('daily reset uses Taipei 04:00, including UTC, year, and leap-day boundaries', () => {
  for (const [now, dayKey, reset] of [
    ['2026-10-17T19:59:59.999Z', '2026-10-17', '2026-10-17T20:00:00.000Z'],
    ['2026-10-17T20:00:00.000Z', '2026-10-18', '2026-10-18T20:00:00.000Z'],
    ['2026-12-31T20:00:00.000Z', '2027-01-01', '2027-01-01T20:00:00.000Z'],
    ['2028-02-28T20:00:00.000Z', '2028-02-29', '2028-02-29T20:00:00.000Z'],
  ]) assert.deepEqual(questDay(new Date(now)), {dayKey, nextResetAt: reset});
});
test('daily choices are stable per player and day, varied, and use three different skills', async () => {
  const first = await drawDailyQuests('alice', '2026-10-17');
  assert.deepEqual(await drawDailyQuests('alice', '2026-10-17'), first);
  const seen = new Set();
  for (let day = 1; day <= 28; day++) {
    for (const owner of ['alice', 'bob']) {
      const quests = await drawDailyQuests(owner, `2026-10-${String(day).padStart(2, '0')}`);
      assert.equal(quests.length, 3);
      assert.equal(new Set(quests.map(quest => quest.id)).size, 3);
      assert.equal(new Set(quests.map(quest => quest.skill)).size, 3);
      assert.equal(quests.filter(quest => quest.skill === 'fitness').length, 1);
      assert.ok(quests.every(quest => dailyQuests.includes(quest)));
      quests.forEach(quest => seen.add(quest.id));
    }
  }
  assert.ok(seen.size > 10, 'choices offer useful variety over time');
});
test('starter assignments are short, provide movement alternatives, and have valid unique catalog IDs', () => {
  assert.equal(new Set(questTemplates.map(quest => quest.id)).size, questTemplates.length);
  assert.equal(new Set(npcs.map(npc => npc.portrait)).size, 6);
  assert.equal(npcQuests.length, 6);
  for (const quest of questTemplates) {
    assert.ok(npcs.some(npc => npc.id === quest.npcId));
    assert.ok(quest.minutes >= 1 && quest.minutes <= 5);
    assert.equal(quest.steps.length, quest.kind === 'daily' ? 1 : 3);
    assert.ok(quest.steps.every(step => questStepTitle(step).length <= 200));
    if (quest.kind === 'daily' && quest.skill === 'fitness') assert.ok(quest.steps[0].alternative, 'movement always has a seated alternative');
  }
});
test('NPC training lets a player unlock a class without creating a personal goal', () => {
  const complete = npcIds => progression(npcQuests.filter(quest => npcIds.includes(quest.npcId)).map(quest => ({skillId: quest.skill, xp: quest.steps.length * 40 + 100, skillXp: quest.steps.length * 20})));
  for (const [job, trainers] of [['warrior', ['lorne']], ['mage', ['selene', 'mira']], ['ranger', ['eira', 'ori']], ['bard', ['lucien']], ['artisan', ['ori']], ['healer', ['mira']]]) {
    const state = complete(trainers);
    assert.ok(state.level >= 2);
    assert.equal(canBecome(professionOf(job), state), true, job);
  }
});
test('NPC migration preserves old progress and isolates snapshots and contracts by owner', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const migration of ['0000_classy_thunderball', '0001_colorful_hulk', '0002_character_journey', '0003_mobile_rpg_advancement']) db.exec(readFileSync(new URL(`../drizzle/${migration}.sql`, import.meta.url), 'utf8'));
    db.exec("INSERT INTO dreams(id,owner_id,title,category,created_at,updated_at) VALUES('legacy','alice','舊目標','growth','before','before')");
    db.exec("INSERT INTO character_profiles(owner_id,weapon_id,head_id) VALUES('alice','oak-staff','sentinel-helm')");
    db.exec("INSERT INTO character_advancements(owner_id,profession,stage) VALUES('alice','mage',2)");
    db.exec("INSERT INTO character_rewards(owner_id,dream_id,task_id,kind,skill_id,xp,skill_xp,created_at) VALUES('alice','legacy','task','step','knowledge',40,20,'before')");
    db.exec(readFileSync(new URL('../drizzle/0004_npc_daily_quests.sql', import.meta.url), 'utf8'));
    assert.equal(db.prepare("SELECT title FROM dreams WHERE id='legacy'").get().title, '舊目標');
    assert.equal(db.prepare("SELECT stage FROM character_advancements WHERE owner_id='alice'").get().stage, 2);
    assert.equal(db.prepare("SELECT SUM(xp) xp FROM character_rewards WHERE owner_id='alice'").get().xp, 40);
    assert.equal(db.prepare("SELECT head_id FROM character_profiles WHERE owner_id='alice'").get().head_id, 'sentinel-helm');
    const snapshot = db.prepare('INSERT INTO quest_daily_boards(owner_id,day_key,template_ids,created_at) VALUES(?,?,?,?)');
    snapshot.run('alice', '2026-10-17', '["a"]', 'now'); snapshot.run('bob', '2026-10-17', '["b"]', 'now');
    assert.equal(db.prepare("SELECT template_ids FROM quest_daily_boards WHERE owner_id='alice'").get().template_ids, '["a"]');
    const contract = db.prepare("INSERT INTO quest_contracts(owner_id,offer_id,kind,template_id,npc_id,day_key,dream_id,accepted_at) VALUES(?,?,'npc','intro','lorne','',?,'now')");
    contract.run('alice', 'same-offer', 'goal-a'); contract.run('bob', 'same-offer', 'goal-b');
    assert.throws(() => contract.run('alice', 'same-offer', 'goal-duplicate'), /UNIQUE/);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM quest_contracts WHERE owner_id='alice'").get().n, 1);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM dreams").get().n, 1, 'acceptance snapshots do not create or rewrite goals');
  } finally {db.close();}
});
