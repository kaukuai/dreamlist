import assert from "node:assert/strict";
import {test} from "node:test";
import {createBrowserPreviewStore, PREVIEW_STORAGE_KEY} from "../lib/browser-preview-store.ts";

function fixture() {
  const values = new Map();
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)};
  let now = new Date("2026-10-19T19:59:00Z");
  const store = createBrowserPreviewStore(storage, () => now);
  const request = async (path, method = "GET", body) => {
    const response = await store.request(path, method, body);
    return {status: response.status, ...await response.json()};
  };
  return {values, storage, store, request, setNow: value => {now = new Date(value);}};
}

const complete = async (f, dream, tasks = dream.tasks.map(task => ({...task, done: true}))) => {
  const result = await f.request("/api/dreams/" + dream.id, "PUT", {...dream, tasks});
  assert.equal(result.status, 200, result.error);
  return result;
};

test("preview starts without credentials, persists on reopening and isolates separate browsers", async () => {
  const f = fixture();
  const initial = await f.request("/api/character");
  assert.equal(initial.character.totalXp, 0); assert.equal(initial.character.level, 1);
  assert.equal(Object.keys(initial.character.equipped).length, 6);
  assert.equal((await f.request("/api/island")).island.balance, 100);
  assert.equal((await f.request("/api/character", "POST", {action: "profile", name: "瀏覽器旅人", avatarColor: "lilac", leaderboardOptIn: true})).character.leaderboardOptIn, false);
  const reopened = createBrowserPreviewStore(f.storage);
  assert.equal((await (await reopened.request("/api/character")).json()).character.name, "瀏覽器旅人");
  assert.equal((await fixture().request("/api/character")).character.name, "初行旅人");
  const board = await f.request("/api/leaderboard");
  assert.equal(board.entries.length, 1); assert.equal(board.entries[0].name, "瀏覽器旅人");
});

test("daily selection survives reload, changes after Taipei reset, and accepted old offers continue", async () => {
  const f = fixture();
  const first = await f.request("/api/quests");
  assert.equal(first.daily.length, 3); assert.equal(first.introductions.length, 6);
  const reopened = createBrowserPreviewStore(f.storage, () => new Date("2026-10-19T19:59:00Z"));
  assert.deepEqual((await (await reopened.request("/api/quests")).json()).daily, first.daily);
  const accepted = await f.request("/api/quests", "POST", {offerId: first.daily[0].offerId});
  assert.equal((await f.request("/api/character")).character.totalXp, 0);
  f.setNow("2026-10-19T20:00:01Z");
  const next = await f.request("/api/quests");
  assert.notEqual(next.dayKey, first.dayKey);
  assert.ok(next.daily.every(offer => offer.status === "available"));
  const retry = await f.request("/api/quests", "POST", {offerId: first.daily[0].offerId});
  assert.equal(retry.created, false); assert.equal(retry.dream.id, accepted.dream.id);
  assert.equal((await complete(f, retry.dream)).character.totalXp, 140);
});

test("NPC acceptance is idempotent, rewards cannot be repeated, and quest content is fixed", async () => {
  const f = fixture();
  const offers = await f.request("/api/quests");
  const offer = offers.introductions.find(offer => offer.npcId === "lorne");
  const results = await Promise.all([f.request("/api/quests", "POST", {offerId: offer.offerId}), f.request("/api/quests", "POST", {offerId: offer.offerId})]);
  assert.equal(results.filter(result => result.created).length, 1);
  assert.equal((await f.request("/api/dreams")).dreams.length, 1);
  assert.equal((await f.request("/api/dreams/" + results[0].dream.id, "PUT", {...results[0].dream, title: "竄改委託"})).status, 400);
  const done = await complete(f, results[0].dream);
  assert.equal(done.character.totalXp, 220); assert.equal(done.island.balance, 275);
  const unchecked = await complete(f, done.dream, done.dream.tasks.map(task => ({...task, done: false})));
  const repeated = await complete(f, unchecked.dream);
  assert.equal(repeated.character.totalXp, 220); assert.equal(repeated.island.balance, 275);
  assert.equal((await f.request("/api/quests")).introductions.find(item => item.offerId === offer.offerId).status, "complete");
});

