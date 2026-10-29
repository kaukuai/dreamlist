import assert from "node:assert/strict";
import {test} from "node:test";
import {createBrowserPreviewStore, PREVIEW_STORAGE_KEY} from "../lib/browser-preview-store.ts";
import {battleIntent, startBattle, takeBattleTurn} from "../lib/adventure-model.ts";
import {mainEpisodes, storyEpisodes} from "../lib/adventure-catalog.ts";

function fixture() {
  const values = new Map();
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)};
  let now = new Date("2026-10-28T08:00:00Z");
  const store = createBrowserPreviewStore(storage, () => now);
  const request = async (path, method = "GET", body) => {const response = await store.request(path, method, body);return {status: response.status, ...await response.json()};};
  const act = async action => {const response = await request("/api/adventure", "POST", action);assert.equal(response.status, 200, response.error);return response;};
  return {values, storage, store, request, act, clock: () => now, setNow: value => {now = new Date(value);}};
}
async function view(f) {return (await f.request("/api/adventure")).adventure;}
async function beginAndComplete(f, episode, choiceId = episode.choices[0].id) {
  await f.act({action: "beginEpisode", episodeId: episode.id, choiceId});
  const entry = (await view(f)).episodes.find(item => item.id === episode.id).entry;
  const dream = (await f.request("/api/dreams")).dreams.find(dream => dream.id === entry.dreamId);
  const done = await f.request("/api/dreams/" + dream.id, "PUT", {...dream, tasks: dream.tasks.map(task => ({...task, done: true}))});
  assert.equal(done.status, 200, done.error);return done.dream;
}
async function win(f, episode) {
  let data = (await f.act({action: "startBattle", episodeId: episode.id})).adventure;
  let actions = 0;
  while (data.battle.phase === "active" && actions++ < 40) {
    const battle = data.battle;
    const intent = battle.intent.kind;
    const move = intent === "charge" ? "guard" : intent === "guard" && battle.hp < battle.maxHp * .65 && battle.focus >= 2 ? "mend" : intent !== "guard" && battle.focus >= 2 ? "skill" : "strike";
    data = (await f.act({action: "battleAction", battleId: battle.id, turn: battle.turn, move})).adventure;
  }
  assert.equal(data.battle.phase, "won", `${episode.id}: ${JSON.stringify(data.battle)}`);return data;
}

test("existing browser save upgrades additively, preserving gear, talents, receipts and wallet", async () => {
  const f = fixture();
  await f.request("/api/character", "POST", {action: "profile", name: "舊存檔旅人", avatarColor: "sunset"});
  await f.request("/api/character", "POST", {action: "purchase", itemId: "training-sword"});
  await f.request("/api/character", "POST", {action: "equip", slot: "weapon", itemId: "training-sword"});
  const previous = JSON.parse(f.values.get(PREVIEW_STORAGE_KEY));delete previous.adventure;
  previous.unrecognizedFutureField = {keep: true};
  f.values.set(PREVIEW_STORAGE_KEY, JSON.stringify(previous));
  const data = await view(f);assert.equal(data.mainCleared, 0);assert.equal(data.regions.length, 4);
  const upgraded = JSON.parse(f.values.get(PREVIEW_STORAGE_KEY));delete upgraded.adventure;
  assert.deepEqual(upgraded, previous);
  assert.equal((await f.request("/api/island")).island.balance, 55);
  assert.equal((await f.request("/api/character")).character.equipped.weapon, "training-sword");
});

test("story gates, fixed routes and idempotent acceptance prevent duplicate goals or immediate rewards", async () => {
  const f = fixture();
  assert.equal((await f.request("/api/adventure", "POST", {action: "beginEpisode", episodeId: "bell-02", choiceId: "notice"})).status, 400);
  assert.equal((await f.request("/api/adventure", "POST", {action: "beginEpisode", episodeId: "bond-lorne-01", choiceId: "ease"})).status, 400);
  await f.act({action: "beginEpisode", episodeId: "bell-01", choiceId: "stand"});
  await f.act({action: "beginEpisode", episodeId: "bell-01", choiceId: "stand"});
  const dreams = (await f.request("/api/dreams")).dreams;assert.equal(dreams.length, 1);
  assert.equal((await f.request("/api/character")).character.totalXp, 0);
  assert.equal((await f.request("/api/adventure", "POST", {action: "beginEpisode", episodeId: "bell-01", choiceId: "read"})).status, 409);
  assert.equal((await f.request("/api/dreams/" + dreams[0].id, "PUT", {...dreams[0], title: "改寫故事"})).status, 400);
  assert.equal((await f.request("/api/dreams/" + dreams[0].id, "DELETE")).status, 400);
  assert.equal((await f.request("/api/adventure", "POST", {action: "startBattle", episodeId: "bell-01"})).status, 400);
  assert.equal((await f.request("/api/adventure", "POST", {action: "claimEpisode", episodeId: "bell-01"})).status, 400);
});

