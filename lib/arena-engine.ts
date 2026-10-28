import type {ProfessionId} from "./character-model.ts";

// Fixed-step simulation is shared by the responsive renderer and persisted replay.
// The client submits controls, never a claimed win or arbitrary HP checkpoint.
export const ARENA = {width: 600, height: 650, step: 1 / 30};
export type ArenaInput = {x: number; y: number; attack: boolean; dash: boolean; skill: boolean; mend: boolean};
export type ArenaEvent = {id: number; tick: number; kind: "swing" | "hit" | "hurt" | "dash" | "heal" | "warning" | "win"; x: number; y: number; value: number};
export type Hazard = {id: number; x: number; y: number; radius: number; kind: "circle" | "ring"; remaining: number};
export type ArenaState = {
  travelled?: number; lastMoveTick?: number;
  version: 1; tick: number; x: number; y: number; facing: number; enemyX: number; enemyY: number;
  hp: number; maxHp: number; enemyHp: number; enemyMaxHp: number; attack: number; armor: number; healing: number;
  enemyAttack: number; profession: ProfessionId; focus: number; phase: "active" | "won" | "lost";
  attackCd: number; skillCd: number; dashCd: number; invulnerable: number; dashTime: number; dashX: number; dashY: number;
  nextHazard: number; hazardCount: number; hazards: Hazard[]; events: ArenaEvent[]; eventId: number; assist: boolean;
};
export const emptyArenaInput = (): ArenaInput => ({x: 0, y: 0, attack: false, dash: false, skill: false, mend: false});
export function createArena(profile: {hp: number; maxHp: number; foeHp: number; foeMaxHp: number; attack: number; armor: number; healing: number; profession: ProfessionId; focus: number}, enemyAttack: number): ArenaState {
  return {version: 1, tick: 0, x: 250, y: 450, facing: -Math.PI / 2, enemyX: 355, enemyY: 210,
    hp: profile.hp, maxHp: profile.maxHp, enemyHp: Math.round(profile.foeHp * 4), enemyMaxHp: Math.round(profile.foeMaxHp * 4),
    attack: profile.attack, armor: profile.armor, healing: profile.healing, enemyAttack, profession: profile.profession, focus: profile.focus,
    phase: "active", attackCd: 0, skillCd: 0, dashCd: 0, invulnerable: 0, dashTime: 0, dashX: 0, dashY: -1,
    nextHazard: 2.5, hazardCount: 0, hazards: [], events: [], eventId: 0, assist: false};
}
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
function event(state: ArenaState, kind: ArenaEvent["kind"], x: number, y: number, value = 0) {
  state.events.push({id: ++state.eventId, tick: state.tick, kind, x, y, value});state.events = state.events.slice(-10);
}
export function arenaHint(state: ArenaState) {
  if (state.phase === "won") return "試煉通過・帶回你的回聲";
  if (state.phase === "lost") return "先休息一下・所有成長都保留";
  const hazard = state.hazards[0];
  if (hazard?.kind === "ring") return "環形衝擊・靠近中心，或離開外圈";
  if (hazard) return "落雷預警・走出標記，或閃避穿過";
  return "靠近對手攻擊・看見預警時走位";
}
/** Mutates a private prediction or freshly loaded snapshot, exactly one 1/30 s tick. */
export function stepArena(state: ArenaState, input: ArenaInput) {
  if (state.phase !== "active") return;
  const dt = ARENA.step;state.tick += 1;
  for (const key of ["attackCd", "skillCd", "dashCd", "invulnerable", "dashTime"] as const) state[key] = Math.max(0, state[key] - dt);
  let dx = input.x, dy = input.y;const magnitude = Math.hypot(dx, dy);
  if (magnitude > 1) {dx /= magnitude;dy /= magnitude;}
  if (magnitude > .05) state.facing = Math.atan2(dy, dx);
  if (input.dash && state.dashCd <= 0) {
    state.dashX = magnitude > .05 ? dx / Math.max(Math.hypot(dx, dy), .001) : Math.cos(state.facing);
    state.dashY = magnitude > .05 ? dy / Math.max(Math.hypot(dx, dy), .001) : Math.sin(state.facing);
    state.dashTime = .2;state.invulnerable = .38;state.dashCd = 1.8;event(state, "dash", state.x, state.y);
  }
  const oldX = state.x, oldY = state.y;
  const speed = state.dashTime > 0 ? 530 : 145;
  state.x = clamp(state.x + (state.dashTime > 0 ? state.dashX : dx) * speed * dt, 34, ARENA.width - 34);
  state.y = clamp(state.y + (state.dashTime > 0 ? state.dashY : dy) * speed * dt, 110, ARENA.height - 40);
  const moved = Math.hypot(state.x - oldX, state.y - oldY);state.travelled = (state.travelled ?? 0) + moved;if (moved > .01) state.lastMoveTick = state.tick;
  const distance = Math.hypot(state.enemyX - state.x, state.enemyY - state.y);
  if (distance > 135 && state.hazards.length === 0) {
    state.enemyX += (state.x - state.enemyX) / distance * 27 * dt;
    state.enemyY += (state.y - state.enemyY) / distance * 27 * dt;
  }
  const ranged = ["mage", "ranger", "healer", "bard"].includes(state.profession);
  const range = ranged ? 260 : 145;
  const canSkill = input.skill && state.focus >= 2 && state.skillCd <= 0;
  if (canSkill || input.attack && state.attackCd <= 0) {
    const reach = canSkill ? range + 85 : range;
    state.attackCd = .58;
    if (canSkill) {state.focus -= 2;state.skillCd = 2.8;}
    event(state, "swing", state.x, state.y, canSkill ? 2 : ranged ? 1 : 0);
    if (distance <= reach) {
      const strength = canSkill ? ({warrior: 2.1, mage: 1.95, ranger: 1.8, bard: 1.55, artisan: 1.85, healer: 1.4, wanderer: 1.8})[state.profession] : .72;
      const damage = Math.max(1, Math.round(state.attack * strength));state.enemyHp = Math.max(0, state.enemyHp - damage);
      event(state, "hit", state.enemyX, state.enemyY, damage);
      if (!canSkill || state.profession === "ranger") state.focus = Math.min(3, state.focus + 1);
      if (canSkill && ["healer", "bard"].includes(state.profession)) {
        const amount = Math.min(state.maxHp - state.hp, state.profession === "healer" ? 24 : 12);state.hp += amount;event(state, "heal", state.x, state.y, amount);
      }
      if (canSkill && state.profession === "artisan") state.invulnerable = .8;
    }
  } else if (input.mend && state.focus >= 2 && state.hp < state.maxHp && state.skillCd <= 0) {
    state.focus -= 2;state.skillCd = 2.8;const amount = Math.min(state.maxHp - state.hp, Math.round(state.maxHp * .28) + state.healing);
    state.hp += amount;event(state, "heal", state.x, state.y, amount);
  }
  if (state.enemyHp <= 0) {state.phase = "won";state.hazards = [];event(state, "win", state.enemyX, state.enemyY);return;}
  state.nextHazard -= dt;
  if (state.nextHazard <= 0) {
    state.hazardCount += 1;
    const ring = state.hazardCount % 3 === 0;
    state.hazards.push({id: state.hazardCount, kind: ring ? "ring" : "circle", x: ring ? state.enemyX : state.x, y: ring ? state.enemyY : state.y, radius: ring ? 185 : 82, remaining: state.assist ? 2.1 : 1.35});
    state.nextHazard = state.assist ? 3.2 : 2.5;event(state, "warning", state.x, state.y, ring ? 2 : 1);
  }
  for (const hazard of state.hazards) {
    hazard.remaining -= dt;
    if (hazard.remaining > 0) continue;
    const separation = Math.hypot(state.x - hazard.x, state.y - hazard.y);
    if (separation <= hazard.radius && (hazard.kind !== "ring" || separation > 83) && state.invulnerable <= 0) {
      const amount = Math.max(1, Math.round((state.enemyAttack * 1.3 - state.armor) * (state.assist ? .55 : 1)));
      state.hp = Math.max(0, state.hp - amount);state.invulnerable = .55;event(state, "hurt", state.x, state.y, amount);
    }
  }
  state.hazards = state.hazards.filter(hazard => hazard.remaining > 0);
  if (state.hp <= 0) state.phase = "lost";
}
