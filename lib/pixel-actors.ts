import type {ProfessionId} from "./character-model.ts";
import type {NpcId} from "./quest-model.ts";

// Original, hand-authored pixel primitives; CG illustrations are never downsampled.
export type Facing = "down" | "left" | "right" | "up";
export type PixelRect = {x: number; y: number; w: number; h: number; color: string};
export type PixelLook = {hair: string; skin: string; cloth: string; shade: string; trim: string; boots: string; metal: string; role: ProfessionId; hairStyle?: "long" | "ponytail"; glasses?: boolean};
export const pixelLooks: Record<ProfessionId | NpcId, PixelLook> = {
  wanderer: {hair: "#302936", skin: "#dfb18b", cloth: "#427f87", shade: "#254852", trim: "#cfb16f", boots: "#302c35", metal: "#bbcad0", role: "wanderer"},
  warrior: {hair: "#e4c47c", skin: "#e9bc99", cloth: "#a64b55", shade: "#602e47", trim: "#e1c283", boots: "#3e414e", metal: "#b8c4cb", role: "warrior", hairStyle: "long"},
  mage: {hair: "#c4c3db", skin: "#e3bc9c", cloth: "#465780", shade: "#29334d", trim: "#dec47d", boots: "#302e46", metal: "#94d5de", role: "mage", hairStyle: "long"},
  ranger: {hair: "#725348", skin: "#dbad89", cloth: "#668659", shade: "#324c42", trim: "#d4be7e", boots: "#44343b", metal: "#c0c8c2", role: "ranger", hairStyle: "long"},
  bard: {hair: "#39303a", skin: "#deb18f", cloth: "#82566f", shade: "#493749", trim: "#d2ac6c", boots: "#39313d", metal: "#b8a16d", role: "bard"},
  artisan: {hair: "#a5543f", skin: "#e6b48c", cloth: "#b28a53", shade: "#3e4e5e", trim: "#d4b373", boots: "#3c3238", metal: "#b7c4c5", role: "artisan", glasses: true},
  healer: {hair: "#ddc99a", skin: "#e9bf9c", cloth: "#e1ddc5", shade: "#63867c", trim: "#d6bd7f", boots: "#4b4145", metal: "#97d6c9", role: "healer"},
  eira: {hair: "#805b43", skin: "#dfb68b", cloth: "#759364", shade: "#40564a", trim: "#d5b76d", boots: "#51403f", metal: "#b9d5be", role: "ranger", hairStyle: "ponytail"},
  lorne: {hair: "#b76543", skin: "#e2b48e", cloth: "#748f99", shade: "#a44c45", trim: "#dfb974", boots: "#3e3b43", metal: "#c6cecb", role: "warrior"},
  selene: {hair: "#2d3558", skin: "#e2b89a", cloth: "#45557b", shade: "#2b3455", trim: "#dcb97a", boots: "#35323f", metal: "#9edbea", role: "mage", hairStyle: "long", glasses: true},
  mira: {hair: "#89563f", skin: "#c79070", cloth: "#8d9f6e", shade: "#52694f", trim: "#e3ddaf", boots: "#51403f", metal: "#acd6a5", role: "healer", hairStyle: "long"},
  ori: {hair: "#4d3931", skin: "#d0a077", cloth: "#c59b52", shade: "#4b5b6b", trim: "#deb96c", boots: "#3c363d", metal: "#b8c4c5", role: "artisan", glasses: true},
  lucien: {hair: "#ddd8e1", skin: "#e1ba9c", cloth: "#8a617e", shade: "#427b83", trim: "#dec289", boots: "#3b3648", metal: "#e5ba71", role: "bard", hairStyle: "long"},
};
export function facingFromVector(x: number, y: number, previous: Facing = "down"): Facing {
  if (Math.hypot(x, y) < .01) return previous;
  return Math.abs(x) > Math.abs(y) ? x > 0 ? "right" : "left" : y > 0 ? "down" : "up";
}
export const walkPose = (travel: number): 0 | 1 | 2 => ([0, 1, 2, 1] as const)[Math.floor(Math.max(0, travel) / 18) % 4];
export const snapPixel = (value: number) => Math.round(value / 2) * 2;

