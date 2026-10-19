import {test} from 'node:test';
import assert from 'node:assert/strict';

// Run only against an explicitly selected, disposable local database.
const base = process.env.DREAMLIST_TEST_BASE_URL;
test('life RPG APIs, receipts, shared wallet, talents, and leaderboard consent', {skip: !base}, async t => {
  assert.equal(process.env.DREAMLIST_TEST_ALLOW_WRITES, '1', 'Use a disposable database and explicitly allow local test writes');
  assert.equal(new URL(base).hostname, '127.0.0.1');
  const login = await fetch(base + '/signin-with-chatgpt', {redirect: 'manual'});
  assert.equal(login.status, 302);
  const cookie = login.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie);
  async function request(path, {method = 'GET', body, authenticated = true, origin = base} = {}) {
    const response = await fetch(base + path, {method, headers: {
      ...(authenticated ? {cookie} : {}),
      ...(body ? {'Content-Type': 'application/json', origin} : {}),
    }, ...(body ? {body: JSON.stringify(body)} : {})});
    const text = await response.text();
    return {status: response.status, data: response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : {error: text}};
  }
  const act = body => request('/api/character', {method: 'POST', body});
  let character = (await request('/api/character')).data.character;
  assert.equal(character.totalXp, 0, 'requires a pristine character');
  assert.equal((await request('/api/island')).data.island.balance, 100, 'requires a pristine wallet');
  let dream;
  await t.test('authentication, origin, strict payloads, and progression gates', async () => {
    for (const path of ['/api/character', '/api/leaderboard']) assert.equal((await request(path, {authenticated: false})).status, 401);
    assert.equal((await act({action: 'profile', name: '測試', avatarColor: 'mint', leaderboardOptIn: false, xp: 9999})).status, 400);
    assert.equal((await request('/api/character', {method: 'POST', origin: 'https://wrong-origin.invalid', body: {action: 'profession', profession: 'wanderer'}})).status, 403);
    assert.equal((await act({action: 'profession', profession: 'mage'})).status, 400);
    assert.equal((await act({action: 'talent', talentId: 'intellect'})).status, 400);
    assert.equal((await act({action: 'advance'})).status, 400);
    assert.equal((await act({action: 'advance', stage: 3, profession: 'mage'})).status, 400);
    assert.equal((await act({action: 'purchase', itemId: 'trail-bow'})).status, 400);
    assert.equal((await act({action: 'equip', slot: 'weapon', itemId: 'oak-staff'})).status, 400);
  });
  await t.test('simultaneous island and equipment purchases cannot overspend or charge retries twice', async () => {
    const islandPurchase = {action: 'purchase', kind: 'blossom', slot: 0, requestId: crypto.randomUUID()};
    const results = await Promise.all([act({action: 'purchase', itemId: 'oak-staff'}), request('/api/island', {method: 'POST', body: islandPurchase})]);
    assert.equal(results.filter(result => result.status === 200).length, 1, JSON.stringify(results));
    assert.equal(results.filter(result => result.status === 400).length, 1);
    const balance = (await request('/api/island')).data.island.balance;
    assert.ok(balance === 40 || balance === 50);
    const retry = results[0].status === 200 ? await act({action: 'purchase', itemId: 'oak-staff'}) : await request('/api/island', {method: 'POST', body: islandPurchase});
    assert.equal(retry.status, 200);
    assert.equal(retry.data.island.balance, balance);
  });
  await t.test('creating a goal cannot self-award XP; concurrent completion pays once', async () => {
    const body = {title: 'RPG integration test', description: '', category: 'growth', targetDate: '', tasks: ['knowledge', 'knowledge', 'knowledge', 'mindfulness', 'mindfulness', 'mindfulness'].map(training => ({id: crypto.randomUUID(), title: '本機修練測試', done: true, training}))};
    const result = await request('/api/dreams', {method: 'POST', body});
    assert.equal(result.status, 201);
    dream = result.data.dream;
    assert.ok(dream.tasks.every(task => !task.done));
    assert.equal((await request('/api/character')).data.character.totalXp, 0);
    const completed = {...dream, tasks: dream.tasks.map(task => ({...task, done: true}))};
    const writes = await Promise.all([request('/api/dreams/' + dream.id, {method: 'PUT', body: completed}), request('/api/dreams/' + dream.id, {method: 'PUT', body: completed})]);
    assert.equal(writes.filter(result => result.status === 200).length, 1);
    assert.equal(writes.filter(result => result.status === 409).length, 1);
    dream = writes.find(result => result.status === 200).data.dream;
    character = (await request('/api/character')).data.character;
    assert.equal(character.totalXp, 340);
    assert.equal(character.level, 3);
    assert.equal(character.skillXp.knowledge, 60);
    assert.equal(character.skillXp.mindfulness, 60);
    assert.equal(character.availableTalentPoints, 2);
  });
  await t.test('unchecking, retagging, and re-completing preserve the first reward and training classification', async () => {
    let result = await request('/api/dreams/' + dream.id, {method: 'PUT', body: {...dream, tasks: dream.tasks.map(task => ({...task, done: false, training: 'fitness'}))}});
    assert.equal(result.status, 200);
    dream = result.data.dream;
    assert.equal(result.data.character.totalXp, 340);
    assert.equal(dream.tasks[0].training, 'knowledge');
    assert.ok(dream.tasks.every(task => task.trainingLocked));
    result = await request('/api/dreams/' + dream.id, {method: 'PUT', body: {...dream, tasks: dream.tasks.map(task => ({...task, done: true}))}});
    assert.equal(result.status, 200);
    dream = result.data.dream;
    assert.equal(result.data.character.totalXp, 340);
    assert.equal(result.data.character.skillXp.fitness, 0);
    assert.equal(result.data.island.earned, 250);
  });
  await t.test('free profession switching preserves all learned skills and XP', async () => {
    for (const profession of ['mage', 'wanderer', 'healer', 'mage']) {
      const result = await act({action: 'profession', profession});
      assert.equal(result.status, 200);
      assert.equal(result.data.character.profession, profession);
      assert.equal(result.data.character.totalXp, 340);
      assert.equal(result.data.character.skillXp.knowledge, 60);
    }
  });
  await t.test('concurrent talent allocation cannot spend more points than earned', async () => {
    const results = await Promise.all(['intellect', 'vitality', 'luck'].map(talentId => act({action: 'talent', talentId})));
    assert.equal(results.filter(result => result.status === 200).length, 2, JSON.stringify(results));
    character = (await request('/api/character')).data.character;
    assert.equal(Object.values(character.talents).reduce((total, rank) => total + rank, 0), 2);
    assert.equal(character.availableTalentPoints, 0);
    assert.equal((await act({action: 'talent', talentId: 'agility'})).status, 400);
  });
  await t.test('equipment purchase is idempotent, owned-slot checks hold, and unequip removes bonuses', async () => {
    const purchases = await Promise.all([act({action: 'purchase', itemId: 'oak-staff'}), act({action: 'purchase', itemId: 'oak-staff'})]);
    assert.ok(purchases.every(result => result.status === 200));
    const balance = (await request('/api/island')).data.island.balance;
    assert.equal((await act({action: 'purchase', itemId: 'oak-staff'})).data.island.balance, balance);
    let result = await act({action: 'equip', slot: 'weapon', itemId: 'oak-staff'});
    assert.equal(result.status, 200);
    assert.equal(result.data.character.effectiveAttributes.intellect, result.data.character.attributes.intellect + 2);
    assert.equal((await act({action: 'equip', slot: 'charm', itemId: 'oak-staff'})).status, 400);
    result = await act({action: 'equip', slot: 'weapon', itemId: null});
    assert.equal(result.data.character.effectiveAttributes.intellect, result.data.character.attributes.intellect);
  });
  await t.test('leaderboard is opt-in, shares only public character fields, and opt-out is immediate', async () => {
    assert.equal((await request('/api/leaderboard')).data.yourEntry, null);
    assert.equal((await act({action: 'profile', name: '驗證旅人', avatarColor: 'lilac', leaderboardOptIn: true})).status, 200);
    const board = (await request('/api/leaderboard')).data;
    assert.equal(board.yourEntry.name, '驗證旅人');
    assert.equal(board.yourEntry.totalXp, 340);
    assert.equal(board.entries.filter(entry => entry.isYou).length, 1);
    assert.deepEqual(Object.keys(board.yourEntry).sort(), ['avatarColor', 'isYou', 'level', 'name', 'profession', 'rank', 'totalXp']);
    assert.equal((await act({action: 'profile', name: '驗證旅人', avatarColor: 'lilac', leaderboardOptIn: false})).status, 200);
    const hidden = (await request('/api/leaderboard')).data;
    assert.equal(hidden.yourEntry, null);
    assert.ok(!hidden.entries.some(entry => entry.isYou));
  });
  await t.test('deleting a dream retains earned character and island growth', async () => {
    assert.equal((await request('/api/dreams/' + dream.id, {method: 'DELETE'})).status, 200);
    assert.equal((await request('/api/character')).data.character.totalXp, 340);
    assert.equal((await request('/api/island')).data.island.earned, 250);
    assert.ok(!(await request('/api/dreams')).data.dreams.some(entry => entry.id === dream.id));
  });
  let advancedGoal;
  await t.test('normal task receipts reach level ten; concurrent evolution cannot skip a stage', async () => {
    const created = await request('/api/dreams', {method: 'POST', body: {title: 'Disposable advancement validation', description: '', category: 'growth', targetDate: '', tasks: Array.from({length: 104}, (_, i) => ({id: crypto.randomUUID(), title: `本機驗證 ${i + 1}`, done: false, training: i % 2 ? 'knowledge' : 'mindfulness'}))}});
    assert.equal(created.status, 201);
    advancedGoal = created.data.dream;
    assert.equal((await act({action: 'advance'})).status, 400, 'level three cannot evolve');
    const completed = await request('/api/dreams/' + advancedGoal.id, {method: 'PUT', body: {...advancedGoal, tasks: advancedGoal.tasks.map(task => ({...task, done: true}))}});
    assert.equal(completed.status, 200);
    advancedGoal = completed.data.dream;
    character = completed.data.character;
    assert.equal(character.level, 10); assert.equal(character.totalXp, 4600);
    const results = await Promise.all([act({action: 'advance'}), act({action: 'advance'})]);
    assert.equal(results.filter(result => result.status === 200).length, 1, JSON.stringify(results));
    assert.ok(results.some(result => result.status === 400 || result.status === 409));
    character = (await request('/api/character')).data.character;
    assert.equal(character.advancements.mage, 1); assert.equal(character.profession, 'mage');
    assert.equal(character.totalXp, 4600); assert.equal(character.professionBonuses.intellect, 3);
    assert.equal(character.effectiveAttributes.intellect, character.attributes.intellect + character.equipmentBonuses.intellect + 3);
    assert.equal((await act({action: 'advance'})).status, 400, 'stage two requires level 25');
  });
  await t.test('evolution is retained independently for each class and applies only active bonuses', async () => {
    const before = character;
    let result = await act({action: 'profession', profession: 'healer'});
    assert.equal(result.status, 200); assert.equal(result.data.character.advancements.healer, 0);
    assert.equal(result.data.character.professionBonuses.intellect, 0);
    result = await act({action: 'advance'});
    assert.equal(result.status, 200); assert.equal(result.data.character.advancements.healer, 1);
    assert.equal(result.data.character.professionBonuses.spirit, 3);
    result = await act({action: 'profession', profession: 'mage'});
    assert.equal(result.status, 200);
    assert.equal(result.data.character.advancements.mage, 1); assert.equal(result.data.character.advancements.healer, 1);
    assert.deepEqual(result.data.character.skillXp, before.skillXp);
    assert.deepEqual(result.data.character.talents, before.talents);
    assert.equal(result.data.character.totalXp, before.totalXp);
    assert.equal(result.data.character.professionBonuses.intellect, 3);
  });
  await t.test('mastery cannot bypass prerequisites or concurrent rank caps; awakening needs level twenty', async () => {
    assert.equal((await act({action: 'talent', talentId: 'intellect-mastery'})).status, 400);
    character = (await request('/api/character')).data.character;
    for (let rank = character.talents.intellect; rank < 2; rank++) assert.equal((await act({action: 'talent', talentId: 'intellect'})).status, 200);
    const before = (await request('/api/character')).data.character;
    const results = await Promise.all(Array.from({length: 4}, () => act({action: 'talent', talentId: 'intellect-mastery'})));
    assert.equal(results.filter(result => result.status === 200).length, 3, JSON.stringify(results));
    character = (await request('/api/character')).data.character;
    assert.equal(character.talents['intellect-mastery'], 3);
    assert.equal(character.attributes.intellect, before.attributes.intellect + 9);
    assert.equal(character.availableTalentPoints, before.availableTalentPoints - 3);
    assert.equal((await act({action: 'talent', talentId: 'intellect-awakening'})).status, 400);
    assert.equal((await act({action: 'talent', talentId: 'intellect-mastery'})).status, 400);
    assert.equal(character.totalXp, 4600);
  });
  await t.test('all six equipment slots persist together and combine with evolution bonuses', async () => {
    const loadout = {weapon: 'oak-staff', head: 'sentinel-helm', offhand: 'iron-buckler', outfit: 'linen-cloak', boots: 'wind-boots', charm: 'lucky-pin'};
    for (const [slot, itemId] of Object.entries(loadout)) {
      assert.equal((await act({action: 'purchase', itemId})).status, 200);
      assert.equal((await act({action: 'equip', slot, itemId})).status, 200);
    }
    character = (await request('/api/character')).data.character;
    assert.deepEqual(character.equipped, loadout);
    assert.deepEqual(character.equipmentBonuses, {intellect: 2, vitality: 4, agility: 2, spirit: 3, charisma: 0, luck: 2});
    for (const attribute of Object.keys(character.attributes)) assert.equal(character.effectiveAttributes[attribute], character.attributes[attribute] + character.equipmentBonuses[attribute] + character.professionBonuses[attribute]);
    assert.equal((await act({action: 'equip', slot: 'boots', itemId: 'sentinel-helm'})).status, 400);
    assert.equal((await request('/api/dreams/' + advancedGoal.id, {method: 'DELETE'})).status, 200);
    assert.equal((await request('/api/character')).data.character.totalXp, 4600);
  });
});
