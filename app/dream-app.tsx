"use client";
import {useState,useEffect,useLayoutEffect,useRef,useCallback,type FormEvent} from "react";
import {flushSync} from "react-dom";
import {appFetch} from "@/lib/client-api";
import {browserPreview} from "@/lib/app-mode";
import {Sparkles,Trophy,Plus,Compass,Globe2,BookOpen,Heart,BriefcaseBusiness,House,Star,Zap,Target,Pencil,X,Check,LoaderCircle,CloudCheck,LockKeyhole,CalendarDays,Milestone,Leaf,UserRound,Swords,Shield,Menu,Settings2,ScrollText} from "lucide-react";
import {Progress} from "@/components/ui/progress";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogClose} from "@/components/ui/dialog";
import {Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription,SheetClose} from "@/components/ui/sheet";
import {Tabs,TabsList,TabsTrigger,TabsContent} from "@/components/ui/tabs";
import {RadioGroup,RadioGroupItem} from "@/components/ui/radio-group";
import {Checkbox} from "@/components/ui/checkbox";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Toaster} from "@/components/ui/sonner";
import {toast} from "sonner";
import IslandGame,{BuildingSprite} from "./island-game";
import CharacterJourney,{type CharacterPanel} from "./character-journey";
import QuestBoard from "./quest-board";
import AdventureWorld from "./adventure-world";
import {npcOf} from "@/lib/quest-model";
import {defaultTraining,skills,skillOf,jobTitle,type CharacterState,type Profession,type SkillId} from "@/lib/character-model";
import {type IslandState,buildings} from "@/lib/island-model";
import {categoryOf,categories,inspirations,type Dream,type Task,getStats,progressOf,isComplete} from "@/lib/dream-model";
const categoryIcons={travel:Globe2,growth:BookOpen,health:Heart,career:BriefcaseBusiness,life:House,other:Star};
function CategoryIcon({category,size=22}:{category:string;size?:number}){const Icon=categoryIcons[category as keyof typeof categoryIcons]??Star;return <Icon size={size} strokeWidth={1.7}/>;}
type Draft={id?:string;revision?:number;title:string;description:string;category:string;targetDate:string;tasks:Task[]};
const blankDraft=():Draft=>({title:"",description:"",category:"growth",targetDate:"",tasks:[]});


