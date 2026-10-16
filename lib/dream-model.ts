export type Task = { id:string; title:string; done:boolean; completedAt:string|null };
export type Dream = { id:string; revision?:number; title:string; description:string; category:string; targetDate:string; createdAt:string; tasks:Task[] };
export const categories=[{id:"travel",label:"探索世界",color:"#7bb6ff"},{id:"growth",label:"自我成長",color:"#b7a0ff"},{id:"health",label:"健康生活",color:"#68dfb4"},{id:"career",label:"職涯與創作",color:"#ffa875"},{id:"life",label:"理想生活",color:"#ff94bd"},{id:"other",label:"其他夢想",color:"#e5d07c"}];
export const categoryOf=(id:string)=>categories.find(c=>c.id===id)??categories[5];
export const progressOf=(d:Dream)=>d.tasks.length?Math.round(d.tasks.filter(t=>t.done).length/d.tasks.length*100):0;
export const isComplete=(d:Dream)=>d.tasks.length>0&&d.tasks.every(t=>t.done);
export const inspirations:Dream[]=[
{id:"idea-travel",title:"看一次真正的極光",description:"站在世界的另一端，抬頭看見滿天流動的光。",category:"travel",targetDate:"",createdAt:"",tasks:["認識適合看極光的國家與季節","訂出旅行預算與儲蓄計畫","規劃行程與住宿","出發，收集屬於自己的那片光"].map((title,i)=>({id:"it"+i,title,done:false,completedAt:null}))},
{id:"idea-growth",title:"學會用吉他說故事",description:"從第一個和弦，到彈唱一首自己喜歡的歌。",category:"growth",targetDate:"",createdAt:"",tasks:["準備一把適合自己的吉他","練熟四個基礎和弦","每天練習 15 分鐘","完整彈唱一首喜歡的歌曲"].map((title,i)=>({id:"ig"+i,title,done:false,completedAt:null}))},
{id:"idea-health",title:"跑完人生第一場半馬",description:"不必跑得比誰快，只要比昨天的自己多走一步。",category:"health",targetDate:"",createdAt:"",tasks:["建立每週三次的跑步習慣","輕鬆跑完 5 公里","完成一次 10 公里練習","報名並完成半馬"].map((title,i)=>({id:"ih"+i,title,done:false,completedAt:null}))}
];
export function getStats(dreams:Dream[]){const completed=dreams.flatMap(d=>d.tasks).filter(t=>t.done).length;const total=dreams.reduce((n,d)=>n+d.tasks.length,0);const fulfilled=dreams.filter(isComplete).length;const xp=completed*25+fulfilled*100;return {completed,total,fulfilled,xp,level:Math.floor(xp/200)+1,levelXp:xp%200,progress:total?Math.round(completed/total*100):0};}

