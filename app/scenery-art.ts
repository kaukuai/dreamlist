/** Original environment plates. Source rectangles are inspected, not inferred from a grid. */
const sources = {landmarks: "/art/scenery/landmarks.webp", interiors: "/art/scenery/interiors.webp", terrain: "/art/scenery/terrain.webp", sanctuary: "/art/scenery/sanctuary.webp", enemies:"/art/scenery/enemies.webp"};
const images = new Map<string, HTMLImageElement>();
const requests = new Map<string, Promise<void>>();
export function loadScenery(battle = false) {
  const names: (keyof typeof sources)[] = battle ? ["sanctuary","enemies"] : ["landmarks", "interiors", "terrain"];
  return Promise.all(names.map(name => {
    let request = requests.get(name);
    if (!request) {
      request = new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {images.set(name, image);resolve();};
        image.onerror = () => {requests.delete(name);reject(new Error("場景美術尚未載入，請重試。"));};
        image.src = sources[name];
      });
      requests.set(name, request);
    }
    return request;
  })).then(() => {});
}
export const sceneryFrames = {
  archive: {sheet:"landmarks", box:[0, 15, 532, 511]},
  tower: {sheet:"landmarks", box:[580, 0, 382, 528]},
  inn: {sheet:"landmarks", box:[1014, 12, 522, 516]},
  fountain: {sheet:"landmarks", box:[0, 530, 535, 458]},
  oak: {sheet:"landmarks", box:[535, 530, 552, 482]},
  shrine: {sheet:"landmarks", box:[1093, 531, 443, 464]},
  shelf: {sheet:"interiors", box:[24, 0, 488, 584]},
  table: {sheet:"interiors", box:[523, 140, 627, 451]},
  window: {sheet:"interiors", box:[1154, 0, 308, 586]},
  lamp: {sheet:"interiors", box:[118, 584, 240, 438]},
  bench: {sheet:"interiors", box:[478, 636, 514, 360]},
  planter: {sheet:"interiors", box:[1002, 642, 516, 338]},
} as const;
export function drawScenery(ctx: CanvasRenderingContext2D, name: keyof typeof sceneryFrames, x: number, foot: number, width: number, height?: number) {
  const frame = sceneryFrames[name], image = images.get(frame.sheet);
  if (!image) return;
  const [sx,sy,sw,sh] = frame.box, h = height ?? width * sh / sw;
  ctx.drawImage(image,sx,sy,sw,sh,Math.round(x),Math.round(foot-h),Math.round(width),Math.round(h));
}
export function terrainTexture(kind: "grass"|"stone"|"dirt"|"wood") {
  const image=images.get("terrain");if(!image)return null;
  const canvas=document.createElement("canvas");const resolution=kind==="stone"?128:kind==="wood"?192:256;canvas.width=resolution;canvas.height=resolution;
  const context=canvas.getContext("2d")!;context.imageSmoothingEnabled=false;
  const column=kind==="stone"||kind==="wood"?1:0,row=kind==="dirt"||kind==="wood"?1:0;
  const size=image.naturalWidth/2;
  context.drawImage(image,column*size,row*size,size,size,0,0,resolution,resolution);return canvas;
}
export const sanctuaryArt = () => images.get("sanctuary");

/** Three authored poses per enemy, each normalized to its opaque foot baseline. */
const enemyRows = {
 wisp:{top:0,bottom:242,feet:[237,230,240],height:78},
 thorn:{top:243,bottom:484,feet:[237,240,238],height:90},
 guardian:{top:485,bottom:752,feet:[267,264,267],height:116},
 eye:{top:753,bottom:999,feet:[242,242,243],height:78},
 knight:{top:1000,bottom:1251,feet:[246,251,251],height:100},
 crown:{top:1252,bottom:1536,feet:[273,274,274],height:126},
} as const;
export function drawSceneryEnemy(ctx:CanvasRenderingContext2D,kind:string,x:number,y:number,frame:number){
 const image=images.get("enemies");if(!image)return;
 const row=enemyRows[kind as keyof typeof enemyRows]??enemyRows.wisp,index=((frame%3)+3)%3,column=[0,341,683][index],width=index===1?342:341;
 const h=row.bottom-row.top,scale=row.height/h;
 ctx.drawImage(image,column,row.top,width,h,Math.round(x-width*scale/2),Math.round(y-row.feet[index]*scale),Math.round(width*scale),row.height);
}