const newTask=(title:string,category="growth"):Task=>({id:crypto.randomUUID(),title,done:false,completedAt:null,training:defaultTraining(category)});
const dateLabel=(value:string)=>value?new Date(value+"T00:00:00").toLocaleDateString("zh-TW",{year:"numeric",month:"short",day:"numeric"}):"不限時間，持續靠近";
async function request<T>(url:string,options?:RequestInit):Promise<T>{
 const response=await appFetch(url,{...options,headers:{"Content-Type":"application/json",...options?.headers}});
 const data=await response.json() as T & {error?:string};
 if(!response.ok)throw new Error(data.error??"目前無法儲存，請稍後重試");
 return data as T;
}
export default function DreamApp(){
 const [dreams,setDreams]=useState<Dream[]>([]);
 const [view,setView]=useState("quests");
 const [more,setMore]=useState(false);
 const [filter,setFilter]=useState("all");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const busyRef=useRef(false);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [editor,setEditor]=useState(false);
 const [draft,setDraft]=useState<Draft>(blankDraft);
 const [draftTask,setDraftTask]=useState("");
 const [taskInput,setTaskInput]=useState("");
 const [editingTask,setEditingTask]=useState<string|null>(null);
 const [taskText,setTaskText]=useState("");

 const [celebration,setCelebration]=useState(0);
 const [island,setIsland]=useState<IslandState|null>(null);
 const [character,setCharacter]=useState<CharacterState|null>(null);
 const characterRef=useRef(character);useLayoutEffect(()=>{characterRef.current=character;},[character]);
 const islandRef=useRef(island);useLayoutEffect(()=>{islandRef.current=island;},[island]);
 const dreamsRef=useRef(dreams);
 useLayoutEffect(()=>{dreamsRef.current=dreams;},[dreams]);
 const actionsRef=useRef<{start:(d?:Dream)=>void;select:(id:string)=>void;toggle:(dream:Dream,task:Task,done:boolean)=>Promise<Dream|undefined>}|null>(null);
 const stats=getStats(dreams);
 const selected=dreams.find(d=>d.id===selectedId);
 const achievements=[
  {id:"first-dream",Icon:Star,title:"旅程啟程",text:"建立目標或接下第一份委託",value:dreams.length,max:1},
  {id:"first-step",Icon:Compass,title:"跨出第一步",text:"完成第一個小目標",value:island?.steps??stats.completed,max:1},
  {id:"five-steps",Icon:Milestone,title:"步步前進",text:"完成 5 個小目標",value:island?.steps??stats.completed,max:5},
  {id:"one-dream",Icon:Trophy,title:"夢想成真",text:"完整達成一個目標或委託",value:island?.dreamsFulfilled??stats.fulfilled,max:1},
  {id:"ten-steps",Icon:Zap,title:"持續前行",text:"完成 10 個小目標",value:island?.steps??stats.completed,max:10},
  {id:"colorful-life",Icon:Globe2,title:"多彩人生",text:"探索 6 種不同類型的夢想",value:new Set(dreams.map(d=>d.category)).size,max:6}
 ];
 const unlocked=achievements.filter(a=>a.value>=a.max).length;
 const load=useCallback(()=>Promise.all([request<{dreams:Dream[]}>("/api/dreams"),request<{island:IslandState}>("/api/island"),request<{character:CharacterState}>("/api/character")])
  .then(([data,world,adventurer])=>{setDreams(data.dreams);setIsland(world.island);setCharacter(adventurer.character);setError("");})
  .catch((e:unknown)=>setError(e instanceof Error?e.message:"暫時無法載入任務"))
  .finally(()=>setLoading(false)),[]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{if(!browserPreview)return;const refresh=(event:StorageEvent)=>{if(event.key==="dreamlist:browser-preview:v1")void load();};window.addEventListener("storage",refresh);return()=>window.removeEventListener("storage",refresh);},[load]);
 useEffect(()=>{if(!celebration)return;const timer=setTimeout(()=>setCelebration(0),2200);return()=>clearTimeout(timer);},[celebration]);
 function changeView(next:string){setView(next);setFilter("all");setMore(false);window.scrollTo({top:0,behavior:"instant"});}
 function start(d?:Dream){
  setDraft(d?{id:d.id.startsWith("idea-")?undefined:d.id,revision:d.revision,title:d.title,description:d.description,category:d.category,targetDate:d.targetDate,tasks:d.tasks.map(t=>({...t,id:d.id.startsWith("idea-")?crypto.randomUUID():t.id}))}:blankDraft());
  setDraftTask("");setEditor(true);
 }
 function select(d:Dream){if(d.id.startsWith("idea-")){start(d);return;}setTaskInput("");setEditingTask(null);setSelectedId(d.id);}
 function startTraining(path:Profession){const primary=path.training[0];start({id:'idea-training-'+path.id,title:path.name+' · 基礎修練',description:path.id==='wanderer'?'從生活裡的小練習，累積屬於自己的成長。':path.description,category:({fitness:'health',craft:'career',exploration:'travel',mindfulness:'life'} as Record<string,string>)[primary]??'growth',targetDate:'',createdAt:'',tasks:path.training.flatMap(id=>skillOf(id)!.examples.map(title=>({...newTask(title),training:id})))});}
 function lock(){if(busyRef.current)return false;busyRef.current=true;setBusy(true);return true;}
 function unlock(){busyRef.current=false;setBusy(false);}
 async function save(data:Draft):Promise<Dream>{
  const result=await request<{dream:Dream;island?:IslandState;character?:CharacterState}>(data.id?"/api/dreams/"+encodeURIComponent(data.id):"/api/dreams",{method:data.id?"PUT":"POST",body:JSON.stringify(data)});
  flushSync(()=>{setDreams(current=>data.id?current.map(d=>d.id===data.id?result.dream:d):[result.dream,...current]);if(result.island)setIsland(result.island);if(result.character)setCharacter(result.character);});
  return result.dream;
 }
 async function acceptQuest(offerId:string):Promise<Dream|undefined>{
  if(!lock())return;
  try{const result=await request<{dream:Dream;created:boolean}>("/api/quests",{method:"POST",body:JSON.stringify({offerId})});flushSync(()=>setDreams(current=>current.some(dream=>dream.id===result.dream.id)?current.map(dream=>dream.id===result.dream.id?result.dream:dream):[result.dream,...current]));toast.success(result.created?"已接下委託":"這份委託已在旅途中",{description:"可以依自己的節奏完成，跨日仍會保留。"});return result.dream;}
  catch(e){toast.error(e instanceof Error?e.message:"暫時無法接取委託");}
  finally{unlock();}
 }
 async function saveEditor(event:FormEvent){
  event.preventDefault();if(!lock())return;
  const data={...draft,tasks:draftTask.trim()?[...draft.tasks,newTask(draftTask.trim(),draft.category)]:draft.tasks};
  if(data.tasks.some(t=>!t.title.trim())){toast.error("每個小目標都需要一個名稱");unlock();return;}
  try{const result=await save(data);setEditor(false);setSelectedId(result.id);setTaskInput("");setEditingTask(null);toast.success(draft.id?"夢想已更新":"新的夢想已啟航！",{description:draft.id?"你的未來，可以隨時重新規劃。":"先完成一小步，就是很棒的開始。"});}
  catch(e){toast.error(e instanceof Error?e.message:"儲存失敗");}
  finally{unlock();}
 }
 async function toggle(dream:Dream,task:Task,done:boolean){
  if(task.done===done)return dream;
  if(!lock())return;
  const beforeIsland=islandRef.current;
  const beforeCharacter=characterRef.current;
  try{
   const result=await save({...dream,tasks:dream.tasks.map(t=>t.id===task.id?{...t,done}:t)});

   if(done){setCelebration(current=>current+1);const gained=(islandRef.current?.earned??0)-(beforeIsland?.earned??0),xp=(characterRef.current?.totalXp??0)-(beforeCharacter?.totalXp??0);toast.success(isComplete(result)?"目標達成，任務完成！":"任務完成，修練持續累積！",{description:((characterRef.current?.level??1)>(beforeCharacter?.level??1)?"角色升級！Lv. "+characterRef.current?.level+" · ":"")+(xp?"+"+xp+" XP · ":"")+(gained?"+"+gained+" 星露 · ":"首次完成獎勵已領取 · ")+task.title});}
   else toast("已改為尚未完成",{description:"夢想進度已調整，已獲得的經驗、技能與星露都會保留。"});
   return result;
  }catch(e){toast.error(e instanceof Error?e.message:"儲存失敗");throw e;}
  finally{unlock();}
 }
 async function addTask(event:FormEvent){
  event.preventDefault();if(!selected||!taskInput.trim()||!lock())return;
  try{await save({...selected,tasks:[...selected.tasks,newTask(taskInput.trim(),selected.category)]});setTaskInput("");toast.success("小目標已加入");}
  catch(e){toast.error(e instanceof Error?e.message:"儲存失敗");}
  finally{unlock();}
 }
 async function saveTaskTitle(event:FormEvent){
  event.preventDefault();if(!selected||!taskText.trim()||!lock())return;
  try{await save({...selected,tasks:selected.tasks.map(t=>t.id===editingTask?{...t,title:taskText.trim()}:t)});setEditingTask(null);toast.success("小目標已更新");}
  catch(e){toast.error(e instanceof Error?e.message:"儲存失敗");}
  finally{unlock();}
 }
 useLayoutEffect(()=>{actionsRef.current={start,select:(id)=>{const d=dreamsRef.current.find(x=>x.id===id);if(!d)throw new Error("夢想不存在");flushSync(()=>select(d));},toggle};});
 useEffect(()=>{
  type Tool={name:string;title:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>unknown};
  const context=(document as Document&{modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
  if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const exactInput=(input:unknown,keys:string[])=>{if(!input||typeof input!=="object"||Array.isArray(input)||Object.keys(input).some(key=>!keys.includes(key)))throw new Error("Invalid tool input");};
  const tools:Tool[]=[
   {name:"list_dreams",title:"讀取夢想與進度",description:"Read the currently loaded dreams, small goals, and actual progress without modifying them.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:input=>{exactInput(input,[]);return{dreams:dreamsRef.current,stats:getStats(dreamsRef.current)};}},
   {name:"start_dream_creation",title:"開啟新增夢想",description:"Open the dream editor. This stages a new dream; it does not save or create any record.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{exactInput(input,[]);flushSync(()=>actionsRef.current?.start());return{editorOpen:true,saved:false};}},
   {name:"open_dream",title:"查看夢想",description:"Open an existing dream and its small goals by dreamId.",inputSchema:{type:"object",properties:{dreamId:{type:"string"}},required:["dreamId"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:input=>{exactInput(input,["dreamId"]);const id=(input as {dreamId?:unknown})?.dreamId;if(typeof id!=="string")throw new Error("dreamId is required");actionsRef.current?.select(id);return{openedDreamId:id};}},
   {name:"set_small_goal_completed",title:"更新小目標完成狀態",description:"Persist a small goal's completed state and update the same visible progress, island growth, currency, and achievements as the checkbox.",inputSchema:{type:"object",properties:{dreamId:{type:"string"},taskId:{type:"string"},completed:{type:"boolean"}},required:["dreamId","taskId","completed"],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:true},execute:async input=>{exactInput(input,["dreamId","taskId","completed"]);const args=input as {dreamId?:unknown;taskId?:unknown;completed?:unknown};if(typeof args?.dreamId!=="string"||typeof args.taskId!=="string"||typeof args.completed!=="boolean")throw new Error("Invalid goal update");const dream=dreamsRef.current.find(d=>d.id===args.dreamId);const task=dream?.tasks.find(t=>t.id===args.taskId);if(!dream||!task)throw new Error("Goal does not exist");const result=await actionsRef.current?.toggle(dream,task,args.completed);if(!result)throw new Error("Another change is being saved; try again");return{dreamId:result.id,taskId:task.id,completed:args.completed,progress:progressOf(result),island:islandRef.current};}}
  ];
  for(const tool of tools){try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
  return()=>lifecycle.abort();
 },[]);
 const visibleDreams=dreams.filter(d=>filter==="active"?!isComplete(d):filter==="complete"?isComplete(d):true);


 async function mutateIsland(data:object){if(!lock())return false;try{const result=await request<{island:IslandState}>('/api/island',{method:'POST',body:JSON.stringify(data)});flushSync(()=>{setIsland(result.island);});toast.success('action' in data&&data.action==='purchase'?'新風景，已在島上落腳。':'小島已保存');return true;}catch(e){toast.error(e instanceof Error?e.message:'小島儲存失敗');return false;}finally{unlock();}}
 async function mutateCharacter(data:object){if(!lock())return false;try{const result=await request<{character:CharacterState;island:IslandState}>('/api/character',{method:'POST',body:JSON.stringify(data)});flushSync(()=>{setCharacter(result.character);setIsland(result.island);});const action=(data as {action?:string}).action;toast.success(action==='advance'?'職業進化！'+jobTitle(result.character.profession,result.character.advancements[result.character.profession]):action==='profession'?'轉職成功 · '+jobTitle(result.character.profession,result.character.advancements[result.character.profession]):action==='talent'?'天賦已點亮':action==='purchase'?'新裝備已加入收藏，可自由穿戴':action==='equip'?'角色裝備已更新':'角色設定已保存');return true;}catch(e){toast.error(e instanceof Error?e.message:'角色儲存失敗');return false;}finally{unlock();}}

 return <div className="rpg-shell" data-view={view}>
 <header className="game-header"><button className="game-brand" onClick={()=>changeView('quests')} aria-label="夢嶼任務大廳"><Swords size={24}/><div><strong>夢嶼</strong><small>REVERIE · LIFE RPG</small></div></button><div className="game-header-actions"><span className="save-state" aria-label={busy?'保存中':error?'保存待恢復':browserPreview?'已保存至此瀏覽器':'已保存'}>{busy?<LoaderCircle size={15} className="spin"/>:browserPreview?<Check size={15}/>:<CloudCheck size={15}/>}</span><div className="currency-pill" aria-label={'星露餘額 '+(island?.balance??0)}><Sparkles size={15}/><strong>{island?.balance??'—'}</strong></div><button className="rpg-icon-button" aria-label="更多選單" onClick={()=>setMore(true)}><Menu size={23}/></button></div></header>
 {browserPreview&&<div className="preview-mode-note"><strong>開發試玩版</strong><span>免登入 · 進度只存於此瀏覽器</span></div>}
 <nav className="game-nav" aria-label="主要導覽">{[{id:'quests',name:'任務',Icon:BookOpen},{id:'character',name:'角色',Icon:UserRound},{id:'equipment',name:'裝備',Icon:Shield},{id:'talents',name:'天賦',Icon:Star},{id:'professions',name:'職業',Icon:Swords}].map(item=><button key={item.id} aria-label={item.name} aria-pressed={view===item.id} className={view===item.id?'current':''} onClick={()=>changeView(item.id)}><item.Icon aria-hidden="true"/><span>{item.name}</span>{item.id==='talents'&&!!character?.availableTalentPoints&&<i aria-hidden="true">{character.availableTalentPoints}</i>}</button>)}</nav>
 {error&&<div className="error-banner" role="alert"><p>{error}</p><button onClick={()=>void load()}>重新載入</button></div>}
 {view==='world'&&browserPreview?<AdventureWorld character={character} progressStamp={dreams.map(d=>d.id+':'+d.revision).join('|')+':'+character?.totalXp} onRefresh={load} onQuest={id=>setSelectedId(id)} onExit={()=>changeView('quests')}/>:view==='quests'?<QuestBoard dreams={dreams} character={character} loading={loading} busy={busy} onStart={()=>start()} onSelect={select} onToggle={(d,t,done)=>void toggle(d,t,done).catch(()=>{})} onCharacter={()=>changeView('character')} onProfessions={()=>changeView('professions')} onAccept={acceptQuest} onAdventure={browserPreview?()=>changeView('world'):undefined}/>:['character','equipment','professions','talents','skills','leaderboard','settings'].includes(view)?<CharacterJourney panel={view as CharacterPanel} character={character} island={island} busy={busy} loading={loading} onMutation={mutateCharacter} onTrain={startTraining} onNavigate={changeView}/>:view==='camp'?<IslandGame island={island} character={character} onCharacter={()=>changeView('character')} dreams={dreams} busy={busy} loading={loading} celebration={celebration} onStart={()=>start()} onSelect={select} onToggle={(d,t,done)=>void toggle(d,t,done).catch(()=>{})} onMutation={mutateIsland} onJournal={()=>changeView('journal')}/>:<main className="journal-page">
 <div className="page-intro"><div><span className="small-caps">{view==='journal'?'THE DREAM JOURNAL':'MILESTONES & MEMORIES'}</span><h1>{view==='journal'?'夢想，一步步實現。':'每一步，都值得慶祝。'}</h1><p>{view==='journal'?'寫下夢想，把它拆成小步驟。每次完成，都會讓小島更豐盛。':'每一枚成就，都來自你真正完成的小目標。'}</p></div><div className="journal-summary"><strong>{view==='journal'?stats.progress:unlocked}<small>{view==='journal'?'%':' / 6'}</small></strong><span>{view==='journal'?'人生目標總進度':'成就已解鎖'}</span></div></div>
 {view==='achievements'?<><section className="achievement-grid">{achievements.map(({id,Icon,title,text,value,max},i)=><div className={'achievement-card '+(value>=max?'unlocked':'locked')} key={id}><div className="achievement-icon"><Icon size={30}/>{value<max&&<LockKeyhole size={14} className="badge-lock"/>}</div><span className="small-caps">MILESTONE 0{i+1}</span><h3>{title}</h3><p>{text}</p><Progress value={Math.min(value/max*100,100)} aria-label={title+'進度'}/><small>{Math.min(value,max)} / {max} · {value>=max?'已達成':'旅程繼續中'}</small></div>)}</section><section className="island-collection"><div><span className="small-caps">YOUR LITTLE COLLECTION</span><h2>島上的收藏</h2><p>努力換來的風景，都留在這裡。</p></div><div className="collection-grid">{buildings.map(b=><div className={island?.items.some(i=>i.kind===b.id)?'collected':''} key={b.id}><BuildingSprite index={b.sprite}/><span>{b.name}</span><small>{island?.items.some(i=>i.kind===b.id)?'已收藏':'尚未建造'}</small></div>)}</div></section></>:<>
 {loading?<div className="loading-panel" role="status"><LoaderCircle className="spin"/>正在打開夢想旅誌…</div>:dreams.length?<Tabs value={filter} onValueChange={setFilter}><TabsList className="dream-tab-list"><TabsTrigger value="all">全部 {dreams.length}</TabsTrigger><TabsTrigger value="active">追夢中 {dreams.length-stats.fulfilled}</TabsTrigger><TabsTrigger value="complete">已實現 {stats.fulfilled}</TabsTrigger></TabsList><TabsContent value={filter}><section className="dream-grid">{visibleDreams.map((d,i)=><button key={d.id} className={'dream-card '+(isComplete(d)?'complete-card':'')} onClick={()=>select(d)}><div className="dream-top"><span className="dream-index">CHAPTER {String(i+1).padStart(2,'0')}</span><CategoryIcon category={d.category}/></div><span className="category-label">{categoryOf(d.category).label}</span><h3>{d.title}</h3><p>{d.description||'這個夢想的故事，從下一個小目標開始。'}</p><div className="card-progress"><div><span>{isComplete(d)?'夢想已實現':'正在靠近'}</span><strong>{progressOf(d)}%</strong></div><Progress value={progressOf(d)} aria-label={d.title+'進度'}/></div><div className="dream-bottom"><span>{d.tasks.filter(t=>t.done).length} / {d.tasks.length} 小目標</span><span>{d.targetDate?dateLabel(d.targetDate):'慢慢靠近'}</span></div></button>)}</section>{!visibleDreams.length&&<div className="empty-panel"><Compass size={30}/><h3>這一章，等待新的故事。</h3><p>完成整個夢想後，就會出現在「已實現」。</p></div>}</TabsContent></Tabs>:<><div className="inspiration-heading"><Sparkles size={17}/><span>還沒有夢想？從一點靈感開始。</span><small>下列為示例，選取後可以自由修改</small></div><section className="dream-grid">{inspirations.map((d,i)=><button key={d.id} className="dream-card inspiration-card" onClick={()=>start(d)}><div className="dream-top"><span className="dream-index">INSPIRATION 0{i+1}</span><CategoryIcon category={d.category}/></div><span className="category-label">{categoryOf(d.category).label}</span><h3>{d.title}</h3><p>{d.description}</p><div className="dream-bottom"><span>{d.tasks.length} 個小目標</span><span><Plus size={15}/>加入夢想</span></div></button>)}</section></>}
 <button className="new-chapter" onClick={()=>start()} disabled={loading||busy}><Plus size={24}/><div><strong>下一個夢想，會是什麼？</strong><span>想到的時候，就先寫下來。</span></div></button>
 </>}
 <footer className="journal-footer"><Leaf size={16}/><span>reverie · 讓想過的生活，長成自己的模樣。</span></footer>
 </main>}
  <Dialog open={editor} onOpenChange={open=>{if(!busy)setEditor(open);}}><DialogContent className="dream-editor" showCloseButton={false}><DialogClose asChild><button className="panel-close" aria-label="關閉夢想編輯" disabled={busy}><X size={20}/></button></DialogClose><DialogHeader><div className="editor-symbol"><Sparkles size={25}/></div><DialogTitle>{draft.id?"編輯目標任務":"建立新的目標任務"}</DialogTitle><DialogDescription>設定一個現實生活目標，拆成可以完成的行動；每一步都會帶來角色經驗。</DialogDescription></DialogHeader>
  <form onSubmit={saveEditor} className="editor-form"><label htmlFor="dream-title">我想要… <span>必填</span></label><Input id="dream-title" autoFocus required maxLength={100} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="例如：去冰島看一次極光" disabled={busy}/>
   <label htmlFor="dream-description">為什麼想實現這個夢想？ <span>選填</span></label><Textarea id="dream-description" maxLength={2000} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="寫給未來的自己，記住此刻心動的原因。" disabled={busy} rows={3}/>
   <span className="field-label" id="category-label">目標的類型</span><RadioGroup value={draft.category} onValueChange={category=>setDraft({...draft,category})} className="category-picker" aria-labelledby="category-label" disabled={busy}>{categories.map(c=><label key={c.id} className={"category-choice "+(draft.category===c.id?"chosen":"")} style={{"--choice":c.color} as React.CSSProperties}><RadioGroupItem value={c.id} aria-label={c.label}/><CategoryIcon category={c.id} size={17}/><span>{c.label}</span></label>)}</RadioGroup>
   <label htmlFor="dream-date">預計完成日期 <span>選填</span></label><Input type="date" id="dream-date" value={draft.targetDate} onChange={e=>setDraft({...draft,targetDate:e.target.value})} disabled={busy}/>
   <div className="field-label goal-editor-label"><span>行動步驟與修練方向</span><small>{draft.tasks.length} 個</small></div><div className="draft-goals">{draft.tasks.map((task,i)=><div className="draft-goal" key={task.id}><span>{task.done?<Check size={14}/>:String(i+1).padStart(2,"0")}</span><Input aria-label={"小目標 "+(i+1)} maxLength={200} required value={task.title} onChange={e=>setDraft({...draft,tasks:draft.tasks.map(t=>t.id===task.id?{...t,title:e.target.value}:t)})} disabled={busy}/><select className="training-select" aria-label={"小目標 "+(i+1)+" 修練方向"} value={task.training??defaultTraining(draft.category)} disabled={busy||task.done||task.trainingLocked} onChange={e=>setDraft({...draft,tasks:draft.tasks.map(t=>t.id===task.id?{...t,training:e.target.value as SkillId}:t)})}>{skills.map(skill=><option key={skill.id} value={skill.id}>{skill.name}</option>)}</select><button type="button" className="icon-button" aria-label={"移除小目標："+task.title} onClick={()=>setDraft({...draft,tasks:draft.tasks.filter(t=>t.id!==task.id)})} disabled={busy}><X size={17}/></button></div>)}</div>
   <p className="training-help">每步首次完成 +40 XP、20 技能熟練與對應屬性；首次完成後修練方向固定。</p><div className="draft-add"><Input aria-label="新增小目標草稿" maxLength={200} value={draftTask} onChange={e=>setDraftTask(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();if(draftTask.trim()){setDraft({...draft,tasks:[...draft.tasks,newTask(draftTask.trim(),draft.category)]});setDraftTask("");}}}} placeholder="一件具體、可以完成的小事" disabled={busy||draft.tasks.length>=200}/><button type="button" aria-label="加入小目標草稿" className="secondary-button" disabled={busy||!draftTask.trim()||draft.tasks.length>=200} onClick={()=>{setDraft({...draft,tasks:[...draft.tasks,newTask(draftTask.trim(),draft.category)]});setDraftTask("");}}><Plus size={18}/></button></div>
   <div className="editor-footer"><button type="button" className="text-button" disabled={busy} onClick={()=>setEditor(false)}>取消</button><button className="primary-button" type="submit" disabled={busy}>{busy?<LoaderCircle size={17} className="spin"/>:<Check size={17}/>} {busy?"正在保存…":draft.id?"儲存變更":"接受這個任務"}</button></div>
  </form></DialogContent></Dialog>
  <Sheet open={!!selected} onOpenChange={open=>{if(!open&&!busy)setSelectedId(null);}}><SheetContent className="dream-detail" showCloseButton={false}><SheetClose asChild><button className="panel-close" aria-label="關閉夢想詳情" disabled={busy}><X size={20}/></button></SheetClose>{selected&&<><SheetHeader><div className="detail-category" style={{color:categoryOf(selected.category).color}}><CategoryIcon category={selected.category}/>{categoryOf(selected.category).label}</div><SheetTitle>{selected.title}</SheetTitle><SheetDescription>{selected.description||"為未來的自己，踏出一小步。"}</SheetDescription><div className="detail-meta"><span><CalendarDays size={15}/>{selected.quest||selected.story ? "依自己的節奏完成・跨日保留" : dateLabel(selected.targetDate)}</span>{!selected.quest&&!selected.story&&<button className="text-button" onClick={()=>start(selected)} disabled={busy}><Pencil size={15}/>編輯夢想</button>}</div></SheetHeader>
   <div className={"detail-progress "+(isComplete(selected)?"fulfilled":"")}><div><span>{isComplete(selected)?<><Trophy size={17}/>夢想已實現</>:"目標任務進度"}</span><strong>{progressOf(selected)}%</strong></div><Progress value={progressOf(selected)} aria-label="這個夢想的完成進度"/><small>{selected.tasks.filter(t=>t.done).length} / {selected.tasks.length} 個小目標已完成{isComplete(selected)&&" · 首次實現額外獲得 100 星露"}</small></div>
   <div className="detail-goals">{selected.story&&<div className="quest-source-note"><ScrollText size={18}/><span>編年史修練・完成後返回世界冒險，繼續故事與試煉。</span></div>}{selected.quest&&<div className="quest-source-note"><ScrollText size={18}/><span>{npcOf(selected.quest.npcId)?.name}的{selected.quest.kind==="daily"?"每日委託":"初識委託"}・可以採用步驟中的替代選項</span></div>}<div className="section-heading"><div><h2>每一步，都離夢想更近</h2><p>完成後勾選，也可以隨時重新調整。</p></div></div>{!selected.quest&&!selected.story&&<form className="detail-add" onSubmit={addTask}><Input aria-label="新增小目標" value={taskInput} onChange={e=>setTaskInput(e.target.value)} maxLength={200} placeholder="新增下一個小目標…" disabled={busy||selected.tasks.length>=200}/><button className="primary-button" type="submit" disabled={busy||!taskInput.trim()||selected.tasks.length>=200} aria-label="加入小目標"><Plus size={18}/></button></form>}
   {!selected.tasks.length&&<div className="detail-empty"><Target size={31}/><p>不用想好全部的路。<br/>先寫下一件可以做到的小事。</p></div>}
   <div className="task-list">{selected.tasks.map((task,i)=><div className={"task-row "+(task.done?"task-done":"")} key={task.id}><Checkbox checked={task.done} onCheckedChange={checked=>void toggle(selected,task,checked===true).catch(()=>{})} disabled={busy} aria-label={"完成："+task.title}/>{editingTask===task.id?<form className="inline-edit" onSubmit={saveTaskTitle}><Input autoFocus required maxLength={200} aria-label="修改小目標名稱" value={taskText} onChange={e=>setTaskText(e.target.value)} disabled={busy}/><button className="icon-button" type="submit" aria-label="儲存小目標名稱" disabled={busy||!taskText.trim()}><Check size={18}/></button><button className="icon-button" type="button" aria-label="取消修改小目標" onClick={()=>setEditingTask(null)} disabled={busy}><X size={18}/></button></form>:<><div className="task-label"><label onClick={()=>void toggle(selected,task,!task.done).catch(()=>{})}>{task.title}</label><span className="task-training-badge">{skillOf(task.training??defaultTraining(selected.category))?.name}</span><small>{task.done?"已完成 · 成長已保存":"STEP "+String(i+1).padStart(2,"0")+" · 首次完成 +40 XP、25 星露"}</small></div>{!selected.quest&&!selected.story&&<button className="icon-button" aria-label={"編輯小目標："+task.title} onClick={()=>{setEditingTask(task.id);setTaskText(task.title);}} disabled={busy}><Pencil size={15}/></button>}</>}</div>)}</div></div>
   <div className="detail-reminder"><Sparkles size={17}/><p>每完成一步，你都在成為更靠近理想的自己。</p></div>
  </>}</SheetContent></Sheet>
  {celebration>0&&<div className="confetti" aria-hidden="true" key={celebration}>{Array.from({length:24},(_,i)=><span key={i} style={{"--i":i,"--x":((i*37)%100)+"vw","--angle":((i*73)%360)+"deg","--color":["#84e8ca","#e6cf91","#b7a0ff","#7bb6ff"][i%4]} as React.CSSProperties}/>)}</div>}
  <Dialog open={more} onOpenChange={setMore}><DialogContent className="rpg-more-dialog"><DialogHeader><DialogTitle>冒險者選單</DialogTitle><DialogDescription>你的技能、紀錄與營地。</DialogDescription></DialogHeader><div className="more-menu-grid">{[...(browserPreview?[{id:'world',label:'世界冒險',Icon:Compass}]:[]),{id:'skills',label:'生活技能',Icon:Zap},{id:'leaderboard',label:browserPreview?'成長紀錄':'成長排行榜',Icon:Trophy},{id:'achievements',label:'成就紀錄',Icon:Milestone},{id:'journal',label:'目標旅誌',Icon:BookOpen},{id:'camp',label:'營地與小島',Icon:House},{id:'settings',label:'角色設定',Icon:Settings2}].map(item=><button key={item.id} onClick={()=>changeView(item.id)}><item.Icon size={23}/><span>{item.label}</span></button>)}</div></DialogContent></Dialog>
  <Toaster position="bottom-right" offset="104px" mobileOffset={{bottom:"calc(88px + env(safe-area-inset-bottom, 0px))",left:"16px",right:"16px"}} theme="dark" richColors closeButton/>
 </div>;
}







