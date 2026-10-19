import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {canAdvance, canBecome, canLearnTalent, defaultTraining, equipmentSlots, equipmentStats, evolutionPath, jobTitle, levelProgress, nextEvolution, professionBonuses, professionOf, professions, progression, skillRank, talents} from '../lib/character-model.ts';

test('character levels use cumulative thresholds and keep in-level XP bounded', () => {
  for (const [xp, level, into, next] of [[0, 1, 0, 100], [99, 1, 99, 100], [100, 2, 0, 200], [299, 2, 199, 200], [300, 3, 0, 300], [600, 4, 0, 400]]) {
    assert.deepEqual(levelProgress(xp), {level, totalXp: xp, xpInLevel: into, xpForNext: next});
  }
  for (let xp = 0; xp <= 100000; xp += 37) {
    const state = levelProgress(xp);
    assert.ok(state.xpInLevel >= 0 && state.xpInLevel < state.xpForNext);
  }
});
test('three real fitness steps unlock warrior and grant one level-up talent', () => {
  const state = progression([{skillId: 'fitness', xp: 120, skillXp: 60}, {skillId: null, xp: 100, skillXp: 0}]);
  assert.equal(state.level, 2);
  assert.equal(state.attributes.vitality, 16);
  assert.equal(state.attributes.agility, 13);
  assert.equal(state.availableTalentPoints, 1);
  assert.equal(canBecome(professionOf('warrior'), state), true);
  assert.equal(canBecome(professionOf('mage'), state), false);
});
test('mage requires both knowledge and mindfulness; unrelated XP cannot replace training', () => {
  const knowledgeOnly = progression([{skillId: 'knowledge', xp: 400, skillXp: 200}]);
  assert.equal(canBecome(professionOf('mage'), knowledgeOnly), false);
  const hybrid = progression([{skillId: 'knowledge', xp: 120, skillXp: 60}, {skillId: 'mindfulness', xp: 120, skillXp: 60}]);
  assert.equal(canBecome(professionOf('mage'), hybrid), true);
  assert.equal(canBecome(professionOf('healer'), hybrid), true);
  assert.equal(hybrid.attributes.spirit, 19);
});
test('talent allocation adds permanent attributes and spends the earned budget', () => {
  const rewards = [{skillId: null, xp: 340, skillXp: 0}];
  const state = progression(rewards, {intellect: 1, luck: 1});
  assert.equal(state.attributes.intellect, 12);
  assert.equal(state.attributes.luck, 12);
  assert.equal(state.availableTalentPoints, 0);
  assert.equal(state.totalXp, 340);
});
test('each starter training path meets its profession requirements without equipment or talents', () => {
  for (const profession of professions) {
    const rewards = profession.training.map(skillId => ({skillId, xp: 120, skillXp: 60}));
    assert.equal(canBecome(profession, progression(rewards)), true, profession.name);
  }
  assert.equal(canBecome(professionOf('ranger'), progression([{skillId: 'craft', xp: 120, skillXp: 60}])), false);
});
test('equipment bonuses apply only to the matching slot and can be fully removed', () => {
  const equipped = equipmentStats({weapon: 'oak-staff', outfit: 'linen-cloak', charm: 'lucky-pin'});
  assert.equal(equipped.intellect, 2);
  assert.equal(equipped.spirit, 2);
  assert.equal(equipped.luck, 2);
  assert.equal(equipmentStats({weapon: 'lucky-pin', outfit: null, charm: null}).luck, 0);
  assert.deepEqual(Object.values(equipmentStats({weapon: null, outfit: null, charm: null})), [0, 0, 0, 0, 0, 0]);
});
test('legacy categories have stable default training; skill ranks cap without discarding XP', () => {
  assert.equal(defaultTraining('health'), 'fitness');
  assert.equal(defaultTraining('growth'), 'knowledge');
  assert.equal(defaultTraining('career'), 'craft');
  assert.equal(defaultTraining('life'), 'mindfulness');
  assert.equal(defaultTraining('travel'), 'exploration');
  assert.equal(defaultTraining('unknown'), 'exploration');
  assert.equal(skillRank(59), 0);
  assert.equal(skillRank(60), 1);
  assert.equal(skillRank(6000), 10);
  assert.equal(progression([{skillId: 'fitness', xp: 12000, skillXp: 6000}]).skillXp.fitness, 6000);
});
test('levels and AP continue beyond the final class evolution', () => {
  for (const level of [10, 25, 50, 100, 200]) {
    const threshold = 50 * level * (level - 1);
    assert.equal(levelProgress(threshold - 1).level, level - 1);
    const state = progression([{skillId: null, xp: threshold, skillXp: 0}]);
    assert.equal(state.level, level);
    assert.equal(state.xpInLevel, 0);
    assert.equal(state.availableTalentPoints, level - 1);
  }
});
test('class evolution requires every training skill and the level of the next stage', () => {
  for (const profession of professions.slice(1)) {
    for (const step of evolutionPath(profession.id)) {
      const skillXp = Object.fromEntries(profession.training.map(id => [id, step.skillRank * 60]));
      const stage = step.stage - 1;
      assert.equal(canAdvance(profession.id, stage, {level: step.level - 1, skillXp}), false);
      assert.equal(canAdvance(profession.id, stage, {level: step.level, skillXp}), true);
      for (const id of profession.training) {
        assert.equal(canAdvance(profession.id, stage, {level: 200, skillXp: {...skillXp, [id]: step.skillRank * 60 - 1}}), false, `${profession.id}: ${id} is still required`);
      }
      assert.equal(jobTitle(profession.id, step.stage), step.name);
    }
    assert.equal(nextEvolution(profession.id, 3), null);
    assert.equal(canAdvance(profession.id, 3, {level: 200, skillXp: {}}), false);
  }
  assert.equal(canAdvance('wanderer', 0, {level: 200, skillXp: {}}), false);
});
test('base classes require level two even when skill and attribute gates are satisfied', () => {
  const trained = progression([{skillId: 'fitness', xp: 0, skillXp: 60}]);
  assert.equal(canBecome(professionOf('warrior'), trained), false);
  assert.equal(canBecome(professionOf('warrior'), {...trained, level: 2}), true);
  assert.equal(canBecome(professionOf('wanderer'), trained), true);
});
test('talent mastery and awakening enforce level, prerequisite rank, AP, and node cap', () => {
  const node = id => talents.find(talent => talent.id === id);
  const root = node('intellect'), mastery = node('intellect-mastery'), awakening = node('intellect-awakening');
  const state = progression([{skillId: null, xp: 19000, skillXp: 0}], {intellect: 2});
  assert.equal(state.level, 20);
  assert.equal(canLearnTalent(mastery, {...state, level: 7}), false);
  assert.equal(canLearnTalent(mastery, {...state, talents: {...state.talents, intellect: 1}}), false);
  assert.equal(canLearnTalent(mastery, {...state, level: 8}), true);
  assert.equal(canLearnTalent(mastery, {...state, availableTalentPoints: 0}), false);
  assert.equal(canLearnTalent(root, {...state, talents: {...state.talents, intellect: 3}}), false);
  assert.equal(canLearnTalent(awakening, {...state, talents: {...state.talents, 'intellect-mastery': 2}}), false);
  const ready = {...state, talents: {...state.talents, 'intellect-mastery': 3}};
  assert.equal(canLearnTalent(awakening, {...ready, level: 19}), false);
  assert.equal(canLearnTalent(awakening, ready), true);
  const learned = progression([{skillId: null, xp: 19000, skillXp: 0}], {intellect: 2, 'intellect-mastery': 3, 'intellect-awakening': 1});
  assert.equal(learned.attributes.intellect, 29);
  assert.equal(learned.availableTalentPoints, 13);
  assert.equal(learned.totalXp, state.totalXp);
});
test('all six gear slots contribute, and class bonuses apply only to the chosen branch', () => {
  assert.equal(equipmentSlots.length, 6);
  const bonus = equipmentStats({weapon: 'oak-staff', head: 'sentinel-helm', offhand: 'iron-buckler', outfit: 'linen-cloak', boots: 'wind-boots', charm: 'lucky-pin'});
  assert.deepEqual(bonus, {intellect: 2, vitality: 4, agility: 2, spirit: 3, charisma: 0, luck: 2});
  assert.equal(professionBonuses('mage', 2).intellect, 6);
  assert.equal(professionBonuses('mage', 2).spirit, 2);
  assert.equal(professionBonuses('warrior', 2).intellect, 0);
  assert.equal(professionBonuses('warrior', 2).vitality, 6);
  assert.ok(Object.values(professionBonuses('wanderer', 0)).every(value => value === 0));
});
test('additive migration preserves existing dreams, island rewards, and per-owner ledger isolation', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const name of ['0000_classy_thunderball', '0001_colorful_hulk']) db.exec(readFileSync(new URL(`../drizzle/${name}.sql`, import.meta.url), 'utf8'));
    db.prepare("INSERT INTO dreams(id,owner_id,title,category,created_at,updated_at) VALUES(?,?,?,?,?,?)").run('legacy', 'alice', '原有夢想', 'growth', '2026-10-16', '2026-10-16');
    db.prepare("INSERT INTO island_rewards(id,owner_id,amount,kind,created_at) VALUES(?,?,?,?,?)").run('receipt', 'alice', 25, 'step', '2026-10-16');
    db.exec(readFileSync(new URL('../drizzle/0002_character_journey.sql', import.meta.url), 'utf8'));
    assert.equal(db.prepare("SELECT title FROM dreams WHERE id='legacy'").get().title, '原有夢想');
    assert.equal(db.prepare("SELECT SUM(amount) amount FROM island_rewards").get().amount, 25);
    const reward = db.prepare("INSERT OR IGNORE INTO character_rewards(owner_id,dream_id,task_id,kind,skill_id,xp,skill_xp,created_at) VALUES(?,?,?,'step','knowledge',40,20,'now')");
    reward.run('alice', 'legacy', 'task'); reward.run('alice', 'legacy', 'task'); reward.run('bob', 'legacy', 'task');
    assert.equal(db.prepare("SELECT COUNT(*) count FROM character_rewards").get().count, 2);
    db.exec("INSERT INTO character_profiles(owner_id,name,profession,weapon_id,outfit_id,charm_id) VALUES('alice','舊角色','mage','oak-staff','linen-cloak','lucky-pin')");
    db.exec("INSERT INTO character_talents(owner_id,talent_id,rank) VALUES('alice','intellect',2)");
    db.exec("INSERT INTO character_inventory(owner_id,item_id,cost,created_at) VALUES('alice','oak-staff',60,'before')");
    db.exec(readFileSync(new URL('../drizzle/0003_mobile_rpg_advancement.sql', import.meta.url), 'utf8'));
    const profile = db.prepare("SELECT * FROM character_profiles WHERE owner_id='alice'").get();
    assert.equal(profile.name, '舊角色'); assert.equal(profile.profession, 'mage');
    assert.equal(profile.weapon_id, 'oak-staff'); assert.equal(profile.outfit_id, 'linen-cloak'); assert.equal(profile.charm_id, 'lucky-pin');
    assert.equal(profile.head_id, null); assert.equal(profile.offhand_id, null); assert.equal(profile.boots_id, null);
    assert.equal(db.prepare("SELECT rank FROM character_talents WHERE owner_id='alice'").get().rank, 2);
    assert.equal(db.prepare("SELECT cost FROM character_inventory WHERE owner_id='alice'").get().cost, 60);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM character_rewards").get().count, 2);
    const advance = db.prepare("INSERT INTO character_advancements(owner_id,profession,stage) VALUES(?,?,?)");
    advance.run('alice', 'mage', 1); advance.run('alice', 'healer', 2); advance.run('bob', 'mage', 3);
    assert.equal(db.prepare("SELECT stage FROM character_advancements WHERE owner_id='alice' AND profession='mage'").get().stage, 1);
    assert.equal(db.prepare("SELECT COUNT(*) count FROM character_advancements WHERE owner_id='alice'").get().count, 2);
  } finally {db.close();}
});