test("real preview progress unlocks classes, talents and equipment with one wallet", async () => {
  const f = fixture();
  const board = await f.request("/api/quests");
  const accepted = await f.request("/api/quests", "POST", {offerId: board.introductions.find(offer => offer.npcId === "lorne").offerId});
  await complete(f, accepted.dream);
  assert.equal((await f.request("/api/character", "POST", {action: "profession", profession: "warrior"})).character.profession, "warrior");
  const talent = await f.request("/api/character", "POST", {action: "talent", talentId: "vitality"});
  assert.equal(talent.character.availableTalentPoints, 0);
  assert.equal((await f.request("/api/character", "POST", {action: "talent", talentId: "vitality"})).status, 400);
  assert.equal((await f.request("/api/character", "POST", {action: "advance"})).status, 400);
  const bought = await f.request("/api/character", "POST", {action: "purchase", itemId: "training-sword"});
  assert.equal(bought.island.balance, 230);
  const equipped = await f.request("/api/character", "POST", {action: "equip", slot: "weapon", itemId: "training-sword"});
  assert.equal(equipped.character.equipmentBonuses.vitality, 2);
  assert.equal((await f.request("/api/character", "POST", {action: "equip", slot: "head", itemId: "training-sword"})).status, 400);
  assert.equal((await f.request("/api/character", "POST", {action: "purchase", itemId: "training-sword"})).island.balance, 230);
});

test("conflicting writes and competing purchases preserve the latest snapshot", async () => {
  const f = fixture();
  const purchase = itemId => f.request("/api/character", "POST", {action: "purchase", itemId});
  const results = await Promise.all([purchase("oak-staff"), purchase("training-sword")]);
  assert.deepEqual(results.map(result => result.status), [200, 400]);
  assert.equal((await f.request("/api/island")).island.balance, 40);
  const created = await f.request("/api/dreams", "POST", {title: "自己的目標", category: "growth", tasks: [{id: "step", title: "閱讀", done: true}]});
  assert.equal(created.dream.tasks[0].done, false);
  const updated = await complete(f, created.dream);
  assert.equal((await f.request("/api/dreams/" + created.dream.id, "PUT", created.dream)).status, 409);
  await f.request("/api/dreams/" + created.dream.id, "DELETE");
  assert.equal((await f.request("/api/character")).character.totalXp, updated.character.totalXp);
  assert.equal((await f.request("/api/island")).island.balance, updated.island.balance);
});

test("evolution uses real level and skill requirements and survives switching classes", async () => {
  const f = fixture();
  const created = await f.request("/api/dreams", "POST", {title: "持續體能練習", category: "health", tasks: Array.from({length: 120}, (_, index) => ({id: "step-" + index, title: "練習 " + index, done: false, training: "fitness"}))});
  const done = await complete(f, created.dream);
  assert.ok(done.character.level >= 10);
  await f.request("/api/character", "POST", {action: "profession", profession: "warrior"});
  const evolved = await f.request("/api/character", "POST", {action: "advance"});
  assert.equal(evolved.character.advancements.warrior, 1);
  await f.request("/api/character", "POST", {action: "profession", profession: "wanderer"});
  const switched = await f.request("/api/character", "POST", {action: "profession", profession: "warrior"});
  assert.equal(switched.character.advancements.warrior, 1); assert.equal(switched.character.totalXp, done.character.totalXp);
});

test("corrupt storage and quota failures are reported without overwriting prior progress", async () => {
  const f = fixture();
  f.values.set(PREVIEW_STORAGE_KEY, "original-invalid-record");
  assert.equal((await f.request("/api/character")).status, 503);
  assert.equal(f.values.get(PREVIEW_STORAGE_KEY), "original-invalid-record");
  const healthy = fixture(); await healthy.request("/api/character");
  const before = healthy.values.get(PREVIEW_STORAGE_KEY);
  const blocked = createBrowserPreviewStore({getItem: key => healthy.storage.getItem(key), setItem: () => {throw new Error("quota");}});
  assert.equal((await blocked.request("/api/character", "POST", {action: "profile", name: "不能保存", avatarColor: "mint"})).status, 503);
  assert.equal(healthy.values.get(PREVIEW_STORAGE_KEY), before);
});