export function pixelCharacter(look: PixelLook, facing: Facing, pose: 0 | 1 | 2, tier = 0): PixelRect[] {
  const pixels: PixelRect[] = [], outline = "#26323e", skinShade = "#ad755d";
  const r = (x: number, y: number, w: number, h: number, color: string) => pixels.push({x, y, w, h, color});
  const leftStep = pose === 2 ? -2 : 0, rightStep = pose === 0 ? -2 : 0;
  r(8, 45, 17, 2, "#182b3433");r(10, 47, 13, 1, "#182b3433");
  if (facing === "left" || facing === "right") {
    r(9, 21, 12, 20, outline);r(10, 22, 9, 18, look.shade);
    r(13, 34, 5, 11 + leftStep, look.boots);r(18, 34, 4, 11 + rightStep, outline);
    r(12, 44 + leftStep, 8, 4, look.boots);r(18, 44 + rightStep, 7, 4, look.boots);
    r(12, 20, 12, 15, outline);r(13, 21, 10, 13, look.cloth);r(13, 33, 10, 3, look.trim);
    r(16, 23 + (pose === 0 ? 1 : -1), 5, 10, look.shade);r(17, 32, 4, 4, look.skin);
    if (look.hairStyle) {r(9, 9, 8, look.hairStyle === "long" ? 20 : 17, look.hair);r(7, 16, 3, 10, look.hair);}
    r(11, 5, 14, 15, outline);r(12, 6, 13, 11, look.hair);r(17, 9, 8, 10, look.skin);r(24, 13, 2, 3, look.skin);
    r(12, 5, 12, 5, look.hair);r(12, 10, 5, 8, look.hair);r(22, 12, 2, 2, outline);r(22, 17, 2, 1, skinShade);
    if (look.glasses) {r(20, 11, 5, 1, look.trim);r(20, 14, 5, 1, look.trim);}
  } else {
    r(7, 21, 19, 20, outline);r(8, 22, 17, 18, look.shade);
    r(11, 34, 4, 11 + leftStep, look.boots);r(18, 34, 4, 11 + rightStep, look.boots);
    r(10, 44 + leftStep, 6, 4, look.boots);r(17, 44 + rightStep, 6, 4, look.boots);
    r(9, 20, 15, 15, outline);r(10, 21, 13, 13, look.cloth);r(10, 33, 13, 3, look.trim);r(15, 33, 3, 3, look.metal);
    r(5, 22 + (pose === 0 ? 1 : 0), 5, 11, look.shade);r(23, 22 + (pose === 2 ? 1 : 0), 5, 11, look.shade);
    r(6, 32 + (pose === 0 ? 1 : 0), 4, 4, look.skin);r(23, 32 + (pose === 2 ? 1 : 0), 4, 4, look.skin);
    if (look.role === "mage" || look.role === "healer") {r(8, 34, 17, 8, look.cloth);r(7, 41, 19, 3, look.trim);r(10, 35, 2, 6, look.shade);r(22, 35, 2, 6, look.shade);}
    r(9, 4, 15, 16, outline);r(10, 4, 13, 15, look.hair);r(12, 2, 9, 3, look.hair);
    if (facing === "down") {
      r(11, 9, 12, 10, look.skin);r(10, 5, 14, 5, look.hair);r(10, 9, 3, 4, look.hair);
      r(13, 12, 2, 2, outline);r(19, 12, 2, 2, outline);r(16, 17, 3, 1, skinShade);r(16, 19, 3, 2, look.skin);
      if (look.glasses) {r(12, 11, 5, 1, look.trim);r(18, 11, 5, 1, look.trim);r(12, 14, 5, 1, look.trim);r(18, 14, 5, 1, look.trim);}
      if (look.hairStyle === "long") {r(8, 10, 3, 14, look.hair);r(23, 9, 3, 15, look.hair);}
      if (look.hairStyle === "ponytail") r(7, 4, 4, 13, look.hair);
    } else {
      r(10, 8, 13, 12, look.hair);r(11, 19, 12, 2, look.shade);
      if (look.hairStyle === "long") {r(10, 15, 14, 12, look.hair);r(12, 26, 10, 2, look.hair);}
      if (look.hairStyle === "ponytail") {r(14, 13, 6, 15, look.hair);r(14, 14, 6, 2, look.trim);}
      r(10, 27, 2, 12, look.cloth);r(22, 27, 2, 12, look.cloth);
    }
  }
  // Equipment silhouettes remain distinct even at the map's simplified scale.
  if (look.role === "warrior" || look.role === "wanderer") {r(28, 27, 2, 16, look.metal);r(25, 32, 7, 2, look.trim);r(28, 33, 2, 5, look.boots);if (look.role === "warrior") {r(2, 25, 6, 11, outline);r(3, 26, 4, 8, look.metal);r(4, 27, 2, 6, look.trim);}}
  else if (look.role === "mage" || look.role === "healer") {r(28, 16, 2, 31, look.trim);r(26, 12, 6, 6, outline);r(27, 13, 4, 4, look.metal);r(28, 12, 2, 5, "#e7e9c8");}
  else if (look.role === "ranger") {r(26, 22, 2, 3, look.trim);r(28, 25, 2, 4, look.trim);r(30, 29, 2, 10, look.trim);r(28, 39, 2, 4, look.trim);r(26, 43, 2, 3, look.trim);r(26, 24, 1, 20, "#c8c8a6");}
  else if (look.role === "artisan") {r(27, 25, 2, 19, look.boots);r(23, 22, 9, 6, outline);r(24, 23, 7, 4, look.metal);r(12, 26, 10, 9, look.shade);}
  else {r(26, 22, 2, 10, look.trim);r(23, 31, 8, 8, outline);r(24, 32, 6, 6, look.metal);r(26, 32, 1, 5, look.boots);}
  if (tier > 0) {r(12, 5, 10, 1, look.trim);r(10, 25, 1, 7, look.trim);r(22, 25, 1, 7, look.trim);}
  return facing === "left" ? pixels.map(pixel => ({...pixel, x: 32 - pixel.x - pixel.w})) : pixels;
}

