import {worldProps,groundAt,sortByFeet,type ZoneId,type WorldProp,type WorldPoint} from "@/lib/world-map";
import {fieldPlaces,FIELD} from "@/lib/field-engine";
import {spriteLayers,spriteLooks,spriteRows,type SpriteAction,type SpriteIdentity} from "@/lib/sprite-catalog";
import type {Facing} from "@/lib/pixel-actors";
import manifest from "@/public/art/lpc/manifest.json";
const images=new Map<string,HTMLImageElement>(),grounds=new Map<ZoneId,HTMLCanvasElement>();
const records=new Map(manifest.assets.map(asset=>[asset.file,asset]));
let loading:Promise<void>|null=null;
export function loadWorldArt(){
 if(!loading)loading=Promise.all(manifest.assets.map(asset=>new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve();img.onerror=()=>reject(new Error(`無法載入場景素材 ${asset.file}`));images.set(asset.file,img);img.src="/art/lpc/"+asset.file;}))).then(()=>{}).catch(error=>{loading=null;throw error;});
 return loading;
}
function tile(ctx:CanvasRenderingContext2D,file:string,sx:number,sy:number,w:number,h:number,x:number,y:number,dw=w,dh=h){const img=images.get(file);if(img?.complete&&img.naturalWidth)ctx.drawImage(img,sx,sy,w,h,Math.round(x),Math.round(y),dw,dh);}
function repeat(ctx:CanvasRenderingContext2D,file:string,sx:number,sy:number,x:number,y:number,w:number,h:number){for(let py=0;py<h;py+=32)for(let px=0;px<w;px+=32)tile(ctx,file,sx,sy,Math.min(32,w-px),Math.min(32,h-py),x+px,y+py);}
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
export function groundCanvas(zone:ZoneId){
 const old=grounds.get(zone);if(old)return old;const canvas=document.createElement("canvas");canvas.width=FIELD.width;canvas.height=FIELD.height;const ctx=canvas.getContext("2d")!;ctx.imageSmoothingEnabled=false;
 ctx.fillStyle=zone==="library"?"#17262a":"#47652d";ctx.fillRect(0,0,FIELD.width,FIELD.height);
 for(let y=0;y<FIELD.height;y+=32)for(let x=0;x<FIELD.width;x+=32){
  const ground=groundAt({x:x+16,y:y+16},zone),seed=(x/32*17+y/32*31)%3;
  if(zone==="library"&&(x<224||x>=992||y<128||y>=736))continue;
  if(ground==="wood"){
   ctx.fillStyle=seed===0?"#876749":seed===1?"#806044":"#795b42";ctx.fillRect(x,y,32,32);ctx.fillStyle="#5b4938";ctx.fillRect(x,y,32,1);ctx.fillRect(x+(y%64?8:24),y,1,32);ctx.fillStyle="#a1805855";ctx.fillRect(x+4,y+12,17,1);
  }else if(ground==="stone")tile(ctx,"tile-castlefloors.png",(seed%3)*32+160,160,32,32,x,y);
  else if(ground==="dirt")tile(ctx,"tile-dirt.png",seed*32,160,32,32,x,y);
  else if(ground==="water")tile(ctx,"tile-water.png",seed*32,160,32,32,x,y);
  else if(ground==="bridge"){tile(ctx,"tile-water.png",32,160,32,32,x,y);ctx.fillStyle="#806344";ctx.fillRect(x,y,32,32);ctx.fillStyle="#b99761";for(let n=0;n<32;n+=8)ctx.fillRect(x,y+n,32,6);}
  else tile(ctx,"tile-grass.png",seed*32,160,32,32,x,y);
 }
 if(zone==="town"){
  for(const row of [{x:192,y:288,w:64,h:96},{x:576,y:208,w:64,h:96},{x:896,y:288,w:64,h:96},{x:272,y:640,w:160,h:64},{x:816,y:640,w:128,h:64},{x:800,y:448,w:352,h:64}])repeat(ctx,"tile-dirt.png",32,160,row.x,row.y,row.w,row.h);
 }else if(zone==="library"){
  ctx.fillStyle="#273946";ctx.fillRect(224,128,768,64);repeat(ctx,"tile-house.png",32,32,224,144,768,64);ctx.fillStyle="#4b4237";ctx.fillRect(224,208,768,8);ctx.fillRect(224,208,8,528);ctx.fillRect(984,208,8,528);ctx.fillRect(224,728,768,8);
  ctx.fillStyle="#b89a6560";ctx.fillRect(488,528,224,176);ctx.strokeStyle="#c2a36b";ctx.strokeRect(496,536,208,160);
 }
 grounds.set(zone,canvas);return canvas;
}
export function drawProp(ctx:CanvasRenderingContext2D,prop:WorldProp,lit=false){
 const {x,y,kind}=prop;
 if(kind==="tree"||kind==="pine"){
  tile(ctx,"tile-trunk.png",0,0,64,96,x-32,y-80);tile(ctx,"tile-treetop.png",kind==="pine"?0:96,kind==="pine"?96:0,96,96,x-48,y-142);return;
 }
 if(kind==="house"||kind==="tower"){
  const w=prop.width??160,h=prop.height??192,top=y-h;
  ctx.fillStyle="#15251e40";ctx.fillRect(x+10,y-16,w+12,28);
  repeat(ctx,"tile-house.png",32,32,x+8,y-96,w-16,96);
  tile(ctx,"tile-house.png",96,0,32,64,x+w/2-16,y-64);
  tile(ctx,"tile-house.png",256,0,32,64,x+24,y-80);tile(ctx,"tile-house.png",256,0,32,64,x+w-56,y-80);
  ctx.save();ctx.beginPath();ctx.moveTo(x-8,y-94);ctx.lineTo(x+24,top+16);ctx.lineTo(x+w-24,top+16);ctx.lineTo(x+w+8,y-94);ctx.closePath();ctx.clip();repeat(ctx,"tile-house.png",32,128,x-8,top,w+32,h-92);ctx.restore();
  ctx.fillStyle="#383745";ctx.fillRect(x-8,y-98,w+16,5);ctx.fillStyle="#909088";ctx.fillRect(x+24,top+12,w-48,4);
  if(kind==="tower"){ctx.fillStyle="#282c3c";ctx.fillRect(x+w/2-19,top+34,38,40);ctx.strokeStyle="#c0af76";ctx.lineWidth=2;ctx.strokeRect(x+w/2-17,top+36,34,36);ctx.beginPath();ctx.arc(x+w/2,top+54,12,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(x+w/2,top+44);ctx.lineTo(x+w/2,top+54);ctx.lineTo(x+w/2+7,top+58);ctx.stroke();if(lit){ctx.fillStyle="#f4d69466";ctx.fillRect(x+w/2-16,top+36,32,36);}}
  return;
 }
 if(kind==="bench"||kind==="planter"){
  const w=prop.width??64;ctx.fillStyle="#3a3b2f";ctx.fillRect(x+4,y-7,5,8);ctx.fillRect(x+w-9,y-7,5,8);ctx.fillStyle="#95754d";ctx.fillRect(x,y-18,w,12);ctx.fillStyle="#b39860";ctx.fillRect(x,y-18,w,2);ctx.fillRect(x,y-11,w,1);
  if(kind==="planter"){ctx.fillStyle="#3f6433";ctx.fillRect(x+3,y-26,w-6,10);for(let n=0;n<w-12;n+=9){ctx.fillStyle=n%2?"#dcc491":"#b6848b";ctx.fillRect(x+6+n,y-29-(n%3),3,4);}}else{ctx.fillStyle="#95754d";ctx.fillRect(x,y-35,w,6);ctx.fillRect(x+3,y-32,3,14);ctx.fillRect(x+w-6,y-32,3,14);}return;
 }
 if(kind==="fountain"){
  ctx.fillStyle="#223b3155";ctx.beginPath();ctx.ellipse(x+5,y-10,62,19,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#646d70";ctx.beginPath();ctx.ellipse(x,y-34,55,28,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#bac0a4";ctx.beginPath();ctx.ellipse(x,y-40,53,25,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#477b83";ctx.beginPath();ctx.ellipse(x,y-42,44,17,0,0,Math.PI*2);ctx.fill();ctx.fillStyle="#91c4be";ctx.fillRect(x-27,y-44,22,2);ctx.fillRect(x+10,y-39,20,2);ctx.fillStyle="#a4aa92";ctx.fillRect(x-7,y-85,14,48);ctx.fillStyle="#ced2ae";ctx.fillRect(x-12,y-88,24,8);ctx.fillStyle="#7d9690";ctx.fillRect(x-3,y-85,4,45);return;
 }
 if(kind==="shelf"){
  ctx.fillStyle="#372f30";ctx.fillRect(x,y-80,prop.width??128,80);ctx.fillStyle="#8c6846";ctx.fillRect(x-3,y-82,(prop.width??128)+6,5);
  for(let row=0;row<3;row++){for(let n=0;n<(prop.width??128)-8;n+=8){ctx.fillStyle=["#a87553","#7d8f75","#6a7d90","#b49b69"][(n/8+row)%4];ctx.fillRect(x+5+n,y-72+row*23,5,17-(n%3));}ctx.fillStyle="#b28858";ctx.fillRect(x,y-52+row*23,prop.width??128,3);}return;
 }
 if(kind==="table"){
  ctx.fillStyle="#332e29";ctx.fillRect(x+7,y-40,7,40);ctx.fillRect(x+(prop.width??96)-14,y-40,7,40);ctx.fillStyle="#9d7d53";ctx.fillRect(x,y-62,prop.width??96,38);ctx.fillStyle="#c1a06d";ctx.fillRect(x+2,y-61,(prop.width??96)-4,3);ctx.fillStyle="#ded4a2";ctx.fillRect(x+23,y-54,28,18);ctx.fillStyle="#6a604c";ctx.fillRect(x+36,y-54,1,18);return;
 }
 if(kind==="ruin"){
  repeat(ctx,"tile-castlefloors_outside.png",32,32,x,y-64,144,64);ctx.fillStyle="#626e69";repeat(ctx,"tile-house.png",32,32,x+8,y-112,22,80);repeat(ctx,"tile-house.png",32,32,x+114,y-112,22,80);ctx.fillStyle="#c2c6a477";ctx.fillRect(x+8,y-112,3,80);ctx.fillRect(x+114,y-112,3,80);ctx.fillStyle="#adb49a";ctx.fillRect(x+5,y-117,28,9);ctx.fillRect(x+111,y-117,28,9);ctx.fillStyle=lit?"#d4c27d":"#7a8779";ctx.fillRect(x+57,y-81,28,43);ctx.fillStyle=lit?"#f9e6a2":"#42584f";ctx.fillRect(x+66,y-71,10,22);return;
 }
 if(kind==="fire"){
  ctx.fillStyle="#473a32";ctx.fillRect(x-14,y-8,30,5);ctx.fillRect(x-8,y-12,7,12);ctx.fillStyle="#bc7b48";ctx.fillRect(x-7,y-23,15,17);ctx.fillStyle="#e9b76c";ctx.fillRect(x-3,y-28,7,20);return;
 }
 tile(ctx,"tile-barrel.png",0,0,32,32,x-16,y-32);
}
export type WorldFrame={zone:ZoneId;camera:WorldPoint;zoom:number;player:WorldPoint;identity:SpriteIdentity;direction:Facing;frame:number;tier:number;discovered:string[];bellSolved:boolean;destination:WorldPoint|null;time:number;footprints:{x:number;y:number;at:number}[];focus?:string};
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
   if(place.kind==="lore"){ctx.fillStyle="#624f38";ctx.fillRect(place.x-2,place.y-19,4,19);ctx.fillRect(place.x-14,place.y-37,28,24);ctx.fillStyle="#d2c395";ctx.fillRect(place.x-11,place.y-34,22,18);ctx.fillStyle="#857b5e";for(let line=0;line<3;line++)ctx.fillRect(place.x-7,place.y-30+line*4,14-line*2,1);if(!state.discovered.includes(place.id)){ctx.fillStyle="#e9d9a0";ctx.fillRect(place.x-1,place.y-37,2,3);}return;}
   if(place.kind==="bell"){ctx.fillStyle="#3e514e";ctx.fillRect(place.x-9,place.y-27,18,25);ctx.fillStyle=state.bellSolved?"#e5cd85":"#b1b499";ctx.fillRect(place.x-8,place.y-29,16,4);ctx.fillRect(place.x-2,place.y-21,4,12);return;}
   if(place.kind==="shrine")return;
   const glow=place.kind==="echo"?"#d0ead6":"#a7d7cb";ctx.fillStyle=glow;const phase=Math.sin(state.time/650)*.2+.8;ctx.globalAlpha=phase;
   if(place.kind==="portal"){ctx.strokeStyle=glow;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(place.x,place.y-23,14,25,0,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#508e8066";ctx.fill();}else{ctx.fillRect(place.x-1,place.y-14,2,13);ctx.fillRect(place.x-5,place.y-9,10,2);}ctx.globalAlpha=1;
  }});
 }
 draws.push({y:state.player.y,draw:()=>drawSprite(ctx,state.identity,Math.round(state.player.x),Math.round(state.player.y),state.direction,state.frame,"walk",state.tier)});
 for(const entry of sortByFeet(draws))entry.draw();
 // A shared dusk grade and light are applied to the scene and actors together.
 ctx.fillStyle=state.zone==="library"?"#efc8890b":"#15283919";ctx.fillRect(0,0,FIELD.width,FIELD.height);ctx.restore();
 if(state.zone!=="library"){const shade=ctx.createRadialGradient(width*.5,height*.45,Math.min(width,height)*.25,width*.5,height*.5,Math.max(width,height)*.7);shade.addColorStop(0,"transparent");shade.addColorStop(1,"#10231f70");ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);}
}
