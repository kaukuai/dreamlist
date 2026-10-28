export type Point = {x: number; y: number};
export const FIELD = {width: 1200, height: 800, speed: 170, start: {x: 580, y: 605}};
export const fieldPlaces = [
  {id: "echo", name: "散落的微光", x: 510, y: 535, kind: "echo"},
  {id: "lorne", name: "洛恩", x: 715, y: 490, kind: "npc"},
  {id: "selene", name: "賽琳", x: 345, y: 375, kind: "npc"},
  {id: "mira", name: "米菈", x: 390, y: 645, kind: "npc"},
  {id: "ori", name: "奧里", x: 875, y: 355, kind: "npc"},
  {id: "lucien", name: "露榭", x: 690, y: 640, kind: "npc"},
  {id: "eira", name: "艾菈", x: 960, y: 460, kind: "npc"},
  {id: "bell-low", name: "低音共鳴石", x: 470, y: 400, kind: "bell"},
  {id: "bell-high", name: "高音共鳴石", x: 745, y: 380, kind: "bell"},
  {id: "bell-mid", name: "中音共鳴石", x: 610, y: 285, kind: "bell"},
  {id: "portal", name: "回聲之門", x: 1030, y: 410, kind: "portal"},
] as const;
export type FieldPlace = typeof fieldPlaces[number];
export type FieldProgress = Point & {discovered: string[]; bellSequence: string[]; bellSolved: boolean};
export const initialField = (): FieldProgress => ({...FIELD.start, discovered: [], bellSequence: [], bellSolved: false});
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
// Feet collide with building footprints, fountain and planted edges; not with roof artwork.
const walls = [
  {x: 465, y: 40, width: 285, height: 185},
  {x: 95, y: 75, width: 240, height: 210},
  {x: 865, y: 70, width: 250, height: 200},
  {x: 90, y: 560, width: 220, height: 175},
  {x: 875, y: 615, width: 200, height: 135},
];
export function walkable(point: Point) {
  return point.x >= 120 && point.x <= 1100 && point.y >= 225 && point.y <= 740 &&
    !walls.some(wall => point.x >= wall.x - 10 && point.x <= wall.x + wall.width + 10 && point.y >= wall.y - 10 && point.y <= wall.y + wall.height + 10) &&
    Math.hypot((point.x - 600) / 1.15, point.y - 335) >= 43;
}
export function moveField(position: Point, direction: Point, dt: number): Point {
  const size = Math.max(1, Math.hypot(direction.x, direction.y));
  const length = FIELD.speed * Math.min(.05, Math.max(0, dt));
  let result = {...position};
  const horizontal = {x: position.x + direction.x / size * length, y: position.y};
  if (walkable(horizontal)) result = horizontal;
  const vertical = {x: result.x, y: result.y + direction.y / size * length};
  if (walkable(vertical)) result = vertical;
  return result;
}
/** Grid BFS provides tap-to-walk around obstacles instead of sliding through buildings. */
export function fieldPath(from: Point, destination: Point): Point[] {
  const cell = 25, columns = 49, rows = 33;
  const toCell = (point: Point) => ({x: Math.round(point.x / cell), y: Math.round(point.y / cell)});
  const start = toCell(from), requested = toCell(destination);
  let end = requested;
  if (!walkable({x: end.x * cell, y: end.y * cell})) {
    const possible: {x: number; y: number}[] = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) if (walkable({x: x * cell, y: y * cell})) possible.push({x, y});
    end = possible.sort((a, b) => distance(a, requested) - distance(b, requested))[0];
  }
  const key = (point: Point) => point.y * columns + point.x;
  const queue = [start], previous = new Map<number, Point | null>([[key(start), null]]);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (key(current) === key(end)) break;
    for (const offset of [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}]) {
      const next = {x: current.x + offset.x, y: current.y + offset.y};
      if (!previous.has(key(next)) && walkable({x: next.x * cell, y: next.y * cell})) {previous.set(key(next), current);queue.push(next);}
    }
  }
  if (!previous.has(key(end))) return [];
  const path: Point[] = [];
  for (let node: Point | null = end; node && key(node) !== key(start); node = previous.get(key(node)) ?? null) path.unshift({x: node.x * cell, y: node.y * cell});
  if (walkable(destination)) path.push(destination);
  return path;
}
export function nearbyPlace(position: Point, places: readonly FieldPlace[] = fieldPlaces) {
  return places.filter(place => distance(position, place) <= 83).sort((a, b) => distance(position, a) - distance(position, b))[0] ?? null;
}
export const bellSolution = ["bell-low", "bell-high", "bell-mid"];
export function touchField(progress: FieldProgress, placeId: string, position: Point) {
  const place = fieldPlaces.find(place => place.id === placeId);
  if (!place || !walkable(position) || distance(place, position) > 90) throw new Error("先靠近這個地方，再與它互動");
  Object.assign(progress, position);
  if (!progress.discovered.includes(place.id)) progress.discovered.push(place.id);
  if (place.kind === "bell" && !progress.bellSolved) {
    progress.bellSequence.push(place.id);progress.bellSequence = progress.bellSequence.slice(-3);
    progress.bellSolved = progress.bellSequence.join() === bellSolution.join();
  }
  return place;
}
