import {worldProps} from "@/lib/world-map";
import type {WorldFrame} from "./world-renderer";
function glow(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color:string){const light=ctx.createRadialGradient(x,y,0,x,y,r);light.addColorStop(0,color);light.addColorStop(1,"transparent");ctx.fillStyle=light;ctx.fillRect(x-r,y-r,r*2,r*2);}
export function paintWorldLights(ctx:CanvasRenderingContext2D,state:WorldFrame){
 const t=state.reducedMotion?0:state.time;
 ctx.save();ctx.globalCompositeOperation="screen";
 if(state.zone==="town"){
  for(const prop of worldProps.town.filter(p=>p.kind==="lamp")){glow(ctx,prop.x+10,prop.y-60,54,"#ffd78927");glow(ctx,prop.x+10,prop.y-4,38,"#e8c47717");}
  for(let i=0;i<12;i++){const phase=(t/50+i*9)%36;ctx.fillStyle="#d0f1e775";ctx.fillRect(578+i%5*10,307+phase,1,2);}
 }else if(state.zone==="library"){
  for(const x of [362,600,838]){
   const beam=ctx.createLinearGradient(x,210,x+70,440);beam.addColorStop(0,"#cbe3c327");beam.addColorStop(1,"transparent");ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(x-21,210);ctx.lineTo(x+21,210);ctx.lineTo(x+128,465);ctx.lineTo(x+36,465);ctx.closePath();ctx.fill();glow(ctx,x,180,70,"#f0c98120");
  }
  glow(ctx,618,450,85,"#edb97b1e");
 }else{
  glow(ctx,336,492,65,"#f7b66f25");
  if(state.discovered.includes("grove-restored"))glow(ctx,1016,512,115,"#9be8c92d");
  ctx.fillStyle="#b5e3d448";for(let i=0;i<20;i++){const y=(i*43+t/75)%800;if(y>410&&y<520)continue;ctx.fillRect(557+i%5*19,y,8+i%4*3,1);}
 }
 ctx.restore();
}
export function paintAtmosphere(ctx:CanvasRenderingContext2D,width:number,height:number,state:WorldFrame){
 ctx.save();
 const shade=ctx.createRadialGradient(width*.47,height*.4,Math.min(width,height)*.22,width*.5,height*.5,Math.max(width,height)*.72);
 shade.addColorStop(0,"transparent");shade.addColorStop(.65,"#101e2220");shade.addColorStop(1,"#0b18275c");ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
 if(!state.reducedMotion){
  const time=state.time/1000;
  for(let i=0;i<22;i++){
   const wx=(i*191+Math.sin(time*.16+i)*12)%1200,wy=(i*73-time*(state.zone==="library"?2:4)+8000)%800;
   const x=(wx-state.camera.x)*state.zoom,y=(wy-state.camera.y)*state.zoom;
   if(x<0||x>width||y<0||y>height)continue;
   ctx.globalAlpha=.15+.25*(Math.sin(time*.7+i)*.5+.5);ctx.fillStyle=state.zone==="woods"?"#e4ebb6":"#ffebbe";ctx.fillRect(x,y,2,2);
  }
 }
 ctx.restore();
}
