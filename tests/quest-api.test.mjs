import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';

const base = process.env.DREAMLIST_TEST_BASE_URL;
test('daily offers and NPC contracts use real goals, immutable training, and first-completion rewards', {skip: !base}, async t => {
  assert.equal(process.env.DREAMLIST_TEST_ALLOW_WRITES, '1', 'Use a disposable local database');
  assert.equal(new URL(base).hostname, '127.0.0.1');
  const login = await fetch(base + '/signin-with-chatgpt', {redirect: 'manual'});
  const cookie = login.headers.get('set-cookie')?.split(';')[0]; assert.ok(cookie);
  async function request(path, {method = 'GET', body, authenticated = true, origin = base} = {}) {
    const response = await fetch(base + path, {method, headers: {...(authenticated ? {cookie} : {}), ...(body ? {'Content-Type': 'application/json', origin} : {})}, ...(body ? {body: JSON.stringify(body)} : {})});
    const text = await response.text();
    return {status: response.status, data: response.headers.get('content-type')?.includes('application/json') ? JSON.parse(text) : {error: text}};
  }
  const accept = body => request('/api/quests', {method: 'POST', body});
  const character = async () => (await request('/api/character')).data.character;
  const goals = async () => (await request('/api/dreams')).data.dreams;
  const balance = async () => (await request('/api/island')).data.island.balance;
  const before = {character: await character(), balance: await balance(), goals: await goals()};
  let board, daily, intro;
  await t.test('the board is authenticated, stable, private, and does not pre-create or reward goals', async () => {
    assert.equal((await request('/api/quests', {authenticated: false})).status, 401);
    assert.equal((await request('/api/quests', {method: 'POST', body: {offerId: 'npc:missing'}, authenticated: false})).status, 401);
    const result = await request('/api/quests'); assert.equal(result.status, 200); board = result.data;
    assert.equal(board.daily.length, 3); assert.equal(board.introductions.length, 6);
    assert.ok([...board.daily, ...board.introductions].every(offer => offer.status === 'available'));
    assert.equal(new Set(board.daily.map(offer => offer.skill)).size, 3);
    assert.ok(board.daily.some(offer => offer.skill === 'fitness'));
    assert.deepEqual((await request('/api/quests')).data.daily.map(offer => offer.offerId), board.daily.map(offer => offer.offerId));
    assert.doesNotMatch(JSON.stringify(board), /"(?:owner_id|ownerId|email|accountId)"/);
    assert.equal((await goals()).length, before.goals.length);
    assert.equal((await character()).totalXp, before.character.totalXp);
    assert.equal(await balance(), before.balance);
  });
  await t.test('client dates, seeds, NPC identity, XP, and invented offers cannot select rewards', async () => {
    const offerId = board.daily[0].offerId;
    for (const extra of [{dayKey: '2040-01-01'}, {seed: 'reroll'}, {xp: 99999}, {npcId: 'lorne'}, {ownerId: 'someone-else'}]) assert.equal((await accept({offerId, ...extra})).status, 400);
    assert.equal((await accept({offerId: 'daily:2000-01-01:daily-short-walk-v1'})).status, 400);
    assert.equal((await accept({offerId: 'npc:missing-quest'})).status, 400);
    assert.equal((await request('/api/quests', {method: 'POST', body: {offerId}, origin: 'https://wrong-origin.invalid'})).status, 403);
  });
  await t.test('simultaneous acceptance creates one contract and one unfinished goal without XP', async () => {
    const offer = board.daily[0];
    const results = await Promise.all([accept({offerId: offer.offerId}), accept({offerId: offer.offerId})]);
    assert.deepEqual(results.map(result => result.status).sort(), [200, 201], JSON.stringify(results));
    assert.equal(results[0].data.dream.id, results[1].data.dream.id);
    daily = results[0].data.dream;
    assert.deepEqual(daily.quest, {kind: 'daily', npcId: offer.npcId, templateId: offer.id, dayKey: board.dayKey});
    assert.ok(daily.tasks.every(task => !task.done && task.training === offer.skill));
    assert.equal((await goals()).length, before.goals.length + 1);
    assert.equal((await character()).totalXp, before.character.totalXp);
    assert.equal(await balance(), before.balance);
  });
  await t.test('accepted catalog content cannot be removed, extended, renamed, or retagged', async () => {
    for (const body of [
      {...daily, tasks: []},
      {...daily, title: 'different assignment'},
      {...daily, tasks: [...daily.tasks, {id: crypto.randomUUID(), title: 'bonus', training: 'fitness', done: true}]},
      {...daily, tasks: daily.tasks.map(task => ({...task, training: task.training === 'fitness' ? 'knowledge' : 'fitness'}))},
    ]) assert.equal((await request('/api/dreams/' + daily.id, {method: 'PUT', body})).status, 400);
    assert.equal((await character()).totalXp, before.character.totalXp);
  });
  await t.test('completion grants the advertised XP and wallet once; unchecking and retries retain it', async () => {
    const offer = board.daily[0], body = {...daily, tasks: daily.tasks.map(task => ({...task, done: true}))};
    const writes = await Promise.all([request('/api/dreams/' + daily.id, {method: 'PUT', body}), request('/api/dreams/' + daily.id, {method: 'PUT', body})]);
    assert.deepEqual(writes.map(result => result.status).sort(), [200, 409]);
    daily = writes.find(result => result.status === 200).data.dream;
    assert.equal((await character()).totalXp, before.character.totalXp + offer.xp);
    assert.equal(await balance(), before.balance + offer.coins);
    assert.equal((await character()).skillXp[offer.skill], before.character.skillXp[offer.skill] + 20);
    assert.equal((await request('/api/quests')).data.daily.find(item => item.offerId === offer.offerId).status, 'complete');
    for (const done of [false, true]) {
      const result = await request('/api/dreams/' + daily.id, {method: 'PUT', body: {...daily, tasks: daily.tasks.map(task => ({...task, done}))}});
      assert.equal(result.status, 200); daily = result.data.dream;
      assert.equal(result.data.character.totalXp, before.character.totalXp + offer.xp);
      assert.equal(result.data.island.balance, before.balance + offer.coins);
    }
    const retry = await accept({offerId: offer.offerId}); assert.equal(retry.status, 200); assert.equal(retry.data.dream.id, daily.id);
  });
  await t.test('the other daily offers retain their identities, and deletion cannot recreate a contract', async () => {
    const accepted = [];
    for (const offer of board.daily.slice(1)) {
      const result = await accept({offerId: offer.offerId}); assert.equal(result.status, 201); accepted.push(result.data.dream);
    }
    const after = (await request('/api/quests')).data;
    assert.deepEqual(after.daily.map(offer => offer.offerId), board.daily.map(offer => offer.offerId));
    assert.ok(after.daily.every(offer => offer.status !== 'available'));
    assert.equal((await goals()).length, before.goals.length + 3);
    assert.equal((await request('/api/dreams/' + accepted[0].id, {method: 'DELETE'})).status, 200);
    assert.equal((await accept({offerId: board.daily[1].offerId})).status, 409);
    assert.equal((await request('/api/quests')).data.daily[1].status, 'archived');
  });
  await t.test('NPC introductions give three gentle steps, keep their order, and preserve all prior progress', async () => {
    const offer = board.introductions.find(offer => offer.npcId === 'lorne');
    const result = await accept({offerId: offer.offerId}); assert.equal(result.status, 201); intro = result.data.dream;
    assert.equal(intro.tasks.length, 3); assert.ok(intro.tasks.every(task => task.training === 'fitness'));
    assert.equal((await request('/api/dreams/' + intro.id, {method: 'PUT', body: {...intro, tasks: [...intro.tasks].reverse()}})).status, 400);
    const xpBefore = (await character()).totalXp;
    const complete = await request('/api/dreams/' + intro.id, {method: 'PUT', body: {...intro, tasks: intro.tasks.map(task => ({...task, done: true}))}});
    assert.equal(complete.status, 200); intro = complete.data.dream;
    assert.equal(complete.data.character.totalXp, xpBefore + offer.xp);
    assert.ok(complete.data.character.skillXp.fitness >= 60);
    assert.deepEqual(complete.data.character.advancements, before.character.advancements);
    assert.deepEqual(complete.data.character.equipped, before.character.equipped);
    assert.equal((await request('/api/quests')).data.introductions.find(item => item.npcId === 'lorne').status, 'complete');
  });
  await t.test('a previously accepted daily can be resumed and rewarded after its offer day', {skip: !process.env.DREAMLIST_TEST_SQLITE_PATH}, async () => {
    // Only a disposable local fixture advances the calendar; no debug clock is
    // exposed in the application API. The game still performs acceptance/completion.
    const db = new DatabaseSync(process.env.DREAMLIST_TEST_SQLITE_PATH);
    const id = crypto.randomUUID(), oldDay = new Date(Date.parse(board.dayKey + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
    const offerId = `daily:${oldDay}:daily-short-walk-v1`;
    const task = {id: 'fixture-' + id, title: '慢慢走動 2 分鐘（或坐姿活動手臂或雙腳 1 分鐘）', training: 'fitness', done: false, completedAt: null};
    try {
      const owner = db.prepare('SELECT owner_id FROM dreams WHERE id=?').get(daily.id).owner_id;
      db.exec('BEGIN');
      db.prepare("INSERT INTO dreams(id,owner_id,title,description,category,target_date,tasks,revision,created_at,updated_at) VALUES(?,?,'兩分鐘的輕快出發','先前接下的每日委託','health','',?,1,?,?)").run(id, owner, JSON.stringify([task]), oldDay, oldDay);
      db.prepare("INSERT INTO quest_contracts(owner_id,offer_id,kind,template_id,npc_id,day_key,dream_id,accepted_at) VALUES(?,?,'daily','daily-short-walk-v1','lorne',?,?,?)").run(owner, offerId, oldDay, id, oldDay);
      db.exec('COMMIT');
    } finally {db.close();}
    const xpBefore = (await character()).totalXp;
    const resumed = await accept({offerId}); assert.equal(resumed.status, 200); assert.equal(resumed.data.dream.id, id);
    assert.equal(resumed.data.dream.quest.dayKey, oldDay);
    const finished = await request('/api/dreams/' + id, {method: 'PUT', body: {...resumed.data.dream, tasks: [{...task, done: true}]}});
    assert.equal(finished.status, 200); assert.equal(finished.data.character.totalXp, xpBefore + 140);
    assert.equal((await request('/api/quests')).data.daily.length, 3, 'the old assignment does not replace today’s choices');
  });
});
