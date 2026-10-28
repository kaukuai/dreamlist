import assert from "node:assert/strict";
import {test} from "node:test";
import {createBrowserPreviewStore, PREVIEW_STORAGE_KEY} from "../lib/browser-preview-store.ts";
import {ARENA, arenaHint, createArena, emptyArenaInput, stepArena} from "../lib/arena-engine.ts";
import {FIELD, bellSolution, distance, fieldPath, fieldPlaces, initialField, moveField, touchField, walkable} from "../lib/field-engine.ts";
import {mainEpisodes} from "../lib/adventure-catalog.ts";
import {defaultSound, readSoundSettings} from "../lib/game-audio.ts";

function fixture() {
  const values = new Map();let quota = false;
  const storage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => {if (quota) throw new Error("quota");values.set(key, value);}};
  const store = createBrowserPreviewStore(storage, () => new Date("2026-10-28T09:00:00Z"));
  const request = async (path, method = "GET", body) => {const response = await store.request(path, method, body);return {status: response.status, ...await response.json()};};
  const act = async action => {const result = await request("/api/adventure", "POST", action);assert.equal(result.status, 200, result.error);return result.adventure;};
  const prepare = async (episode = mainEpisodes[0]) => {
    const data = await act({action: "beginEpisode", episodeId: episode.id, choiceId: episode.choices[0].id});
    const id = data.episodes.find(item => item.id === episode.id).entry.dreamId;
    const dream = (await request("/api/dreams")).dreams.find(item => item.id === id);
    const result = await request("/api/dreams/" + id, "PUT", {...dream, tasks: dream.tasks.map(task => ({...task, done: true}))});assert.equal(result.status, 200);
    return act({action: "startBattle", episodeId: episode.id, mode: "action"});
  };
  return {values, request, act, prepare, setQuota: value => {quota = value;}};
}
function controls(state) {
  let dx = state.enemyX - state.x, dy = state.enemyY - state.y, magnitude = Math.hypot(dx, dy);
  if (magnitude < 70) {dx = 0;dy = 0;}
  for (const hazard of state.hazards) {
    const separation = Math.hypot(state.x - hazard.x, state.y - hazard.y);
    if (hazard.kind === "circle" && separation < hazard.radius + 22) {dx = state.x - hazard.x || 1;dy = state.y - hazard.y;break;}
  }
  magnitude = Math.max(1, Math.hypot(dx, dy));
  return {x: dx / magnitude, y: dy / magnitude, attack: true, skill: state.focus >= 2, dash: state.hazards.some(hazard => hazard.remaining < .25 && Math.hypot(state.x - hazard.x, state.y - hazard.y) < hazard.radius), mend: state.hp < state.maxHp * .4 && state.focus >= 2};
}
test("tap navigation reaches every town interaction around footprints, with bounded diagonal movement", () => {
  assert.equal(walkable({x: 600, y: 335}), false, "fountain is solid");
  assert.equal(walkable({x: 200, y: 200}), false, "library footprint is solid");
  for (const place of fieldPlaces) {
    let position = {...FIELD.start};const path = fieldPath(position, place);assert.ok(path.length, place.id);
    for (const point of path) {
      let frames = 0;
      while (distance(position, point) > 5 && frames++ < 150) {
        const dx = point.x - position.x, dy = point.y - position.y, length = Math.hypot(dx, dy);
        position = moveField(position, {x: dx / length, y: dy / length}, 1 / 60);assert.ok(walkable(position), place.id);
      }
      assert.ok(frames < 150, "path must not get stuck: " + place.id);
    }
    assert.ok(distance(position, place) < 10, place.id);
  }
  const straight = moveField(FIELD.start, {x: 1, y: 0}, .03), diagonal = moveField(FIELD.start, {x: 1, y: 1}, .03);
  assert.ok(Math.abs(distance(FIELD.start, straight) - distance(FIELD.start, diagonal)) < .001);
});
test("physical proximity and a visible melody puzzle change the world without granting life XP", async () => {
  const f = fixture();await f.request("/api/adventure");
  assert.equal((await f.request("/api/adventure", "POST", {action: "fieldInteract", placeId: "echo", ...FIELD.start})).status, 400);
  const echo = fieldPlaces.find(place => place.id === "echo");await f.act({action: "fieldInteract", placeId: "echo", x: echo.x, y: echo.y});
  await f.act({action: "fieldInteract", placeId: "echo", x: echo.x, y: echo.y});
  for (const id of bellSolution) {const place = fieldPlaces.find(place => place.id === id);await f.act({action: "fieldInteract", placeId: id, x: place.x, y: place.y});}
  const data = (await f.request("/api/adventure")).adventure;assert.equal(data.field.bellSolved, true);assert.equal(data.field.discovered.filter(id => id === "echo").length, 1);
  assert.equal((await f.request("/api/character")).character.totalXp, 0);assert.equal((await f.request("/api/island")).island.balance, 100);
  const state = initialField();assert.throws(() => touchField(state, "lorne", {x: 0, y: 0}));
  assert.equal((await f.request("/api/adventure", "POST", {action: "saveField", x: 600, y: 335})).status, 400);
});
test("sound requires opt-in and clamps independent persisted controls without changing game storage", () => {
  const storage = value => ({getItem: () => value});
  assert.deepEqual(readSoundSettings(storage(null)), defaultSound);assert.equal(readSoundSettings(storage("invalid")).enabled, false);
  assert.deepEqual(readSoundSettings(storage('{"enabled":true,"music":2,"effects":-8,"ambience":0.4}')), {enabled: true, music: 1, effects: 0, ambience: .4});
});
test("movement and dodge avoid a telegraphed strike, while cooldowns and rings retain meaningful rules", () => {
  const profile = {hp: 100, maxHp: 100, foeHp: 400, foeMaxHp: 400, attack: 20, armor: 0, healing: 0, profession: "warrior", focus: 3};
  const base = createArena(profile, 20);base.hazards = [{id: 1, kind: "circle", x: base.x, y: base.y, radius: 82, remaining: .02}];
  const still = structuredClone(base), dodge = structuredClone(base);stepArena(still, emptyArenaInput());stepArena(dodge, {...emptyArenaInput(), dash: true});
  assert.ok(still.hp < base.hp);assert.equal(dodge.hp, base.hp);assert.ok(dodge.dashCd > 1);
  const cooldown = dodge.dashCd;stepArena(dodge, {...emptyArenaInput(), dash: true});assert.ok(dodge.dashCd < cooldown, "holding dodge cannot reset cooldown");
  const inside = createArena(profile, 20);inside.hazards = [{id: 1, kind: "ring", x: inside.x, y: inside.y, radius: 185, remaining: .02}];
  const outside = structuredClone(inside);outside.x += 110;stepArena(inside, emptyArenaInput());stepArena(outside, emptyArenaInput());assert.equal(inside.hp, 100);assert.ok(outside.hp < 100);
  assert.match(arenaHint(base), /落雷/);assert.equal(ARENA.step, 1 / 30);
});
test("persisted combat replays bounded controls and rejects stale turns or fabricated wins", async () => {
  const f = fixture();const data = await f.prepare(), battle = data.battle;
  const frames = Array.from({length: 20}, () => ({...emptyArenaInput(), x: 1}));
  const next = await f.act({action: "arenaAdvance", battleId: battle.id, fromTick: 0, frames});
  assert.equal(next.battle.arena.tick, 20);assert.ok(next.battle.arena.x > battle.arena.x);
  const before = f.values.get(PREVIEW_STORAGE_KEY);
  assert.equal((await f.request("/api/adventure", "POST", {action: "arenaAdvance", battleId: battle.id, fromTick: 0, frames})).status, 409);
  assert.equal((await f.request("/api/adventure", "POST", {action: "arenaAdvance", battleId: battle.id, fromTick: 20, frames, won: true})).status, 400);
  assert.equal((await f.request("/api/adventure", "POST", {action: "arenaAdvance", battleId: battle.id, fromTick: 20, frames: Array(46).fill(emptyArenaInput())})).status, 400);
  assert.equal(f.values.get(PREVIEW_STORAGE_KEY), before);
  assert.equal((await f.request("/api/adventure", "POST", {action: "claimEpisode", episodeId: "bell-01"})).status, 400);
});
test("a new unarmed wanderer can complete all nine action trials; combat never farms life XP or repeated story loot", async () => {
  const f = fixture();let totalTicks = 0;
  for (const episode of mainEpisodes) {
    let data = await f.prepare(episode), batches = 0;
    const xp = (await f.request("/api/character")).character.totalXp;
    while (data.battle.phase === "active" && batches++ < 150) {
      const prediction = structuredClone(data.battle.arena), frames = [];
      for (let index = 0; index < 30 && prediction.phase === "active"; index++) {const input = controls(prediction);frames.push(input);stepArena(prediction, input);}
      data = await f.act({action: "arenaAdvance", battleId: data.battle.id, fromTick: data.battle.arena.tick, frames});
    }
    assert.equal(data.battle.phase, "won", episode.id + JSON.stringify(data.battle.arena));totalTicks += data.battle.arena.tick;
    assert.equal((await f.request("/api/character")).character.totalXp, xp);
    await f.act({action: "claimEpisode", episodeId: episode.id});const once = f.values.get(PREVIEW_STORAGE_KEY);await f.act({action: "claimEpisode", episodeId: episode.id});assert.equal(f.values.get(PREVIEW_STORAGE_KEY), once);
  }
  assert.equal((await f.request("/api/adventure")).adventure.mainCleared, 9);
  console.log("Nine action trials completed with movement and telegraph avoidance in", Math.round(totalTicks / 30), "simulation seconds");
});
test("failed combat checkpoint is atomic, then the same controls can be saved once storage recovers", async () => {
  const f = fixture(), data = await f.prepare(), before = f.values.get(PREVIEW_STORAGE_KEY);
  const action = {action: "arenaAdvance", battleId: data.battle.id, fromTick: 0, frames: [emptyArenaInput()]};
  f.setQuota(true);assert.equal((await f.request("/api/adventure", "POST", action)).status, 503);assert.equal(f.values.get(PREVIEW_STORAGE_KEY), before);
  f.setQuota(false);assert.equal((await f.act(action)).battle.arena.tick, 1);
});
test("old campaign saves upgrade additively and active tactical battles keep their earned HP when converted", async () => {
  const f = fixture();await f.prepare();const raw = JSON.parse(f.values.get(PREVIEW_STORAGE_KEY));delete raw.adventure.field;delete raw.adventure.battle.arena;raw.adventure.battle.hp = 73;raw.extraField = {keep: true};f.values.set(PREVIEW_STORAGE_KEY, JSON.stringify(raw));
  const data = await f.act({action: "startBattle", episodeId: "bell-01", mode: "action"});assert.equal(data.battle.arena.hp, 73);assert.deepEqual(data.field, initialField());
  assert.deepEqual(JSON.parse(f.values.get(PREVIEW_STORAGE_KEY)).extraField, {keep: true});
  await f.act({action: "arenaAssist", battleId: data.battle.id, fromTick: 0, enabled: true});assert.equal((await f.request("/api/adventure")).adventure.battle.arena.assist, true);
});
