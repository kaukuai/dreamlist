import {worldProps,sortByFeet,type ZoneId,type WorldProp,type WorldPoint} from "@/lib/world-map";
import {fieldPlaces,FIELD} from "@/lib/field-engine";
import {spriteLayers,spriteLooks,spriteRows,type SpriteAction,type SpriteIdentity} from "@/lib/sprite-catalog";
import type {Facing} from "@/lib/pixel-actors";
import manifest from "@/public/art/lpc/manifest.json";
import {loadScenery,drawScenery} from "./scenery-art";
import {detailedGround} from "./world-terrain";
import {paintAtmosphere,paintWorldLights} from "./world-atmosphere";
const images=new Map<string,HTMLImageElement>();
const records=new Map(manifest.assets.map(asset=>[asset.file,asset]));
let loading:Promise<void>|null=null;
export function loadWorldArt(){
 if(!loading)loading=Promise.all([loadScenery(), ...manifest.assets.map(asset=>new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>reject(new Error(`無法載入場景素材 ${asset.file}`));images.set(asset.file,img);img.src="/art/lpc/"+asset.file;}))]).then(()=>{}).catch(error=>{loading=null;throw error;});
 return loading;
}
function tile(ctx:CanvasRenderingContext2D,file:string,sx:number,sy:number,w:number,h:number,x:number,y:number,dw=w,dh=h){const img=images.get(file);if(img?.complete&&img.naturalWidth)ctx.drawImage(img,sx,sy,w,h,Math.round(x),Math.round(y),dw,dh);}
function composeSprite(ctx:CanvasRenderingContext2D,identity:SpriteIdentity,x:number,y:number,direction:Facing,frame:number,action:SpriteAction="walk",tier=0){
 const row=spriteRows[direction],body=records.get(`body-${spriteLooks[identity]?.body??"m"}-${action}.png`);
 const bodyInfo=body as {feet?:number[][]}|undefined,foot=bodyInfo?.feet?.[row]?.[frame]??62;
 ctx.fillStyle="#13251e55";ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y)-1,10,3,0,0,Math.PI*2);ctx.fill();
 for(const layer of spriteLayers(identity)){
  const filename=`${layer.part}-${action}.png`,img=images.get(filename)??images.get(`${layer.part}-walk.png`);if(!img?.naturalWidth)continue;
  const cell=img.naturalHeight/4,columns=img.naturalWidth/cell,column=Math.min(frame,columns-1);
  ctx.save();if(layer.filter)ctx.filter=layer.filter;
  ctx.drawImage(img,column*cell,row*cell,cell,cell,Math.round(x-cell/2),Math.round(y-foot-(cell-64)/2),cell,cell);ctx.restore();
 }
 const weapon=spriteLooks[identity]?.weapon;
 if(weapon&&!["sword","bow"].includes(weapon)){
  const side=direction==="left"?-1:1,wx=Math.round(x+side*13),wy=Math.round(y-24);
  ctx.fillStyle="#493a33";ctx.fillRect(wx,wy-19,2,36);ctx.fillStyle=tier>0?"#e4ce84":"#bda56b";ctx.fillRect(wx,wy-19,1,30);
  if(weapon==="staff"){ctx.fillStyle="#514f69";ctx.fillRect(wx-3,wy-24,8,7);ctx.fillStyle="#9bcfd1";ctx.fillRect(wx-1,wy-23,4,4);}
  else if(weapon==="hammer"){ctx.fillStyle="#46505b";ctx.fillRect(wx-5,wy-19,12,7);ctx.fillStyle="#9ca5a6";ctx.fillRect(wx-4,wy-19,10,2);}
  else{ctx.fillStyle="#473b35";ctx.fillRect(wx-4,wy-4,10,11);ctx.fillStyle="#ba9665";ctx.fillRect(wx-3,wy-3,8,9);ctx.fillStyle="#54423c";ctx.fillRect(wx,wy-2,2,6);}
 }
}
const spriteCache=new Map<string,HTMLCanvasElement>();
export function drawSprite(ctx:CanvasRenderingContext2D,identity:SpriteIdentity,x:number,y:number,direction:Facing,frame:number,action:SpriteAction="walk",tier=0){
 const key=`${identity}:${direction}:${frame}:${action}:${tier}`;let image=spriteCache.get(key);
 if(!image){image=document.createElement("canvas");image.width=128;image.height=128;const surface=image.getContext("2d")!;surface.imageSmoothingEnabled=false;composeSprite(surface,identity,64,120,direction,frame,action,tier);if(spriteCache.size>=256)spriteCache.delete(spriteCache.keys().next().value!);spriteCache.set(key,image);}
 ctx.drawImage(image,Math.round(x)-64,Math.round(y)-120);
}
export function warmSprite(identity:SpriteIdentity){for(const direction of ["up","left","down","right"] as const)for(let frame=0;frame<9;frame++){const canvas=document.createElement("canvas");canvas.width=1;canvas.height=1;drawSprite(canvas.getContext("2d")!,identity,0,0,direction,frame);}}
export function drawMonster(ctx:CanvasRenderingContext2D,kind:string,x:number,y:number,frame:number){
 const name=kind==="thorn"?"man_eater_flower":kind==="eye"?"eyeball":kind==="guardian"?"pumpking":"ghost",img=images.get(`monster-${name}.png`);if(!img?.naturalWidth)return;
 const cellW=img.naturalWidth/3,cellH=img.naturalHeight/4,scale=Math.min(kind==="crown"?2:1.5,80/cellH),w=cellW*scale,h=cellH*scale;
 ctx.save();
 if(kind==="knight"){ctx.filter="brightness(.6) hue-rotate(130deg)";drawSprite(ctx,"warrior",x,y,"down",1+frame%8);ctx.restore();return;}
 if(kind==="guardian")ctx.filter="saturate(0) brightness(.8)";else if(kind==="crown")ctx.filter="hue-rotate(220deg)";
 ctx.drawImage(img,(frame%3)*cellW,0,cellW,cellH,x-w/2,y-h,w,h);ctx.restore();
}
export const groundCanvas = detailedGround;
export function drawProp(ctx:CanvasRenderingContext2D,prop:WorldProp,lit=false){
 const {x,y,kind}=prop;
 if(kind==="tree"||kind==="pine"){drawScenery(ctx,"oak",x-73,y+6,146,144);return;}
 if(kind==="house"||kind==="tower"){
  const w=prop.width??160;drawScenery(ctx,kind==="tower"?"tower":prop.id==="bookhouse"?"archive":"inn",x-5,y+3,w+10,prop.height??208);return;
 }
 if(kind==="fountain"){drawScenery(ctx,"fountain",x-64,y-10,128,110);return;}
 if(kind==="bench"||kind==="planter"){drawScenery(ctx,kind,x-3,y+2,(prop.width??64)+6,kind==="bench"?48:38);return;}
 if(kind==="shelf"){drawScenery(ctx,"shelf",x-3,y+2,(prop.width??128)+6,115);return;}
 if(kind==="table"){drawScenery(ctx,"table",x-3,y+1,(prop.width??96)+6,75);return;}
 if(kind==="ruin"){drawScenery(ctx,"shrine",x-3,y+4,150,160);if(lit){ctx.save();ctx.globalCompositeOperation="screen";ctx.fillStyle="#baf9d82e";ctx.beginPath();ctx.ellipse(x+75,y-50,21,38,0,0,Math.PI*2);ctx.fill();ctx.restore();}return;}
 if(kind==="lamp"){drawScenery(ctx,"lamp",x-13,y+3,42,87);return;}
 if(kind==="fire"){
  ctx.fillStyle="#473a32";ctx.fillRect(x-14,y-8,30,5);ctx.fillRect(x-8,y-12,7,12);ctx.fillStyle="#bc7b48";ctx.fillRect(x-7,y-23,15,17);ctx.fillStyle="#e9b76c";ctx.fillRect(x-3,y-28,7,20);return;
 }
 tile(ctx,"tile-barrel.png",0,0,32,32,x-16,y-32);
}
export type WorldFrame={zone:ZoneId;camera:WorldPoint;zoom:number;player:WorldPoint;identity:SpriteIdentity;direction:Facing;frame:number;tier:number;discovered:string[];bellSolved:boolean;destination:WorldPoint|null;time:number;footprints:{x:number;y:number;at:number}[];focus?:string;reducedMotion?:boolean};
export function paintWorld(ctx:CanvasRenderingContext2D,width:number,height:number,state:WorldFrame){
 ctx.imageSmoothingEnabled=false;ctx.fillStyle="#1b3026";ctx.fillRect(0,0,width,height);ctx.save();ctx.scale(state.zoom,state.zoom);ctx.translate(-Math.round(state.camera.x),-Math.round(state.camera.y));ctx.drawImage(groundCanvas(state.zone),0,0);
 for(const f of state.footprints){const age=state.time-f.at;if(age<1600){ctx.fillStyle=`rgba(40,45,32,${(1-age/1600)*.22})`;ctx.fillRect(Math.round(f.x)-2,Math.round(f.y)-1,4,2);}}
 if(state.destination){ctx.strokeStyle="#e2d3a2aa";ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(state.destination.x,state.destination.y,7,3,0,0,Math.PI*2);ctx.stroke();}
 const draws:{y:number;draw:()=>void}[]=worldProps[state.zone].map(prop=>({y:prop.y,draw:()=>drawProp(ctx,prop,prop.kind==="tower"?state.bellSolved:state.discovered.includes("grove-restored"))}));
 for(const place of fieldPlaces.filter(p=>p.zone===state.zone)){
  if(place.id==="echo"&&state.discovered.includes("echo"))continue;
  if(place.kind==="npc"){
   const id=(place.npcId??place.id) as SpriteIdentity,dx=state.player.x-place.x,dy=state.player.y-place.y,near=Math.hypot(dx,dy)<90,direction:Facing=near?(Math.abs(dx)>Math.abs(dy)?dx>0?"right":"left":dy>0?"down":"up"):"down";
   draws.push({y:place.y,draw:()=>{drawSprite(ctx,id,place.x,place.y,direction,0);if(near||state.focus===place.id){ctx.font="10px sans-serif";ctx.textAlign="center";ctx.fillStyle="#142b24bb";ctx.fillRect(place.x-24,place.y-66,48,15);ctx.fillStyle="#efe2ba";ctx.fillText(place.name,place.x,place.y-55);if(state.focus===place.id){ctx.fillStyle="#ead28b";ctx.fillText("!",place.x,place.y-76);}}}});
  }else draws.push({y:place.y,draw:()=>{
   if(place.kind==="exit"){ctx.fillStyle="#d6c89b";ctx.font="12px sans-serif";ctx.textAlign="center";ctx.fillText(place.to==="woods"?"›":"⌃",place.x,place.y-9);return;}
   if(place.kind==="lore"){
    ctx.fillStyle="#2c3028";ctx.fillRect(place.x-2,place.y-18,5,18);ctx.fillStyle="#876a46";ctx.fillRect(place.x-1,place.y-17,2,17);
    ctx.fillStyle="#332d24";ctx.fillRect(place.x-15,place.y-40,31,26);ctx.fillStyle="#a17c4e";ctx.fillRect(place.x-14,place.y-40,28,2);ctx.fillRect(place.x-15,place.y-39,2,24);
    ctx.fillStyle=state.discovered.includes(place.id)?"#b8b08d":"#d4c39b";ctx.fillRect(place.x-11,place.y-36,22,17);ctx.fillStyle="#a8936c";ctx.fillRect(place.x-11,place.y-20,22,1);
    ctx.fillStyle="#756b54";for(let line=0;line<4;line++)ctx.fillRect(place.x-7,place.y-33+line*3,14-line%2*3,1);ctx.fillStyle="#d6b06d";ctx.fillRect(place.x-1,place.y-38,2,2);return;
   }
   if(place.kind==="bell"){
    ctx.fillStyle="#243b3355";ctx.beginPath();ctx.ellipse(place.x,place.y,16,6,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#455a58";ctx.beginPath();ctx.moveTo(place.x-12,place.y);ctx.lineTo(place.x-11,place.y-30);ctx.lineTo(place.x-4,place.y-39);ctx.lineTo(place.x+9,place.y-35);ctx.lineTo(place.x+13,place.y);ctx.closePath();ctx.fill();
    ctx.fillStyle="#87918a";ctx.beginPath();ctx.moveTo(place.x-11,place.y-30);ctx.lineTo(place.x-4,place.y-39);ctx.lineTo(place.x+9,place.y-35);ctx.lineTo(place.x+7,place.y-29);ctx.closePath();ctx.fill();
    ctx.fillStyle="#a8b4a370";ctx.fillRect(place.x-10,place.y-29,2,24);ctx.fillStyle="#283f40";ctx.fillRect(place.x+7,place.y-29,3,29);
    ctx.strokeStyle=state.bellSolved?"#f1de9b":"#bdc9af";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(place.x,place.y-27);ctx.lineTo(place.x-4,place.y-21);ctx.lineTo(place.x+3,place.y-17);ctx.lineTo(place.x-2,place.y-11);ctx.stroke();
    ctx.fillStyle="#6a7a4b";ctx.fillRect(place.x-13,place.y-3,7,3);ctx.fillRect(place.x+6,place.y-2,8,2);return;
   }
   if(place.kind==="shrine")return;
   const glow=place.kind==="echo"?"#d0ead6":"#a7d7cb";ctx.fillStyle=glow;const phase=Math.sin(state.time/650)*.2+.8;ctx.globalAlpha=phase;
   if(place.kind==="portal"){drawScenery(ctx,"shrine",place.x-43,place.y+9,86,105);ctx.strokeStyle=glow;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(place.x,place.y-23,11,22,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#508e8066";ctx.fill();}else{ctx.fillRect(place.x-1,place.y-14,2,13);ctx.fillRect(place.x-5,place.y-9,10,2);}ctx.globalAlpha=1;
  }});
 }
 draws.push({y:state.player.y,draw:()=>drawSprite(ctx,state.identity,Math.round(state.player.x),Math.round(state.player.y),state.direction,state.frame,"walk",state.tier)});
 for(const entry of sortByFeet(draws))entry.draw();
 paintWorldLights(ctx,state);
 // A shared dusk grade and light are applied to the scene and actors together.
 ctx.fillStyle=state.zone==="library"?"#efc8890b":"#15283919";ctx.fillRect(0,0,FIELD.width,FIELD.height);ctx.restore();
 paintAtmosphere(ctx,width,height,state);
}
