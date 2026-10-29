import {fieldNotes, groundAt, validZone, worldWalkable, zoneInfo, type ZoneId} from "./world-map.ts";
export {fieldNotes, groundAt, zoneInfo};
export type {ZoneId};
export type Point = {x: number; y: number};
export const FIELD = {width: 1200, height: 800, speed: 128, start: {x: 580, y: 605}};
const townPlaces = [
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
export type FieldPlace = {id:string;name:string;x:number;y:number;kind:"echo"|"npc"|"bell"|"portal"|"exit"|"lore"|"shrine";zone:ZoneId;npcId?:string;to?:ZoneId;arrival?:Point};
export const fieldPlaces: readonly FieldPlace[] = [
 ...townPlaces.map(place=>({...place,zone:"town" as const})),
 {id:"library-door",name:"進入星頁書庫",x:224,y:336,kind:"exit",zone:"town",to:"library",arrival:{x:600,y:650}},
 {id:"forest-gate",name:"前往月痕林",x:1100,y:480,kind:"exit",zone:"town",to:"woods",arrival:{x:144,y:480}},
 {id:"library-exit",name:"返回晨鐘鎮",x:600,y:688,kind:"exit",zone:"library",to:"town",arrival:{x:224,y:352}},
 {id:"forest-exit",name:"返回晨鐘鎮",x:80,y:480,kind:"exit",zone:"woods",to:"town",arrival:{x:1060,y:480}},
 {id:"library-selene",npcId:"selene",name:"賽琳",x:560,y:336,kind:"npc",zone:"library"},
 {id:"forest-eira",npcId:"eira",name:"艾菈",x:416,y:464,kind:"npc",zone:"woods"},
 {id:"town-notice",name:"巡路告示",x:416,y:464,kind:"lore",zone:"town"},
 {id:"town-letter",name:"未寄出的信",x:856,y:656,kind:"lore",zone:"town"},
 {id:"library-history",name:"晨鐘鎮誌",x:448,y:400,kind:"lore",zone:"library"},
 {id:"library-margin",name:"書頁旁的筆記",x:736,y:336,kind:"lore",zone:"library"},
 {id:"woods-page-1",name:"營火旁的手記",x:368,y:544,kind:"lore",zone:"woods"},
 {id:"woods-page-2",name:"溪橋的刻痕",x:700,y:480,kind:"lore",zone:"woods"},
 {id:"woods-page-3",name:"石階上的書頁",x:832,y:400,kind:"lore",zone:"woods"},
 {id:"grove-restored",name:"聆聽舊鐘亭",x:944,y:608,kind:"shrine",zone:"woods"},
];
export const placesIn = (zone:ZoneId="town")=>fieldPlaces.filter(place=>place.zone===zone);
export type FieldProgress = Point & {zone?:ZoneId;visitedZones?:ZoneId[];discovered: string[]; bellSequence: string[]; bellSolved: boolean};
export const initialField = (): FieldProgress => ({...FIELD.start, zone:"town",visitedZones:["town"], discovered: [], bellSequence: [], bellSolved: false});
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function normalizeField(progress:FieldProgress) {
 progress.zone=validZone(progress.zone)?progress.zone:"town";progress.visitedZones??=["town"];if(!progress.visitedZones.includes(progress.zone))progress.visitedZones.push(progress.zone);
 if(!walkable(progress,progress.zone)){const spawn=zoneInfo[progress.zone].spawn;progress.x=spawn.x;progress.y=spawn.y;}
 return progress;
}
export const walkable = (point:Point,zone:ZoneId="town")=>worldWalkable(point,zone);
export function moveField(position: Point, direction: Point, dt: number, zone:ZoneId="town"): Point {
  const size = Math.max(1, Math.hypot(direction.x, direction.y));
  const length = FIELD.speed * Math.min(.05, Math.max(0, dt));
  let result = {...position};
  const horizontal = {x: position.x + direction.x / size * length, y: position.y};
  if (walkable(horizontal,zone)) result = horizontal;
  const vertical = {x: result.x, y: result.y + direction.y / size * length};
  if (walkable(vertical,zone)) result = vertical;
  return result;
}
// Immutable scenery permits sharing grid edge checks across repeated route requests.
const routeEdges=new Map<ZoneId,Map<string,boolean>>();
/** Grid BFS validates the whole edge and leaves room for a five-pixel waypoint tolerance. */
export function fieldPath(from: Point, destination: Point,zone:ZoneId="town"): Point[] {
  const cell = 16, columns = 76, rows = 51;
  let edges=routeEdges.get(zone);if(!edges){edges=new Map();routeEdges.set(zone,edges);}
  const toCell = (point: Point) => ({x: Math.round(point.x / cell), y: Math.round(point.y / cell)});
  const clear = (p:Point) => walkable(p,zone) && [{x:5,y:0},{x:-5,y:0},{x:0,y:5},{x:0,y:-5}].every(d=>walkable({x:p.x+d.x,y:p.y+d.y},zone));
  const segment = (a:Point,b:Point,padded=false) => {const steps=Math.max(1,Math.ceil(distance(a,b)/2));for(let i=1;i<=steps;i++){const p={x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps};if(!(padded?clear(p):walkable(p,zone)))return false;}return true;};
  const gridEdge=(a:Point,b:Point)=>{const key=`${a.x},${a.y}>${b.x},${b.y}`;let valid=edges.get(key);if(valid===undefined){valid=segment({x:a.x*cell,y:a.y*cell},{x:b.x*cell,y:b.y*cell},true);edges.set(key,valid);}return valid;};
  const requested = toCell(destination), origin=toCell(from);
  const starts:Point[]=[];
  for(let y=origin.y-3;y<=origin.y+3;y++)for(let x=origin.x-3;x<=origin.x+3;x++){const p={x:x*cell,y:y*cell};if(clear(p)&&segment(from,p))starts.push({x,y});}
  const start=starts.sort((a,b)=>distance({x:a.x*cell,y:a.y*cell},from)-distance({x:b.x*cell,y:b.y*cell},from))[0];
  if(!start)return [];
  let end = requested;
  if (!clear({x: end.x * cell, y: end.y * cell})) {
    const possible: {x: number; y: number}[] = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) if (clear({x: x * cell, y: y * cell})) possible.push({x, y});
    end = possible.sort((a, b) => distance(a, requested) - distance(b, requested))[0];
  }
  const key = (point: Point) => point.y * columns + point.x;
  const queue = [start], previous = new Map<number, Point | null>([[key(start), null]]);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    if (key(current) === key(end)) break;
    for (const offset of [{x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1}]) {
      const next = {x: current.x + offset.x, y: current.y + offset.y};
      if (!previous.has(key(next)) && gridEdge(current,next)) {previous.set(key(next), current);queue.push(next);}
    }
  }
  if (!previous.has(key(end))) return [];
  const path: Point[] = [];
  for (let node: Point | null = end; node && key(node) !== key(start); node = previous.get(key(node)) ?? null) path.unshift({x: node.x * cell, y: node.y * cell});
  path.unshift({x:start.x*cell,y:start.y*cell});
  if (walkable(destination,zone) && segment(path.at(-1)!,destination)) path.push(destination);
  return path;
}
export function nearbyPlace(position: Point, places: readonly FieldPlace[] = placesIn("town")) {
  return places.filter(place => distance(position, place) <= 83).sort((a, b) => distance(position, a) - distance(position, b))[0] ?? null;
}
export const bellSolution = ["bell-low", "bell-high", "bell-mid"];
export function touchField(progress: FieldProgress, placeId: string, position: Point) {
  const place = fieldPlaces.find(place => place.id === placeId && place.zone === (progress.zone??"town"));
  if (!place || !walkable(position,progress.zone??"town") || distance(place, position) > 90) throw new Error("先靠近這個地方，再與它互動");
  if(place.kind==="shrine" && !["woods-page-1","woods-page-2","woods-page-3"].every(id=>progress.discovered.includes(id)))throw new Error("鐘亭留下三個空缺。先沿林徑尋找三段巡林手記。");
  Object.assign(progress, position);
  if (!progress.discovered.includes(place.id)) progress.discovered.push(place.id);
  if (place.kind === "bell" && !progress.bellSolved) {
    progress.bellSequence.push(place.id);progress.bellSequence = progress.bellSequence.slice(-3);
    progress.bellSolved = progress.bellSequence.join() === bellSolution.join();
  }
  if(place.kind==="exit" && place.to && place.arrival){progress.zone=place.to;Object.assign(progress,place.arrival);progress.visitedZones??=["town"];if(!progress.visitedZones.includes(place.to))progress.visitedZones.push(place.to);}
  return place;
}