export function pixelEnemy(kind: string, pose: number): PixelRect[] {
  const pixels: PixelRect[] = [], edge = "#243442", glow = kind === "knight" ? "#e9a15a" : kind === "crown" ? "#c2a6e1" : "#b2e0d3";
  const r = (x: number, y: number, w: number, h: number, color: string) => pixels.push({x, y, w, h, color});
  r(9, 45, 23, 3, "#182b3433");
  if (kind === "thorn") {
    r(6, 24, 26, 15, edge);r(9, 23, 20, 12, "#687653");r(26, 20, 10, 13, "#494b44");r(30, 24, 2, 2, "#f2c27d");
    for (const x of [8, 15, 25, 31]) {r(x, 36, 3, 11 - (pose === 0 && x % 2 ? 2 : 0), "#493c3d");r(x - 2, 44, 5, 4, "#34333c");}
    for (const [x, y] of [[8, 18], [17, 15], [25, 18]]) {r(x, y, 3, 10, "#9a9870");r(x - 1, y, 5, 2, "#b0b483");}
  } else if (kind === "eye") {
    r(12, 13, 18, 22, edge);r(15, 16, 12, 15, "#b2b5c8");r(16, 20, 10, 7, "#e9cd89");r(20, 20, 3, 7, edge);
    for (const [x, y] of [[4, 10], [30, 8], [3, 30], [32, 30], [17, 38]]) {r(x, y + pose, 4, 8, "#7c86a5");r(x + 1, y + pose, 2, 5, "#dde0dc");}
  } else {
    const stone = kind === "guardian", shade = stone ? "#667c78" : kind === "crown" ? "#5d527b" : kind === "knight" ? "#64434b" : "#3b6875";
    r(12, 8, 18, 16, edge);r(14, 10, 14, 12, stone ? "#abb7a0" : shade);r(15, 15, 3, 3, glow);r(23, 15, 3, 3, glow);
    r(10, 22, 22, 17, edge);r(12, 24, 18, 14, shade);r(18, 25, 6, 8, glow);r(20, 26, 2, 5, "#e7edcd");
    r(5, 24 + pose, 6, 15, shade);r(31, 24 - pose, 6, 15, shade);r(3, 36 + pose, 8, 4, stone ? "#a5b49a" : glow);r(31, 36 - pose, 8, 4, stone ? "#a5b49a" : glow);
    if (kind === "wisp" || kind === "crown") {r(9, 36, 24, 5, shade);r(7, 40, 8, 4, shade);r(18, 40, 5, 7, shade);r(27, 40, 8, 4, shade);}
    else {r(12, 38, 6, 8, shade);r(24, 38, 6, 8, shade);r(10, 44, 9, 4, edge);r(24, 44, 9, 4, edge);}
    if (stone || kind === "crown") {r(11, 4, 4, 7, glow);r(19, 2, 4, 7, glow);r(27, 4, 4, 7, glow);r(11, 9, 20, 2, "#c7b887");}
    if (kind === "knight") {r(35, 14, 2, 28, "#b8c6cb");r(32, 34, 8, 2, "#cda365");}
  }
  return pixels;
}