test("guard counters a telegraphed heavy attack, mage pierces guard, and turns cannot be replayed", async () => {
  const f = fixture();await beginAndComplete(f, mainEpisodes[0]);
  const player = (await f.request("/api/character")).character;
  const state = JSON.parse(f.values.get(PREVIEW_STORAGE_KEY));
  const base = startBattle(mainEpisodes[8], state.adventure, {player});base.turn = 2;base.foeHp = 999;
  assert.equal(battleIntent(base).kind, "charge");
  const strike = structuredClone(base), guard = structuredClone(base);
  takeBattleTurn(strike, "strike", 2);takeBattleTurn(guard, "guard", 2);
  assert.ok(base.hp - guard.hp < (base.hp - strike.hp) * .4);
  const mage = {...structuredClone(base), turn: 3, profession: "mage"}, warrior = {...structuredClone(base), turn: 3, profession: "warrior"};
  takeBattleTurn(mage, "skill", 3);takeBattleTurn(warrior, "skill", 3);
  assert.ok(mage.foeHp < warrior.foeHp);
  const started = (await f.act({action: "startBattle", episodeId: "bell-01"})).adventure.battle;
  await f.act({action: "battleAction", battleId: started.id, turn: started.turn, move: "strike"});
  const before = f.values.get(PREVIEW_STORAGE_KEY);
  assert.equal((await f.request("/api/adventure", "POST", {action: "battleAction", battleId: started.id, turn: started.turn, move: "strike"})).status, 409);
  assert.equal(f.values.get(PREVIEW_STORAGE_KEY), before);
});

test("new player can finish all twelve main chapters including the three after-stories with real life quests, tactical combat and an ending", async () => {
  const f = fixture();let longest = 0;
  for (const [index, episode] of mainEpisodes.entries()) {
    await beginAndComplete(f, episode, episode.choices[index % 2].id);
    const xpBefore = (await f.request("/api/character")).character.totalXp;
    const battle = await win(f, episode);longest = Math.max(longest, battle.battle.turn);
    assert.equal((await f.request("/api/character")).character.totalXp, xpBefore, "battle does not farm life XP");
    const claimed = await f.act({action: "claimEpisode", episodeId: episode.id});
    const raw = f.values.get(PREVIEW_STORAGE_KEY);
    await f.act({action: "claimEpisode", episodeId: episode.id});
    assert.equal(f.values.get(PREVIEW_STORAGE_KEY), raw, "first story loot is idempotent");
    assert.equal(claimed.character.totalXp, xpBefore);
    if(episode.id === "bell-09"){assert.ok(claimed.adventure.ending);assert.equal(claimed.adventure.episodes.find(e=>e.id==="echo-01").status,"available");}
    if(index<8)assert.equal(claimed.adventure.ending,null);
  }
  const data = await view(f);
  assert.equal(data.mainCleared, 12);assert.equal(data.memories.length, 12);assert.equal(data.titles.length, 4);
  assert.ok(data.regions.every(region => region.unlocked));assert.ok(data.ending.text.length > 20);
  assert.equal(Object.values(data.ending.values).reduce((sum, value) => sum + value, 0), 9);
  assert.equal((await f.request("/api/character")).character.totalXp, 12 * 220);
  await f.act({action: "equipTitle", title: "喚鐘者"});assert.equal((await f.request("/api/character")).character.title, "喚鐘者");
  for (const episode of storyEpisodes.filter(episode => episode.kind === "bond")) {
    if ((await view(f)).episodes.find(item => item.id === episode.id).status === "locked") {
      const intro = (await f.request("/api/quests")).introductions.find(item => item.npcId === episode.bondNpc);
      const accepted = await f.request("/api/quests", "POST", {offerId: intro.offerId});
      const done = await f.request("/api/dreams/" + accepted.dream.id, "PUT", {...accepted.dream, tasks: accepted.dream.tasks.map(task => ({...task, done: true}))});
      assert.equal(done.status, 200);
    }
    await beginAndComplete(f, episode);await f.act({action: "claimEpisode", episodeId: episode.id});
  }
  assert.equal((await view(f)).memories.length, 18, "all six companion stories can be completed after the main story");
  console.log("Full campaign completed without equipment or class shortcuts; longest encounter:", longest, "turns");
});

