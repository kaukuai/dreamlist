import type {ArenaState} from "@/lib/arena-engine";
import {arenaSafeRadius,arenaView} from "@/lib/arena-view";
import {facingFromVector} from "@/lib/pixel-actors";
import {walkFrame} from "@/lib/sprite-catalog";
import {drawSprite} from "./world-renderer";
import {sanctuaryArt,drawSceneryEnemy} from "./scenery-art";
export type BattleTheme="sanctuary"|"archive"|"rift";
const colors={wanderer:"#f5dfad",warrior:"#ffd19c",mage:"#a3dafa",ranger:"#bcf2c8",bard:"#e9c5ff",artisan:"#ffc997",healer:"#a5efda"};
function ring(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();}
function spark(ctx:CanvasRenderingContext2D,x:number,y:number,size:number,color:string){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-size);ctx.lineTo(x+size*.25,y-size*.25);ctx.lineTo(x+size,y);ctx.lineTo(x+size*.25,y+size*.25);ctx.lineTo(x,y+size);ctx.lineTo(x-size*.25,y+size*.25);ctx.lineTo(x-size,y);ctx.lineTo(x-size*.25,y-size*.25);ctx.closePath();ctx.fill();}
export function paintBattle(ctx:CanvasRenderingContext2D,width:number,height:number,state:ArenaState,kind:string,tier:number,theme:BattleTheme,reduced:boolean){
 const view=arenaView(width,height,state.x),time=state.tick/30,art=sanctuaryArt();ctx.imageSmoothingEnabled=false;
 ctx.fillStyle="#132322";ctx.fillRect(0,0,width,height);
 if(art){const scale=Math.max(width/art.width,height/art.height);ctx.save();ctx.globalAlpha=.32;ctx.drawImage(art,(width-art.width*scale)/2,(height-art.height*scale)/2,art.width*scale,art.height*scale);ctx.restore();}
 ctx.save();ctx.scale(view.zoom,view.zoom);ctx.translate(-view.x,-view.y);
 if(art)ctx.drawImage(art,-125,-250,850,1275);
 if(theme!=="sanctuary"){ctx.fillStyle=theme==="archive"?"#3035653d":"#722c2633";ctx.fillRect(-125,-250,850,1275);}
 const recent=state.events.filter(e=>state.tick-e.tick<18);
 // Contact shadows use simulation feet and lie beneath all sprites.
 ctx.fillStyle="#13242370";ctx.beginPath();ctx.ellipse(state.enemyX,state.enemyY-1,kind==="guardian"?28:20,8,0,0,Math.PI*2);ctx.fill();
 ring(ctx,state.enemyX,state.enemyY,27,"#c0a57377");
 for(const hazard of state.hazards){
  const progress=Math.max(0,Math.min(1,1-hazard.remaining/(state.assist?2.1:1.35)));
  ctx.fillStyle="#e65d383d";ctx.beginPath();ctx.arc(hazard.x,hazard.y,hazard.radius,0,Math.PI*2);
  if(hazard.kind==="ring")ctx.arc(hazard.x,hazard.y,arenaSafeRadius,0,Math.PI*2,true);
  ctx.fill("evenodd");ring(ctx,hazard.x,hazard.y,hazard.radius,"#ffdb9d",2);
  ctx.save();ctx.setLineDash([5,7]);ring(ctx,hazard.x,hazard.y,hazard.radius-5,"#ffae76aa");ctx.restore();
  if(hazard.kind==="ring")ring(ctx,hazard.x,hazard.y,arenaSafeRadius,"#b9efdc",2);
  const r=hazard.kind==="ring"?arenaSafeRadius+(hazard.radius-arenaSafeRadius)*progress:hazard.radius*progress;
  ring(ctx,hazard.x,hazard.y,r,"#ffac7180",3);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;spark(ctx,hazard.x+Math.cos(a)*(hazard.radius+4),hazard.y+Math.sin(a)*(hazard.radius+4),3,"#ffe0b0");}
 }
 const swing=recent.findLast(e=>e.kind==="swing"&&state.tick-e.tick<12);
 const actor=()=>{
  if(state.dashTime>0&&!reduced){ctx.save();ctx.globalAlpha=.18;drawSprite(ctx,state.profession,state.x-state.dashX*23,state.y-state.dashY*23,facingFromVector(state.dashX,state.dashY),walkFrame(state.travelled??0));ctx.restore();}
  ctx.save();if(state.invulnerable>0)ctx.globalAlpha=.65;
  const facing=swing?facingFromVector(state.enemyX-state.x,state.enemyY-state.y):facingFromVector(Math.cos(state.facing),Math.sin(state.facing));
  drawSprite(ctx,state.profession,state.x,state.y,facing,swing?Math.min(5,Math.floor((state.tick-swing.tick)/2)):state.tick-(state.lastMoveTick??-10)<3?walkFrame(state.travelled??0):0,swing?"slash":"walk",tier);ctx.restore();
 };
 const opponent=()=>{ctx.save();if(recent.some(e=>e.kind==="hit"&&state.tick-e.tick<3))ctx.filter="brightness(1.55)";drawSceneryEnemy(ctx,kind,state.enemyX,state.enemyY,Math.floor(state.tick/9)%3);ctx.restore();};
 if(state.y<state.enemyY){actor();opponent();}else{opponent();actor();}
 for(const event of recent){
  const age=(state.tick-event.tick)/18,color=colors[state.profession];ctx.save();ctx.globalAlpha=1-age;
  if(event.kind==="swing"){
   const angle=Math.atan2(state.enemyY-event.y,state.enemyX-event.x),skill=event.value===2;
   ctx.translate(event.x,event.y-18);ctx.rotate(angle);
   if(event.value===1||skill&&["mage","healer","bard"].includes(state.profession)){
    const distance=Math.hypot(state.enemyX-event.x,state.enemyY-event.y),travel=Math.min(1,age*3)*Math.min(345,distance);
    ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(Math.max(8,travel-30),0);ctx.lineTo(travel,0);ctx.stroke();spark(ctx,travel,0,skill?10:5,color);
   }else{
    ctx.strokeStyle=color;ctx.lineCap="round";ctx.lineWidth=skill?5:3;ctx.beginPath();ctx.arc(0,0,skill?62:42,-1.1+age,1.1+age);ctx.stroke();ctx.strokeStyle="#fff6dd";ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,skill?57:38,-.7+age,.8+age);ctx.stroke();
   }
  }else if(event.kind==="hit"){
   ring(ctx,event.x,event.y-24,6+age*27,color,2);
   for(let i=0;i<7;i++){const a=i*Math.PI*2/7+event.id,r=8+age*32;spark(ctx,event.x+Math.cos(a)*r,event.y-25+Math.sin(a)*r,Math.max(1,4*(1-age)),i%2?color:"#fff8df");}
  }else if(event.kind==="heal"){
   ring(ctx,event.x,event.y,15+age*28,"#b2efd2",2);for(let i=0;i<4;i++)spark(ctx,event.x+Math.sin(i*2)*18,event.y-12-age*52-i*4,3,"#b8f6dc");
  }else if(event.kind==="hurt")ring(ctx,event.x,event.y-20,8+age*20,"#ffb198",2);
  else if(event.kind==="win")ring(ctx,event.x,event.y,25+age*110,"#e5d6a6",3);
  ctx.restore();
 }
 ctx.fillStyle=theme==="archive"?"#27315b14":"#173b2e12";ctx.fillRect(-125,-250,850,1275);ctx.restore();
 const shade=ctx.createLinearGradient(0,0,0,height);shade.addColorStop(0,"#0c1a25c4");shade.addColorStop(.2,"#0c1a2500");shade.addColorStop(.65,"#0c1a2500");shade.addColorStop(1,"#0c1a2599");ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
 if(!reduced){ctx.fillStyle=theme==="rift"?"#e4ae7c":"#eee1a9";for(let i=0;i<13;i++){ctx.globalAlpha=.15+Math.sin(time+i)*.08;ctx.fillRect((i*97+Math.sin(time*.2+i)*12)%width,(i*79-time*5+height*20)%height,2,2);}ctx.globalAlpha=1;}
}
