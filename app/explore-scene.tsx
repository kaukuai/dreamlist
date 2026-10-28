"use client";
import {useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties} from "react";
import {ArrowRight, BookOpen, Check, Compass, HelpCircle, Map, MessageCircle, Music2, Navigation, ScrollText, Sparkles, Swords} from "lucide-react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {appFetch} from "@/lib/client-api";
import {FIELD, bellSolution, distance, fieldPath, fieldPlaces, moveField, nearbyPlace, type FieldPlace, type Point} from "@/lib/field-engine";
import type {AdventureView} from "@/lib/adventure-model";
import {jobTitle, type CharacterState} from "@/lib/character-model";
import {npcOf, type NpcId, type QuestBoardState} from "@/lib/quest-model";
import type {Dream} from "@/lib/dream-model";
import CharacterAvatar from "./character-avatar";
import {NpcPortrait} from "./quest-hub";
import AdventureWorld from "./adventure-world";
import {MovementPad} from "./field-controls";
import {useGameSound} from "./game-sound";

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
function TownPlayfield({character, dreams, data, error, act, reload, onRefresh, onQuest, onAccept, onJournal}: TownProps) {
  const sound = useGameSound();
  const [position, setPosition] = useState<Point>({x: data.field.x, y: data.field.y});
  const [destination, setDestination] = useState<Point | null>(null);
  const [size, setSize] = useState({width: 390, height: 640}), [moving, setMoving] = useState(false), [direction, setDirection] = useState(1);
  const [npcId, setNpcId] = useState<NpcId | null>(null), [help, setHelp] = useState(false), [map, setMap] = useState(false), [bell, setBell] = useState(false);
  const [encounter, setEncounter] = useState<string | null>(null), [quests, setQuests] = useState<QuestBoardState | null>(null), [notice, setNotice] = useState("");
  const viewport = useRef<HTMLDivElement | null>(null), location = useRef(position), pad = useRef({x: 0, y: 0}), path = useRef<Point[]>([]), keys = useRef(new Set<string>());
  const current = useRef({act, data, sound, interact: () => {}, modal: false});
  const modal = !!npcId || help || map || bell || !!encounter;
  const next = data.episodes.find(episode => episode.kind === "main" && episode.status !== "cleared");
  const foundEcho = data.field.discovered.includes("echo");
  const focus = next?.status === "active" ? null : fieldPlaces.find(place => place.id === (!foundEcho ? "echo" : next?.status === "ready" ? "portal" : next ? next.choices[0].npcId : "bell-mid"))!;
  const near = nearbyPlace(position, fieldPlaces.filter(place => place.id !== "echo" || !foundEcho));
  const npc = npcOf(npcId ?? "");
  const npcEpisode = npcId ? data.episodes.find(episode => episode.bondNpc === npcId) : null;
  const primaryEpisode = next && npcId && (next.intro.some(line => line.speaker === npcId) || next.choices.some(choice => choice.npcId === npcId)) ? next : undefined;
  const zoom = size.width < 600 ? .92 : 1.05;
  const camera = {x: Math.max(0, Math.min(FIELD.width * zoom - size.width, position.x * zoom - size.width / 2)), y: Math.max(0, Math.min(FIELD.height * zoom - size.height, position.y * zoom - size.height * .57))};
  const navigate = (point: Point) => {const route = fieldPath(location.current, point);path.current = route;setDestination(route.at(-1) ?? null);setMap(false);};
  function story(episode: Episode) {setNpcId(null);setEncounter(episode.id);sound.cue("interact");}
  async function interact() {
    const place = nearbyPlace(location.current, fieldPlaces.filter(place => place.id !== "echo" || !current.current.data.field.discovered.includes("echo")));
    if (!place || current.current.modal) return;
    const updated = await current.current.act({action: "fieldInteract", placeId: place.id, ...location.current});if (!updated) return;
    path.current = [];pad.current = {x: 0, y: 0};keys.current.clear();
    if (place.kind === "npc") {
      setNpcId(place.id as NpcId);sound.cue("interact");
      const response = await appFetch("/api/quests");if (response.ok) setQuests(await response.json());
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
  useLayoutEffect(() => {current.current = {act, data, sound, interact: () => void interact(), modal};});
  useEffect(() => {
    const element = viewport.current;if (!element) return;
    const observer = new ResizeObserver(entries => {const box = entries[0].contentRect;setSize({width: box.width, height: box.height});});observer.observe(element);
    const onKey = (event: KeyboardEvent) => {
      if (current.current.modal || (event.target as HTMLElement).closest("input,textarea,select,[role=dialog]")) return;
      const key = event.key.toLowerCase();if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "e"].includes(key)) event.preventDefault();
      keys.current.add(key);path.current = [];
      if (key === "e" && !event.repeat) current.current.interact();
    };
    const release = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const stop = () => {keys.current.clear();pad.current = {x: 0, y: 0};path.current = [];void current.current.act({action: "saveField", ...location.current});};
    const visibility = () => {if (document.hidden) stop();};
    window.addEventListener("keydown", onKey);window.addEventListener("keyup", release);window.addEventListener("blur", stop);document.addEventListener("visibilitychange", visibility);window.addEventListener("reverie:pause", stop);
    let animation = 0, last = performance.now(), lastPaint = 0, lastSave = 0;
    const tick = (now: number) => {
      const dt = (now - last) / 1000;last = now;
      if (!current.current.modal && !document.hidden) {
        let dx = pad.current.x + Number(keys.current.has("d") || keys.current.has("arrowright")) - Number(keys.current.has("a") || keys.current.has("arrowleft"));
        let dy = pad.current.y + Number(keys.current.has("s") || keys.current.has("arrowdown")) - Number(keys.current.has("w") || keys.current.has("arrowup"));
        if (path.current.length && !dx && !dy) {const next = path.current[0], size = distance(next, location.current);if (size < 5) {path.current.shift();if (!path.current.length) setDestination(null);}else {dx = (next.x - location.current.x) / size;dy = (next.y - location.current.y) / size;}}
        const point = moveField(location.current, {x: dx, y: dy}, dt), didMove = distance(point, location.current) > .01;
        location.current = point;
        if (now - lastPaint > 45) {setPosition({...point});setMoving(didMove);if (dx) setDirection(dx > 0 ? 1 : -1);lastPaint = now;}
        if (didMove) current.current.sound.cue("step");
        if (didMove && now - lastSave > 2200) {lastSave = now;void current.current.act({action: "saveField", ...point});}
      }
      animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
    return () => {cancelAnimationFrame(animation);observer.disconnect();window.removeEventListener("keydown", onKey);window.removeEventListener("keyup", release);window.removeEventListener("blur", stop);document.removeEventListener("visibilitychange", visibility);window.removeEventListener("reverie:pause", stop);void appFetch("/api/adventure", {method: "POST", body: JSON.stringify({action: "saveField", ...location.current})});};
  }, []);
  const changeMood = sound.mood;
  useEffect(() => {changeMood(modal ? "dialogue" : "town");}, [changeMood, modal]);
  useEffect(() => {if (!notice) return;const timeout = setTimeout(() => setNotice(""), 6500);return () => clearTimeout(timeout);}, [notice]);
  async function acceptNpc() {
    const quest = quests?.introductions.find(quest => quest.npcId === npcId);if (!quest) return;
    const dream = quest.dreamId ? dreams.find(dream => dream.id === quest.dreamId) : await onAccept(quest.offerId);
    if (dream) {setNpcId(null);onQuest(dream.id);}
  }
  const objective = !foundEcho ? "走向廣場上的微光，試著拾起它" : next?.status === "active" ? "把修練帶到生活裡，完成後再回來" : next?.status === "ready" ? "生活修練已完成・走向回聲之門" : next ? `和${npcOf(next.choices[0].npcId)?.name}聊聊，決定下一步` : "隨意走走，尋找還沒聽過的故事";
  return <main className="town-experience" aria-label="晨鐘鎮可探索場景">
    <div className="town-viewport" ref={viewport} role="application" tabIndex={0} aria-label="點選地面移動角色；方向鍵或WASD移動，E互動" onPointerDown={event => {
      if ((event.target as HTMLElement).closest("button")) return;
      const box = event.currentTarget.getBoundingClientRect();navigate({x: (event.clientX - box.x + camera.x) / zoom, y: (event.clientY - box.y + camera.y) / zoom});
    }}>
      <div className={"town-world " + (data.field.bellSolved ? "bell-awakened" : "")} style={{width: FIELD.width, height: FIELD.height, transform: `translate(${-camera.x}px,${-camera.y}px) scale(${zoom})`}}>
        <div className="town-ground"/>
        {data.field.bellSolved && <span className="tower-light"/>}
        {fieldPlaces.filter(place => place.id !== "echo" || !foundEcho).map(place => <WorldPlace key={place.id} place={place} active={near?.id === place.id} tracked={focus?.id === place.id} discovered={data.field.discovered.includes(place.id)} onClick={() => navigate(place)}/>)}
        {destination && <span className="field-destination" style={{left: destination.x, top: destination.y}} aria-hidden="true"/>}
        <div className={"field-player " + (moving && !modal ? "is-walking" : "")} data-player-x={position.x.toFixed(1)} data-player-y={position.y.toFixed(1)} style={{left: position.x, top: position.y, zIndex: Math.round(position.y), "--facing": direction} as CSSProperties}><i className="player-ground-ring"/><CharacterAvatar character={character}/><span>{character.name}</span></div>
        <div className="field-fireflies" aria-hidden="true">{Array.from({length: 12}, (_, index) => <i key={index} style={{left: 270 + index * 59, top: 270 + index * 37 % 420, animationDelay: `${index * -.7}s`}}/>)}</div>
      </div>
      <div className="town-vignette"/>
    </div>
    <section className="scene-character-hud"><button onClick={() => setHelp(true)} aria-label="角色與操作說明"><CharacterAvatar character={character} compact/><span><strong>{character.name}</strong><small>Lv.{character.level} · {jobTitle(character.profession, character.advancements[character.profession])}</small><i><b style={{width: `${character.xpInLevel / character.xpForNext * 100}%`}}/></i></span></button><span className="scene-location">晨鐘鎮 <small>暮光時分</small></span></section>
    <div className="scene-tools"><button aria-label="地圖與地點" onClick={() => setMap(true)}><Map size={21}/></button><button aria-label="操作說明" onClick={() => setHelp(true)}><HelpCircle size={20}/></button><button aria-label="故事旅程與收藏" onClick={onJournal}><BookOpen size={20}/></button></div>
    <button className="scene-objective" onClick={() => next?.status === "active" && next.entry ? onQuest(next.entry.dreamId) : focus && navigate(focus)}><span className="objective-gem">✧</span><span><small>{!foundEcho ? "先試著探索" : next?.act ?? "你的自由旅程"}</small><strong>{next?.title ?? "回聲已歸來"}</strong><em>{objective}</em></span>{focus ? <span className="objective-distance"><Navigation size={14}/>{Math.round(distance(position, focus) / 15)}m</span> : <ArrowRight size={15}/>}</button>
    {data.battle?.phase === "active" && <button className="scene-resume" onClick={() => setEncounter(data.battle!.episodeId)}><Swords size={15}/>接續未結束的試煉<ArrowRight size={14}/></button>}
    {notice && <div className="scene-notice" role="status"><Sparkles size={18}/><span>{notice}</span></div>}
    {error && <div className="scene-error" role="alert">{error}</div>}
    <div className="scene-controls"><MovementPad onMove={point => {pad.current = point;path.current = [];}}/><div className="scene-interaction" data-nearby={near?.id ?? ""}><span>{near ? near.kind === "npc" ? npcOf(near.id)?.role : near.name : "點地面也能移動"}</span><button aria-label={near ? near.kind === "npc" ? `和${near.name}交談` : near.kind === "echo" ? "拾起微光" : near.kind === "portal" ? "進入回聲之門" : "敲響共鳴石" : "靠近後互動"} className={near ? "can-interact" : ""} disabled={!near || modal} onClick={() => void interact()}>{near?.kind === "npc" ? <MessageCircle size={25}/> : near?.kind === "portal" ? <Swords size={25}/> : <Sparkles size={25}/>}<strong>{near ? near.kind === "npc" ? `和${near.name}交談` : near.kind === "echo" ? "拾起微光" : near.kind === "portal" ? "進入回聲之門" : "敲響共鳴石" : "靠近後互動"}</strong><small>E</small></button></div></div>
    {!sound.settings.enabled && <button className="scene-enable-audio" onClick={() => void sound.enable()}><Music2 size={14}/>開啟旅途聲音</button>}
    <Dialog open={!!npc} onOpenChange={open => {if (!open) setNpcId(null);}}><DialogContent className="field-npc-dialog">{npc && <><div className="field-npc-scene"><NpcPortrait npc={npc}/><span>{npc.location}</span></div><DialogHeader><small className="eyebrow">{npc.role}</small><DialogTitle>{npc.name}</DialogTitle><DialogDescription>{primaryEpisode ? primaryEpisode.intro.find(line => line.speaker === npc.id)?.text ?? npc.greeting : npc.greeting}</DialogDescription></DialogHeader><div className="field-npc-options">{primaryEpisode && <button className="primary-button" onClick={() => story(primaryEpisode)}><ScrollText size={18}/>{primaryEpisode.status === "active" ? "繼續我們的修練" : primaryEpisode.title}<ArrowRight size={16}/></button>}<button className="secondary-button" onClick={() => void acceptNpc()} disabled={!quests}><Compass size={17}/>{quests?.introductions.find(quest => quest.npcId === npcId)?.status === "complete" ? "回顧生活委託" : "有什麼我能在生活中練習的？"}</button>{npcEpisode && npcEpisode.status !== "locked" && <button className="text-button" onClick={() => story(npcEpisode)}>{npcEpisode.status === "cleared" ? "重溫你的故事" : "聽聽你的故事"}<ArrowRight size={14}/></button>}<button className="text-button" onClick={() => setNpcId(null)}>待會見，我再去走走</button></div></>}</DialogContent></Dialog>
    <Dialog open={help} onOpenChange={setHelp}><DialogContent className="field-help-dialog"><DialogHeader><span className="eyebrow">LEARN BY EXPLORING</span><DialogTitle>先走一步，就已經在玩了。</DialogTitle><DialogDescription>這裡沒有必須照表完成的開場。先散步、和夥伴說話，或聽聽廣場上的共鳴石。</DialogDescription></DialogHeader><ol><li><strong>自己走近</strong><p>點地面移動，或拖動左下搖桿。靠近人物與物件後，右下角會出現互動。</p></li><li><strong>把一點冒險帶進生活</strong><p>和夥伴選擇一段修練，到生活中實際完成，再回來記下成長。</p></li><li><strong>親自通過試煉</strong><p>走向回聲之門，用走位、閃避和職業戰技尋回故事；失敗不扣成長。</p></li></ol><p className="field-keyboard">電腦：WASD / 方向鍵移動 · E 互動<br/>地圖可幫你找路，不會把你瞬間傳送。</p><button className="primary-button" onClick={() => setHelp(false)}>我自己去探索<Compass size={17}/></button><p className="rpg-footnote">免登入試玩・進度只存於目前瀏覽器。<br/>配樂自願開啟，聲音設定在右上角。</p></DialogContent></Dialog>
    <Dialog open={map} onOpenChange={setMap}><DialogContent className="field-map-dialog"><DialogHeader><DialogTitle>晨鐘鎮・找一條自己的路</DialogTitle><DialogDescription>選擇地點後，角色會沿道路走過去；途中隨時能改變方向。</DialogDescription></DialogHeader><div className="field-map-preview"><span style={{left: position.x / FIELD.width * 100 + "%", top: position.y / FIELD.height * 100 + "%"}}/></div><div className="field-place-list">{fieldPlaces.filter(place => place.kind === "npc" || place.kind === "portal" || place.kind === "bell").map(place => <button key={place.id} data-place-id={place.id} onClick={() => navigate(place)}><span>{place.kind === "npc" ? <MessageCircle size={16}/> : place.kind === "portal" ? <Swords size={16}/> : <Music2 size={16}/>} {place.name}</span><small>{Math.round(distance(position, place) / 15)}m <ArrowRight size={13}/></small></button>)}</div></DialogContent></Dialog>
    <Dialog open={bell} onOpenChange={setBell}><DialogContent className="bell-dialog"><DialogHeader><span className="eyebrow">A MELODY YOU CAN TOUCH</span><DialogTitle>{data.field.bellSolved ? "小鎮記起了自己的旋律" : "三塊共鳴石，留著同一段記憶"}</DialogTitle><DialogDescription>石座上刻著：先低吟，再仰望，最後回到心間。依「低 → 高 → 中」的順序，走近並敲響三塊石頭，讓鐘樓回應你。</DialogDescription></DialogHeader><div className="bell-sequence" aria-label="本次敲響的音序">{bellSolution.map((id, index) => <span key={id} className={data.field.bellSequence[index] === id ? "lit" : ""}>{index + 1}<strong>{id === "bell-low" ? "低" : id === "bell-high" ? "高" : "中"}</strong>{data.field.bellSequence[index] === id && <Check size={14}/>}</span>)}</div><p>不開聲音也能完成，音高會以文字標示。不扣星露，也不影響主線。</p><button className="primary-button" onClick={() => setBell(false)}>我去試試<Music2 size={17}/></button></DialogContent></Dialog>
    {encounter && <AdventureWorld key={encounter} character={character} progressStamp={dreams.map(dream => dream.revision).join(":")} onRefresh={onRefresh} onQuest={id => {setEncounter(null);onQuest(id);}} onExit={() => {setEncounter(null);void reload();}} initialEpisodeId={encounter} encounter/>}
  </main>;
}

function WorldPlace({place, active, tracked, discovered, onClick}: {place: FieldPlace; active: boolean; tracked: boolean; discovered: boolean; onClick: () => void}) {
  const npc = place.kind === "npc" ? npcOf(place.id) : undefined;
  return <button className={`world-place ${place.kind} ${active ? "nearby" : ""} ${tracked ? "tracked" : ""} ${discovered ? "discovered" : ""}`} style={{left: place.x, top: place.y, zIndex: Math.round(place.y)}} aria-label={`前往${place.name}`} onClick={event => {event.stopPropagation();onClick();}}>
    {npc ? <><i className="npc-ground-shadow"/><span className="field-npc-sprite" role="img" aria-label={npc.name + "，" + npc.role} style={{backgroundPosition: `${npc.portrait % 3 / 2 * 100}% ${Math.floor(npc.portrait / 3) * 100}%`}}/><span className="place-label">{npc.name}{tracked && <b>!</b>}</span></> : <><span className="place-object">{place.kind === "echo" ? <Sparkles size={26}/> : place.kind === "bell" ? <Music2 size={23}/> : <Compass size={38}/>}</span><span className="place-label">{place.name}</span></>}
  </button>;
}