test("first loot funds crafting, equipment and camp through the same wallet; repeat crafting is free of duplicate charges", async () => {
  const f = fixture();await beginAndComplete(f, mainEpisodes[0]);await win(f, mainEpisodes[0]);await f.act({action: "claimEpisode", episodeId: "bell-01"});
  assert.equal((await f.request("/api/island")).island.balance, 315);
  const beforeRune = (await f.act({action: "startBattle", episodeId: "bell-01"})).adventure.battle;
  await f.act({action: "retreatBattle", battleId: beforeRune.id});
  await f.act({action: "craftRune", runeId: "bell-ward"});
  const once = f.values.get(PREVIEW_STORAGE_KEY);await f.act({action: "craftRune", runeId: "bell-ward"});assert.equal(f.values.get(PREVIEW_STORAGE_KEY), once);
  assert.equal((await f.request("/api/adventure", "POST", {action: "craftRune", runeId: "star-flare"})).status, 400);
  assert.equal((await f.request("/api/adventure", "POST", {action: "equipRune", runeId: "not-owned"})).status, 400);
  await f.act({action: "equipRune", runeId: "bell-ward"});
  const afterRune = (await f.act({action: "startBattle", episodeId: "bell-01"})).adventure.battle;
  assert.equal(afterRune.maxHp, beforeRune.maxHp + 12);assert.equal(afterRune.armor, beforeRune.armor + 3);
  assert.equal((await f.request("/api/character", "POST", {action: "purchase", itemId: "training-sword"})).island.balance, 235);
  assert.equal((await f.request("/api/island", "POST", {action: "purchase", kind: "blossom", slot: 0, requestId: crypto.randomUUID()})).island.balance, 185);
});

test("companion episodes react to story choices, grant fixed memories, and never gate other classes", async () => {
  const f = fixture();await beginAndComplete(f, mainEpisodes[0]);await win(f, mainEpisodes[0]);await f.act({action: "claimEpisode", episodeId: "bell-01"});
  let data = await view(f);assert.equal(data.companions.find(npc => npc.id === "lorne").points, 2);
  const episode = storyEpisodes.find(episode => episode.id === "bond-lorne-01");
  assert.equal(data.episodes.find(item => item.id === episode.id).status, "available");
  await beginAndComplete(f, episode);data = (await f.act({action: "claimEpisode", episodeId: episode.id})).adventure;
  assert.equal(data.memories.length, 2);assert.equal(data.companions.find(npc => npc.id === "lorne").points, 4);
  assert.equal((await f.request("/api/character")).character.totalXp, 400);
});

test("battle resumes after restart; retreat or losing never deducts XP, coins or materials", async () => {
  const f = fixture();await beginAndComplete(f, mainEpisodes[0]);
  const battle = (await f.act({action: "startBattle", episodeId: "bell-01"})).adventure.battle;
  const saved = await createBrowserPreviewStore(f.storage).request("/api/adventure");
  assert.deepEqual((await saved.json()).adventure.battle, (await view(f)).battle);
  const xp = (await f.request("/api/character")).character.totalXp, gold = (await f.request("/api/island")).island.balance;
  const after = await f.act({action: "retreatBattle", battleId: battle.id});assert.equal(after.adventure.battle.phase, "lost");
  assert.equal(after.character.totalXp, xp);assert.equal(after.island.balance, gold);
  const restarted = (await f.act({action: "startBattle", episodeId: "bell-01"})).adventure.battle;
  assert.notEqual(restarted.id, battle.id);assert.equal(restarted.hp, restarted.maxHp);
  const fixtureState = JSON.parse(f.values.get(PREVIEW_STORAGE_KEY));fixtureState.adventure.battle.hp = 1;
  f.values.set(PREVIEW_STORAGE_KEY, JSON.stringify(fixtureState));
  const lost = await f.act({action: "battleAction", battleId: restarted.id, turn: 1, move: "strike"});
  assert.equal(lost.adventure.battle.phase, "lost");assert.equal(lost.character.totalXp, xp);assert.equal(lost.island.balance, gold);
});

test("weekly direction is self-chosen and resets only the current count, never earned progress", async () => {
  const f = fixture();await beginAndComplete(f, mainEpisodes[0]);
  let data = (await f.act({action: "setRhythm", target: 4})).adventure;
  assert.equal(data.rhythm.count, 3);assert.equal(data.rhythm.target, 4);
  const xp = (await f.request("/api/character")).character.totalXp;
  f.setNow("2026-11-02T00:00:00Z");data = await view(f);assert.equal(data.rhythm.count, 0);assert.equal(data.rhythm.target, 4);
  assert.equal((await f.request("/api/character")).character.totalXp, xp);
  assert.equal((await f.request("/api/adventure", "POST", {action: "setRhythm", target: 999})).status, 400);
});

test("a failed save cannot half-claim loot or erase a winning battle", async () => {
  const f = fixture();await beginAndComplete(f, mainEpisodes[0]);await win(f, mainEpisodes[0]);
  const before = f.values.get(PREVIEW_STORAGE_KEY);
  const store = createBrowserPreviewStore({getItem: key => f.storage.getItem(key), setItem: () => {throw new Error("quota");}}, f.clock);
  assert.equal((await store.request("/api/adventure", "POST", {action: "claimEpisode", episodeId: "bell-01"})).status, 503);
  assert.equal(f.values.get(PREVIEW_STORAGE_KEY), before);
  await f.act({action: "claimEpisode", episodeId: "bell-01"});assert.equal((await view(f)).mainCleared, 1);
});
