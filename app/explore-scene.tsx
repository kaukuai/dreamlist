"use client";
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from "react";
import {ArrowRight, BookOpen, Check, Compass, HelpCircle, MessageCircle, Music2, Navigation, ScrollText, Sparkles, Swords} from "lucide-react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {appFetch} from "@/lib/client-api";
import {FIELD, bellSolution, distance, fieldPath, moveField, nearbyPlace, placesIn,fieldNotes,zoneInfo,type ZoneId,type Point} from "@/lib/field-engine";
import type {AdventureView} from "@/lib/adventure-model";
import {jobTitle, type CharacterState} from "@/lib/character-model";
import {npcOf, type NpcId, type QuestBoardState} from "@/lib/quest-model";
import type {Dream} from "@/lib/dream-model";
import CharacterAvatar from "./character-avatar";
import {NpcFullFigure} from "./quest-hub";
import AdventureWorld from "./adventure-world";
import {GameButton, MovementPad} from "./field-controls";
import {useGameSound} from "./game-sound";

import {bindGround} from "@/lib/touch-controls";
import {facingFromVector, type Facing} from "@/lib/pixel-actors";
import WorldCanvas from "./world-canvas";
import {followCamera} from "@/lib/world-map";
import {walkFrame} from "@/lib/sprite-catalog";

type Props = {character: CharacterState | null; dreams: Dream[]; onRefresh: () => Promise<unknown>; onQuest: (id: string) => void; onAccept: (id: string) => Promise<Dream | undefined>; onJournal: () => void};
type Episode = AdventureView["episodes"][number];
export default function ExploreScene(props: Props) {
  const [data, setData] = useState<AdventureView | null>(null), [error, setError] = useState("");
  const stamp = props.dreams.map(dream => dream.id + ":" + dream.revision).join("|") + ":" + props.character?.totalXp;
  const generation = useRef(0);
  const load = useCallback(async () => {
    const version = ++generation.current;
    try {const response = await appFetch("/api/adventure");const body = await response.json() as {adventure: AdventureView; error?: string};if (!response.ok) throw new Error(body.error);if (version === generation.current) {setData(body.adventure);setError("");}}
    catch (error) {if (version === generation.current) setError(error instanceof Error ? error.message : "暫時無法開啟場景");}
  }, []);
  useEffect(() => {void Promise.resolve().then(load);}, [load, stamp]);
  useEffect(() => {const sync = (event: StorageEvent) => {if (event.key === "dreamlist:browser-preview:v1") void load();};window.addEventListener("storage", sync);return () => window.removeEventListener("storage", sync);}, [load]);
  const act = async (action: object) => {
    try {const response = await appFetch("/api/adventure", {method: "POST", body: JSON.stringify(action)});const body = await response.json() as {adventure: AdventureView; error?: string};if (!response.ok) throw new Error(body.error);setData(body.adventure);setError("");return body.adventure;}
    catch (error) {setError(error instanceof Error ? error.message : "場景操作尚未保存");return undefined;}
  };
  if (!data || !props.character) return <main className="scene-loading"><Compass size={32}/><h1>晨鐘鎮正在醒來</h1>{error ? <><p role="alert">{error}</p><button className="primary-button" onClick={() => void load()}>重新載入</button></> : <p>正在讀取你留在這裡的足跡…</p>}</main>;
  return <TownPlayfield {...props} character={props.character} data={data} error={error} act={act} reload={load}/>;
}

