import {groundAt,worldProps,type ZoneId} from "@/lib/world-map";
import {drawScenery,terrainTexture} from "./scenery-art";
const cache = new Map<ZoneId,HTMLCanvasElement>();
const noise=(x:number,y:number)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);};
function ellipse(ctx:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
export function detailedGround(zone:ZoneId){
  const previous=cache.get(zone);if(previous)return previous;
  const canvas=document.createElement("canvas");canvas.width=1200;canvas.height=800;const ctx=canvas.getContext("2d")!;ctx.imageSmoothingEnabled=false;
  const patterns=new Map<string,CanvasPattern>();for(const kind of ["grass","stone","dirt","wood"] as const){const texture=terrainTexture(kind);if(texture)patterns.set(kind,ctx.createPattern(texture,"repeat")!);}
  const fill=(kind:string)=>patterns.get(kind)??({grass:"#43503b",stone:"#7c7d6c",dirt:"#665c45",wood:"#69503c"}[kind]??"#304b48");
  ctx.fillStyle=zone==="library"?"#111b20":fill("grass");ctx.fillRect(0,0,1200,800);
  if(zone==="library"){
    ctx.fillStyle=fill("wood");ctx.fillRect(224,208,768,528);
    ctx.fillStyle="#222e2d";ctx.fillRect(224,112,768,112);
    for(let y=128;y<224;y+=16)for(let x=224-(y%32?16:0);x<992;x+=32){ctx.fillStyle=`hsl(155 9% ${23+noise(x,y)*9}%)`;ctx.fillRect(x+1,y+1,30,14);ctx.fillStyle="#92a18a26";ctx.fillRect(x+2,y+1,29,1);}
    for(const x of [362,600,838])drawScenery(ctx,"window",x-48,211,96,125);
    ctx.fillStyle="#272925";ctx.fillRect(224,216,768,8);ctx.fillRect(224,216,10,520);ctx.fillRect(982,216,10,520);
    ctx.fillStyle="#355353";ctx.fillRect(486,508,228,204);ctx.strokeStyle="#a68e5e";ctx.lineWidth=2;ctx.strokeRect(494,516,212,188);ctx.strokeRect(500,522,200,176);
    for(let i=0;i<24;i++){ctx.fillStyle="#b09a6c";ctx.fillRect(490+i*9,506,2,5);ctx.fillRect(490+i*9,712,2,5);}
    ctx.save();ctx.translate(600,605);ctx.scale(1,.7);ctx.strokeStyle="#b6a47b66";ctx.beginPath();for(let i=0;i<12;i++){const a=i*Math.PI/6,r=i%2?20:43;ctx.lineTo(Math.sin(a)*r,Math.cos(a)*r);}ctx.closePath();ctx.stroke();ctx.restore();
  }else{
    // Small irregular edge samples blend paths into turf instead of exposing a tile grid.
    for(let y=0;y<800;y+=8)for(let x=0;x<1200;x+=8){
      const n=noise(x,y),kind=groundAt({x:x+4,y:y+4},zone);
      if(kind==="grass")continue;
      if(kind==="water"||kind==="bridge")continue;
      ctx.fillStyle=fill(kind);ctx.fillRect(x,y,8,8);
      if(groundAt({x:x-4,y:y+4},zone)==="grass"||groundAt({x:x+12,y:y+4},zone)==="grass"||groundAt({x:x+4,y:y-4},zone)==="grass"||groundAt({x:x+4,y:y+12},zone)==="grass"){
        ctx.globalAlpha=.55;ctx.fillStyle=fill("grass");ctx.fillRect(x+n*4,y,2+n*3,8);ctx.globalAlpha=1;
      }
    }
    if(zone==="town"){
      ctx.fillStyle=fill("stone");for(const [x,y,w,h]of [[192,288,64,96],[576,208,64,96],[896,288,64,96],[272,640,160,64],[816,640,128,64],[800,448,352,64]])ctx.fillRect(x,y,w,h);
      // Inlaid plaza compass; restrained contrast leaves the playable silhouettes readable.
      ctx.save();ctx.translate(614,515);ctx.scale(1,.75);ctx.strokeStyle="#d6ca9c88";ctx.lineWidth=2;
      for(const r of [92,100,122]){ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();}
      for(let i=0;i<16;i++){const a=i*Math.PI/8;ctx.beginPath();ctx.moveTo(Math.cos(a)*102,Math.sin(a)*102);ctx.lineTo(Math.cos(a)*119,Math.sin(a)*119);ctx.stroke();}
      ctx.fillStyle="#e0d2a97d";ctx.beginPath();for(let i=0;i<16;i++){const a=i*Math.PI/8,r=i%2?13:i%4===0?68:40;ctx.lineTo(Math.sin(a)*r,Math.cos(a)*r);}ctx.closePath();ctx.fill();ctx.restore();
      // Shallow garden borders, only around existing planted footprints.
      for(const prop of worldProps.town.filter(p=>p.kind==="house"||p.kind==="tower")){ellipse(ctx,prop.x+(prop.width??160)/2,prop.y-6,(prop.width??160)/2+14,24,"#182a2445");}
    }else{
      const water=ctx.createLinearGradient(544,0,672,0);water.addColorStop(0,"#254c49");water.addColorStop(.35,"#377776");water.addColorStop(.7,"#326967");water.addColorStop(1,"#1d4544");ctx.fillStyle=water;ctx.fillRect(544,0,128,800);
      for(let y=0;y<800;y+=5){const n=noise(1,y);ctx.fillStyle="#9bc5b51c";ctx.fillRect(548+n*85,y,7+n*26,1);}
      for(const x of [538,672])for(let y=0;y<800;y+=14){if(y>408&&y<516)continue;ctx.fillStyle="#3b4938";ctx.fillRect(x-3,y,11,13);ctx.fillStyle="#a2a08766";ctx.fillRect(x-2,y,9,3);ctx.fillStyle="#648054";ctx.fillRect(x-5,y+10,8,5);}
      ctx.fillStyle="#192c2d88";ctx.fillRect(537,420,143,104);
      for(let x=536;x<680;x+=9){ctx.fillStyle=`hsl(32 26% ${34+noise(x,4)*15}%)`;ctx.fillRect(x,416,8,96);ctx.fillStyle="#d0b58566";ctx.fillRect(x,417,2,94);ctx.fillStyle="#3d392d";ctx.fillRect(x+4,428,2,2);ctx.fillRect(x+4,499,2,2);}
      // Rails stay outside the engine's passable y=424..504 corridor.
      for(const y of [414,513]){ctx.fillStyle="#3b3d30";ctx.fillRect(534,y,147,4);ctx.fillStyle="#ae9b6b";ctx.fillRect(534,y,147,1);for(const x of [536,571,645,676]){ctx.fillStyle="#66583c";ctx.fillRect(x,y-12,5,15);ctx.fillStyle="#c2a979";ctx.fillRect(x-1,y-14,7,3);}}
    }
    // Flowers, ground cover and leaf litter are traversable decals, not hidden obstacles.
    for(let i=0;i<1000;i++){const x=Math.floor(noise(i,1)*1200),y=Math.floor(noise(i,2)*800);if(groundAt({x,y},zone)!=="grass")continue;
      ctx.fillStyle=i%9===0?"#b2a47577":"#27433555";ctx.fillRect(x,y,2+i%3,1);if(i%13===0){ctx.fillStyle="#c7c5a899";ctx.fillRect(x+1,y-2,2,2);ctx.fillStyle="#7e9882";ctx.fillRect(x,y,1,3);}
    }
  }
  // Contact and directional foliage shadows belong on the ground, beneath every actor.
  for(const prop of worldProps[zone]){
    if(prop.kind==="tree"||prop.kind==="pine"){
      for(let i=0;i<9;i++)ellipse(ctx,prop.x+18+noise(i,prop.x)*60,prop.y+12+noise(i,prop.y)*30,12+noise(i,5)*14,6+noise(i,4)*8,"#122e2426");
      ellipse(ctx,prop.x,prop.y-2,18,7,"#10231e66");
    }else if(prop.kind!=="house"&&prop.kind!=="tower")ellipse(ctx,prop.x+(prop.width??0)/2+8,prop.y-2,(prop.width??48)/2,8,"#17282345");
  }
  ctx.fillStyle=zone==="library"?"#26303016":"#374c4530";ctx.fillRect(0,0,1200,800);
  cache.set(zone,canvas);return canvas;
}
