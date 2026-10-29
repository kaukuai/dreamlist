/** One world-space definition drives rendered objects, foot collisions and navigation. */
export type ZoneId = "town" | "woods" | "library";
export type WorldPoint = {x: number; y: number};
export type WorldProp = WorldPoint & {id: string; kind: "house" | "tower" | "tree" | "pine" | "fountain" | "shelf" | "table" | "ruin" | "barrel" | "fire" | "bench" | "planter" | "lamp"; width?: number; height?: number; title?: string};
export const zoneInfo = {
  town: {name: "晨鐘鎮", subtitle: "暮光廣場", description: "鐘樓、書庫與林間的岔路", spawn: {x: 580, y: 605}},
  woods: {name: "月痕林", subtitle: "溪橋古道", description: "越過溪橋，尋找舊鐘亭留下的三段記錄", spawn: {x: 144, y: 480}},
  library: {name: "星頁書庫", subtitle: "一樓閱覽室", description: "在書架之間，拼回晨鐘鎮的過去", spawn: {x: 600, y: 650}},
} as const;
export const validZone = (value: unknown): value is ZoneId => typeof value === "string" && value in zoneInfo;
const trees = (zone: string, points: number[][], pine = false): WorldProp[] => points.map(([x, y], i) => ({id: `${zone}-tree-${i}`, kind: pine ? "pine" : "tree", x, y}));
export const worldProps: Record<ZoneId, WorldProp[]> = {
 town: [
  {id:"bookhouse",kind:"house",x:128,y:310,width:192,height:224,title:"星頁書庫"},
  {id:"belltower",kind:"tower",x:520,y:210,width:160,height:208,title:"晨鐘樓"},
  {id:"workshop",kind:"house",x:864,y:288,width:192,height:208,title:"木光工坊"},
  {id:"clinic",kind:"house",x:128,y:704,width:160,height:192,title:"薄荷小屋"},
  {id:"inn",kind:"house",x:896,y:720,width:192,height:192,title:"晚風旅舍"},
  {id:"fountain",kind:"fountain",x:600,y:378},
  {id:"plaza-bench-west",kind:"bench",x:424,y:560,width:64},
  {id:"plaza-bench-east",kind:"bench",x:728,y:560,width:64},
  {id:"plaza-flowers-west",kind:"planter",x:464,y:656,width:64},
  {id:"plaza-flowers-east",kind:"planter",x:728,y:656,width:64},
  {id:"work-barrel",kind:"barrel",x:1072,y:320},
  ...[[427,336],[807,336],[441,635],[793,635],[1024,478]].map(([x,y],i)=>({id:`town-lamp-${i}`,kind:"lamp" as const,x,y})),
  ...trees("town",[[82,200],[390,192],[812,176],[1134,208],[102,432],[296,464],[812,536],[932,536],[1134,590],[336,738],[80,736],[780,752],[1136,744]])
 ],
 woods: [
  ...trees("woods",[[88,176],[192,144],[336,208],[464,144],[728,160],[864,144],[1056,144],[1144,240],[184,336],[400,368],[760,336],[976,320],[1112,416],[256,608],[416,656],[760,656],[896,704],[1104,624],[112,752]],true),
  {id:"old-belfry",kind:"ruin",x:944,y:560,width:144,height:144,title:"舊鐘亭"},
  {id:"trail-fire",kind:"fire",x:336,y:512},
  {id:"fallen-crate",kind:"barrel",x:464,y:560},
 ],
 library: [
  ...[288,480,672,864].map((x,i)=>({id:`shelf-${i}`,kind:"shelf" as const,x,y:240,width:128,height:96})),
  {id:"shelf-west",kind:"shelf",x:288,y:416,width:128,height:96},
  {id:"shelf-east",kind:"shelf",x:864,y:416,width:128,height:96},
  {id:"reading-table",kind:"table",x:560,y:496,width:144,height:80},
  {id:"reading-table-2",kind:"table",x:768,y:624,width:96,height:80},
 ],
};
export function solidProp(prop: WorldProp, p: WorldPoint) {
 const {x,y,kind}=prop;
 if(kind==="tree"||kind==="pine") return Math.abs(p.x-x)<12 && Math.abs(p.y-y+5)<12;
 if(kind==="lamp") return Math.abs(p.x-x)<7 && Math.abs(p.y-y)<7;
 if(kind==="fountain") return Math.hypot((p.x-x)/1.15,p.y-(y-43))<43;
 if(kind==="barrel"||kind==="fire") return Math.abs(p.x-x)<16 && Math.abs(p.y-y+10)<16;
 const width=prop.width??96;
 return p.x>x-7 && p.x<x+width+7 && p.y>y-(kind==="house"||kind==="tower"?64:kind==="ruin"?35:36)-7 && p.y<y+7;
}
export function worldWalkable(p: WorldPoint, zone: ZoneId = "town") {
 const inside=zone==="library" ? p.x>=246&&p.x<=954&&p.y>=250&&p.y<=704 : p.x>=48&&p.x<=1152&&p.y>=64&&p.y<=752;
 if(!inside)return false;
 if(zone==="woods" && p.x>=544&&p.x<672 && !(p.y>=424&&p.y<=504))return false;
 return !worldProps[zone].some(prop=>solidProp(prop,p));
}
export function groundAt(p: WorldPoint, zone: ZoneId): "stone"|"dirt"|"grass"|"water"|"wood"|"bridge" {
 if(zone==="library")return "wood";
 if(zone==="woods"){
  if(p.x>=544&&p.x<672)return p.y>=416&&p.y<512?"bridge":"water";
  return Math.abs(p.y-480)<55 || p.x>832&&p.y>400&&p.y<600?"dirt":"grass";
 }
 return p.x>=432&&p.x<816&&p.y>=256&&p.y<704 || p.x>=192&&p.x<1088&&p.y>=352&&p.y<416?"stone":"grass";
}
export const fieldNotes: Record<string,{title:string; text:string; zone:ZoneId}> = {
 "town-notice":{zone:"town",title:"巡路告示",text:"西邊的星頁書庫保存著晨鐘鎮的舊圖。東邊的月痕林有一座廢棄鐘亭。艾菈說，先沿溪走，再從木橋過去；別急著找終點，路上的字跡也會指路。"},
 "town-letter":{zone:"town",title:"沒有寄出的信",text:"洛恩：鐘聲停下的那天，我第一次注意到每個人走路的聲音。你守住的不是一座鐘樓，而是那些還願意踏出門的人。——旅舍櫃檯下的字條"},
 "library-history":{zone:"library",title:"鎮誌・晨鐘的約定",text:"最初的鐘並不報時。旅人每學會一件事，就把自己的故事留在書庫；守鐘人便敲一下鐘，告訴遠方的人：這裡又有人前進了一步。後來，人們只記得時間，忘了鐘為誰而響。"},
 "library-margin":{zone:"library",title:"書頁邊的三個符號",text:"一片低垂的葉，一顆仰望的星，一條回到心口的線。賽琳把它們抄在頁邊：低吟、仰望、歸心。林中舊鐘亭的石碑上，也刻著相同的筆畫。"},
 "woods-page-1":{zone:"woods",title:"巡林手記・一",text:"過橋之前，先停下來聽水聲。舊鐘亭不接受命令，只接受記憶。第一段記憶留在營火旁：有人在這裡第一次學會休息。"},
 "woods-page-2":{zone:"woods",title:"巡林手記・二",text:"橋上的刻痕都是往返的人留下的。第二段記憶是回來：改變方向，不會抹去已經走過的路。艾菈在字旁畫了一枚小小的箭頭。"},
 "woods-page-3":{zone:"woods",title:"巡林手記・三",text:"最後一頁沒有寫答案。守鐘人只留下：把三段記錄帶到舊鐘亭吧。如果你還願意開始，鐘就沒有真正沉默。"},
 "grove-restored":{zone:"woods",title:"舊鐘亭的回應",text:"三段字跡在石碑上接起來。沒有催促，也沒有倒數；只是很輕的一聲，像有人對你的旅程說：我聽見了。月痕林的鐘亭重新亮起。"},
};
export function sortByFeet<T extends {y:number}>(items:readonly T[]):T[]{return [...items].sort((a,b)=>a.y-b.y);}
export function followCamera(camera:WorldPoint,player:WorldPoint,view:{width:number;height:number;zoom:number},dt:number):WorldPoint{
 const w=view.width/view.zoom,h=view.height/view.zoom,px=player.x-camera.x,py=player.y-camera.y;
 let x=camera.x,y=camera.y;
 if(px<w*.36)x=player.x-w*.36;else if(px>w*.64)x=player.x-w*.64;
 if(py<h*.36)y=player.y-h*.36;else if(py>h*.6)y=player.y-h*.6;
 const amount=Math.min(1,Math.max(0,dt)*14);
 return {x:Math.max(0,Math.min(Math.max(0,1200-w),camera.x+(x-camera.x)*amount)),y:Math.max(0,Math.min(Math.max(0,800-h),camera.y+(y-camera.y)*amount))};
}