type TownProps = Props & {character: CharacterState; data: AdventureView; error: string; act: (action: object) => Promise<AdventureView | undefined>; reload: () => Promise<void>};
function TownPlayfield({character, dreams, data, error, act, reload, onRefresh, onQuest, onAccept}: TownProps) {
  const sound = useGameSound();
  const [position, setPosition] = useState<Point>({x: data.field.x, y: data.field.y});
  const [destination, setDestination] = useState<Point | null>(null);
  const [size, setSize] = useState({width: 390, height: 640}), [moving, setMoving] = useState(false), [direction, setDirection] = useState<Facing>("down"), [stride, setStride] = useState(0);
  const [npcId, setNpcId] = useState<NpcId | null>(null), [help, setHelp] = useState(false), [map, setMap] = useState(false), [bell, setBell] = useState(false);
  const [encounter, setEncounter] = useState<string | null>(null), [quests, setQuests] = useState<QuestBoardState | null>(null), [notice, setNotice] = useState("");
  const viewport = useRef<HTMLDivElement | null>(null), location = useRef(position), pad = useRef({x: 0, y: 0}), path = useRef<Point[]>([]), keys = useRef(new Set<string>());
  const [renderClock,setRenderClock]=useState(0),[tracks,setTracks]=useState<{x:number;y:number;at:number}[]>([]);
  const travel = useRef(0),footprints=useRef<{x:number;y:number;at:number}[]>([]),lastPrint=useRef(0);
  const zone:ZoneId=data.field.zone??"town";
  const [camera,setCamera]=useState({x:Math.max(0,data.field.x-130),y:Math.max(0,data.field.y-170)}),cameraRef=useRef(camera);
  const [note,setNote]=useState<string|null>(null),[tracker,setTracker]=useState(false),[zoneBanner,setZoneBanner]=useState(true);
  const places=placesIn(zone);
  const current = useRef({act, data, sound, interact: () => {}, modal: false, zone, view:{width:size.width,height:size.height,zoom:1.5}, go: (() => {}) as (point: Point) => void});
  const modal = !!npcId || help || map || bell || !!encounter || !!note;
  const next = data.episodes.find(episode => episode.kind === "main" && episode.status !== "cleared");
  const foundEcho = data.field.discovered.includes("echo");
  const focus = next?.status === "active" ? null : places.find(place => place.id === (!foundEcho ? "echo" : next?.status === "ready" ? "portal" : next ? next.choices[0].npcId : "bell-mid"))!;
  const near = nearbyPlace(position, places.filter(place => place.id !== "echo" || !foundEcho));
  const npc = npcOf(npcId ?? "");
  const npcEpisode = npcId ? data.episodes.find(episode => episode.bondNpc === npcId) : null;
  const primaryEpisode = next && npcId && (next.intro.some(line => line.speaker === npcId) || next.choices.some(choice => choice.npcId === npcId)) ? next : undefined;
  const zoom = size.width<600?1.5:2;
  const navigate = (point: Point) => {const route = fieldPath(location.current, point,zone);path.current = route;setDestination(route.at(-1) ?? null);setMap(false);};
  function story(episode: Episode) {setNpcId(null);setEncounter(episode.id);sound.cue("interact");}
  async function interact() {
    const place = nearbyPlace(location.current, placesIn(current.current.zone).filter(place => place.id !== "echo" || !current.current.data.field.discovered.includes("echo")));
    if (!place || current.current.modal) return;
    const updated = await current.current.act({action: "fieldInteract", placeId: place.id, zone:current.current.zone, ...location.current});if (!updated) return;
    path.current = [];pad.current = {x: 0, y: 0};keys.current.clear();
    if (place.kind === "npc") {
      setNpcId((place.npcId??place.id) as NpcId);sound.cue("interact");
      const response = await appFetch("/api/quests");if (response.ok) setQuests(await response.json());
    } else if(place.kind==="exit"){
      location.current={x:updated.field.x,y:updated.field.y};setPosition({...location.current});setDestination(null);cameraRef.current={x:Math.max(0,updated.field.x-size.width/zoom/2),y:Math.max(0,updated.field.y-size.height/zoom*.52)};setCamera({...cameraRef.current});footprints.current=[];setZoneBanner(true);sound.cue("interact");
    } else if(place.kind==="lore"||place.kind==="shrine"){setNote(place.id);sound.cue("interact");
    } else if (place.kind === "echo") {sound.cue("echo");setNotice("微光回到了掌心。洛恩望向你，像是等了很久。");}
    else if (place.kind === "bell") {
      sound.cue(place.id === "bell-low" ? "low" : place.id === "bell-high" ? "high" : "mid");
      if (updated.field.bellSolved && !data.field.bellSolved) {sound.cue("win");setNotice("低・高・中。鐘樓終於回應了你，暖光點亮了廣場。");} else {setBell(true);}
    } else {
      const episode = current.current.data.episodes.find(episode => episode.kind === "main" && episode.status !== "cleared");
      const battle = current.current.data.battle;
      if (battle && (battle.phase === "active" || battle.phase === "won" && !current.current.data.episodes.find(episode => episode.id === battle.episodeId)?.entry?.claimedAt)) setEncounter(battle.episodeId);
      else if (episode?.entry) setEncounter(episode.id);
      else setNotice("回聲之門尚未回應。先去和夥伴聊聊，選擇你的第一段修練。");
    }
  }
  useLayoutEffect(() => {current.current = {act, data, sound, interact: () => void interact(), modal, zone,view:{width:size.width,height:size.height,zoom}, go: point => {if (modal) return;const box = viewport.current?.getBoundingClientRect();if (box) navigate({x: (point.x - box.x)/zoom + camera.x, y: (point.y - box.y)/zoom + camera.y});}};});
  useEffect(() => {
    const element = viewport.current;if (!element) return;
    const unbindGround = bindGround(element, point => current.current.go(point));
    const observer = new ResizeObserver(entries => {const box = entries[0].contentRect;setSize({width: box.width, height: box.height});});observer.observe(element);
    const onKey = (event: KeyboardEvent) => {
      if (current.current.modal || (event.target as HTMLElement).closest("input,textarea,select,[role=dialog]")) return;
      const key = event.key.toLowerCase();if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "e"].includes(key)) event.preventDefault();
      keys.current.add(key);path.current = [];
      if (key === "e" && !event.repeat) current.current.interact();
    };
    const release = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const stop = () => {keys.current.clear();pad.current = {x: 0, y: 0};path.current = [];void current.current.act({action: "saveField",zone:current.current.zone, ...location.current});};
    const visibility = () => {if (document.hidden) stop();};
    const blur = () => {keys.current.clear();if (document.hidden) stop();};
    window.addEventListener("keydown", onKey);window.addEventListener("keyup", release);window.addEventListener("blur", blur);document.addEventListener("visibilitychange", visibility);window.addEventListener("reverie:pause", stop);
    let animation = 0, last = performance.now(), lastPaint = 0, lastSave = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;last = now;
      if (!current.current.modal && !document.hidden) {
        let dx = pad.current.x + Number(keys.current.has("d") || keys.current.has("arrowright")) - Number(keys.current.has("a") || keys.current.has("arrowleft"));
        let dy = pad.current.y + Number(keys.current.has("s") || keys.current.has("arrowdown")) - Number(keys.current.has("w") || keys.current.has("arrowup"));
        if (path.current.length && !dx && !dy) {const next = path.current[0], size = distance(next, location.current);if (size < 5) {path.current.shift();if (!path.current.length) setDestination(null);}else {dx = (next.x - location.current.x) / size;dy = (next.y - location.current.y) / size;}}
        const point = moveField(location.current, {x: dx, y: dy}, dt,current.current.zone), didMove = distance(point, location.current) > .01;
        travel.current += distance(point, location.current);location.current = point;
        if (now - lastPaint > 32) {setPosition({...point});setRenderClock(now);setTracks([...footprints.current]);setMoving(didMove);setStride(didMove ? walkFrame(travel.current) : 0);if (didMove) setDirection(previous => facingFromVector(dx, dy, previous));lastPaint = now;}
        cameraRef.current=followCamera(cameraRef.current,point,current.current.view,dt);
        setCamera(previous=>{const x=Math.round(cameraRef.current.x),y=Math.round(cameraRef.current.y);return previous.x===x&&previous.y===y?previous:{x,y};});
        if(didMove){current.current.sound.cue("step");if(travel.current-lastPrint.current>14){lastPrint.current=travel.current;footprints.current=[...footprints.current.filter(f=>now-f.at<1600),{...point,at:now}].slice(-12);}}
        if (didMove && now - lastSave > 2200) {lastSave = now;void current.current.act({action: "saveField",zone:current.current.zone, ...point});}
      }
      animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
    return () => {cancelAnimationFrame(animation);observer.disconnect();unbindGround();window.removeEventListener("keydown", onKey);window.removeEventListener("keyup", release);window.removeEventListener("blur", blur);document.removeEventListener("visibilitychange", visibility);window.removeEventListener("reverie:pause", stop);void appFetch("/api/adventure", {method: "POST", body: JSON.stringify({action: "saveField",zone:current.current.zone, ...location.current})});};
  }, []);
  const changeMood = sound.mood;
  useEffect(() => {changeMood(modal ? "dialogue" : "town");}, [changeMood, modal]);
  useEffect(() => {if (!notice) return;const timeout = setTimeout(() => setNotice(""), 6500);return () => clearTimeout(timeout);}, [notice]);
  useEffect(()=>{const timer=setTimeout(()=>setZoneBanner(false),2800);return()=>clearTimeout(timer);},[zone]);
  async function acceptNpc() {
    const quest = quests?.introductions.find(quest => quest.npcId === npcId);if (!quest) return;
    const dream = quest.dreamId ? dreams.find(dream => dream.id === quest.dreamId) : await onAccept(quest.offerId);
    if (dream) {setNpcId(null);onQuest(dream.id);}
  }
  const objective = !foundEcho ? "走向廣場上的微光，試著拾起它" : next?.status === "active" ? "把修練帶到生活裡，完成後再回來" : next?.status === "ready" ? "生活修練已完成・走向回聲之門" : next ? `和${npcOf(next.choices[0].npcId)?.name}聊聊，決定下一步` : "隨意走走，尋找還沒聽過的故事";
  return <main className="town-experience" aria-label="晨鐘鎮可探索場景">
    <div className="town-viewport" ref={viewport} role="application" tabIndex={0} aria-label="點選地面移動角色；方向鍵或WASD移動，E互動">
      <WorldCanvas width={size.width} height={size.height} state={{zone,camera,zoom,player:position,identity:character.profession,direction,frame:moving&&!modal?stride:0,tier:character.advancements[character.profession],discovered:data.field.discovered,bellSolved:data.field.bellSolved,destination,time:renderClock,footprints:tracks,focus:focus?.id}}/>
      {places.filter(place=>place.id!=="echo"||!foundEcho).map(place=><GameButton key={place.id} className={"world-hit-target "+place.kind} aria-label={`前往${place.name}`} style={{left:(place.x-camera.x)*zoom,top:(place.y-camera.y)*zoom}} onActivate={()=>navigate(place)}><span className="sr-only">{place.name}</span></GameButton>)}
      <span className={"field-player "+(moving&&!modal?"is-walking":"")} data-player-x={position.x.toFixed(1)} data-player-y={position.y.toFixed(1)} data-facing={direction} data-frame={moving&&!modal?stride:0} style={{left:(position.x-camera.x)*zoom,top:(position.y-camera.y)*zoom}} aria-label={character.name}/>
    </div>
    {zoneBanner&&<div className="zone-arrival" key={zone}><small>{zoneInfo[zone].subtitle}</small><h1>{zoneInfo[zone].name}</h1><i/></div>}
    <section className="scene-character-hud"><button onClick={() => setHelp(true)} aria-label="角色與操作說明"><CharacterAvatar character={character} compact/><span><strong>{character.name}</strong><small>Lv.{character.level} · {jobTitle(character.profession, character.advancements[character.profession])}</small><i><b style={{width: `${character.xpInLevel / character.xpForNext * 100}%`}}/></i></span></button><span className="scene-location">{zoneInfo[zone].name} <small>{zoneInfo[zone].subtitle}</small></span></section>
    <div className="scene-minimap"><button aria-label="地圖與地點" onClick={()=>setMap(true)}><svg viewBox="0 0 120 80" aria-hidden="true"><rect width="120" height="80" fill={zone==="woods"?"#3e5339":"#3c4a43"}/>{zone==="woods"?<><rect x="54" width="13" height="80" fill="#729393"/><path d="M5 48H115" stroke="#bdac7d" strokeWidth="5"/></>:zone==="library"?<rect x="22" y="13" width="77" height="60" fill="#a38965"/>:<><path d="M20 38H110M60 22V73" stroke="#ad9f7b" strokeWidth="9"/>{[[13,9,19,22],[52,1,16,20],[86,9,20,20],[13,52,16,19],[90,53,19,19]].map(([x,y,w,h],i)=><rect key={i} x={x} y={y} width={w} height={h} fill="#606674"/>)}</>}<circle cx={position.x/10} cy={position.y/10} r="2.5" fill="#fae4a7"/></svg><span>{zoneInfo[zone].name}</span></button></div>
    <div className="scene-tools"><button aria-label="操作說明" onClick={() => setHelp(true)}><HelpCircle size={20}/></button></div>
    <div className={"scene-tracker "+(tracker?"expanded":"")}><button className="tracker-toggle" aria-label="追蹤任務" aria-expanded={tracker} onClick={()=>setTracker(!tracker)}><ScrollText size={16}/><span>{zone!=="town"?zoneInfo[zone].subtitle:next?.title??"自由探索"}</span><ArrowRight size={12}/></button>{tracker&&<button className="scene-objective" onClick={()=>next?.status==="active"&&next.entry?onQuest(next.entry.dreamId):focus&&navigate(focus)}><strong>{zone!=="town"?zoneInfo[zone].description:objective}</strong>{focus&&<span><Navigation size={12}/>{Math.round(distance(position,focus)/15)}m</span>}</button>}</div>
    {data.battle?.phase === "active" && <button className="scene-resume" onClick={() => setEncounter(data.battle!.episodeId)}><Swords size={15}/>接續未結束的試煉<ArrowRight size={14}/></button>}
    {notice && <div className="scene-notice" role="status"><Sparkles size={18}/><span>{notice}</span></div>}
    {error && <div className="scene-error" role="alert">{error}</div>}
    <div className="scene-controls"><MovementPad onMove={point => {pad.current = point;path.current = [];}}/><div className="scene-interaction" data-nearby={near?.id ?? ""}><span>{near ? near.kind === "npc" ? npcOf(near.npcId??near.id)?.role : near.name : "點地面也能移動"}</span><GameButton aria-label={near ? near.kind === "npc" ? `和${near.name}交談` : near.kind === "echo" ? "拾起微光" : near.kind === "portal" ? "進入回聲之門" : near.kind === "bell" ? "敲響共鳴石" : near.name : "探索"} className={near ? "can-interact" : ""} disabled={!near || modal} onActivate={() => void interact()}>{near?.kind === "npc" ? <MessageCircle size={25}/> : near?.kind === "portal" ? <Swords size={25}/> : <Sparkles size={25}/>}<strong>{near ? near.kind === "npc" ? `和${near.name}交談` : near.kind === "echo" ? "拾起微光" : near.kind === "portal" ? "進入回聲之門" : near.kind === "bell" ? "敲響共鳴石" : near.name : "探索"}</strong><small>E</small></GameButton></div></div>

    <Dialog open={!!npc} onOpenChange={open => {if (!open) setNpcId(null);}}><DialogContent className="field-npc-dialog">{npc && <><div className="field-npc-scene"><NpcFullFigure npc={npc}/><span>{npc.location}</span></div><DialogHeader><small className="eyebrow">{npc.role}</small><DialogTitle>{npc.name}</DialogTitle><DialogDescription>{primaryEpisode ? primaryEpisode.intro.find(line => line.speaker === npc.id)?.text ?? npc.greeting : npc.greeting}</DialogDescription></DialogHeader><div className="field-npc-options">{primaryEpisode && <button className="primary-button" onClick={() => story(primaryEpisode)}><ScrollText size={18}/>{primaryEpisode.status === "active" ? "繼續我們的修練" : primaryEpisode.title}<ArrowRight size={16}/></button>}<button className="secondary-button" onClick={() => void acceptNpc()} disabled={!quests}><Compass size={17}/>{quests?.introductions.find(quest => quest.npcId === npcId)?.status === "complete" ? "回顧生活委託" : "有什麼我能在生活中練習的？"}</button>{npcEpisode && npcEpisode.status !== "locked" && <button className="text-button" onClick={() => story(npcEpisode)}>{npcEpisode.status === "cleared" ? "重溫你的故事" : "聽聽你的故事"}<ArrowRight size={14}/></button>}<button className="text-button" onClick={() => setNpcId(null)}>待會見，我再去走走</button></div></>}</DialogContent></Dialog>
    <Dialog open={help} onOpenChange={setHelp}><DialogContent className="field-help-dialog"><DialogHeader><span className="eyebrow">LEARN BY EXPLORING</span><DialogTitle>先走一步，就已經在玩了。</DialogTitle><DialogDescription>這裡沒有必須照表完成的開場。先散步、和夥伴說話，或聽聽廣場上的共鳴石。</DialogDescription></DialogHeader><ol><li><strong>自己走近</strong><p>點地面移動，或按住左下十字方向鍵（也能切換搖桿）。靠近人物與物件後，右下角會出現互動。</p></li><li><strong>把一點冒險帶進生活</strong><p>和夥伴選擇一段修練，到生活中實際完成，再回來記下成長。</p></li><li><strong>親自通過試煉</strong><p>走向回聲之門，用走位、閃避和職業戰技尋回故事；失敗不扣成長。</p></li></ol><p className="field-keyboard">電腦：WASD / 方向鍵移動 · E 互動<br/>地圖可幫你找路，不會把你瞬間傳送。</p><button className="primary-button" onClick={() => setHelp(false)}>我自己去探索<Compass size={17}/></button><p className="rpg-footnote">免登入試玩・進度只存於目前瀏覽器。<br/>配樂自願開啟，聲音設定在右上角。</p></DialogContent></Dialog>
    <Dialog open={map} onOpenChange={setMap}><DialogContent className="field-map-dialog"><DialogHeader><DialogTitle>{zoneInfo[zone].name}・地圖與地點</DialogTitle><DialogDescription>選擇地點後，角色會沿道路走過去；途中隨時能改變方向。</DialogDescription></DialogHeader><div className="field-map-preview" data-zone={zone}><span style={{left: position.x / FIELD.width * 100 + "%", top: position.y / FIELD.height * 100 + "%"}}/></div><div className="field-place-list">{places.filter(place => place.kind !== "echo").map(place => <button key={place.id} data-place-id={place.id} onClick={() => navigate(place)}><span>{place.kind === "npc" ? <MessageCircle size={16}/> : place.kind === "portal" ? <Swords size={16}/> : <Music2 size={16}/>} {place.name}</span><small>{Math.round(distance(position, place) / 15)}m <ArrowRight size={13}/></small></button>)}</div></DialogContent></Dialog>
    <Dialog open={!!note} onOpenChange={open=>{if(!open)setNote(null);}}><DialogContent className="field-note-dialog"><DialogHeader><span className="eyebrow">旅途手記 · {zoneInfo[zone].name}</span><DialogTitle>{note?fieldNotes[note]?.title:""}</DialogTitle><DialogDescription>{note?fieldNotes[note]?.text:""}</DialogDescription></DialogHeader><small>已收錄 {Object.keys(fieldNotes).filter(id=>data.field.discovered.includes(id)).length} / {Object.keys(fieldNotes).length} 段文字。探索不取代生活修練，也不消耗星露。</small><button className="primary-button" onClick={()=>setNote(null)}>闔上手記，繼續走走<BookOpen size={16}/></button></DialogContent></Dialog>
    <Dialog open={bell} onOpenChange={setBell}><DialogContent className="bell-dialog"><DialogHeader><span className="eyebrow">A MELODY YOU CAN TOUCH</span><DialogTitle>{data.field.bellSolved ? "小鎮記起了自己的旋律" : "三塊共鳴石，留著同一段記憶"}</DialogTitle><DialogDescription>石座上刻著：先低吟，再仰望，最後回到心間。依「低 → 高 → 中」的順序，走近並敲響三塊石頭，讓鐘樓回應你。</DialogDescription></DialogHeader><div className="bell-sequence" aria-label="本次敲響的音序">{bellSolution.map((id, index) => <span key={id} className={data.field.bellSequence[index] === id ? "lit" : ""}>{index + 1}<strong>{id === "bell-low" ? "低" : id === "bell-high" ? "高" : "中"}</strong>{data.field.bellSequence[index] === id && <Check size={14}/>}</span>)}</div><p>不開聲音也能完成，音高會以文字標示。不扣星露，也不影響主線。</p><button className="primary-button" onClick={() => setBell(false)}>我去試試<Music2 size={17}/></button></DialogContent></Dialog>
    {encounter && <AdventureWorld key={encounter} character={character} progressStamp={dreams.map(dream => dream.revision).join(":")} onRefresh={onRefresh} onQuest={id => {setEncounter(null);onQuest(id);}} onExit={() => {setEncounter(null);void reload();}} initialEpisodeId={encounter} encounter/>}
  </main>;
}
