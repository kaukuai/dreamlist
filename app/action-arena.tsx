"use client";
import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties} from "react";
import {ArrowLeft, Check, Crown, Heart, LoaderCircle, Pause, Play, Shield, Sparkles, Swords, Wind} from "lucide-react";
import {ARENA, arenaHint, emptyArenaInput, stepArena, type ArenaInput, type ArenaState} from "@/lib/arena-engine";
import type {AdventureView} from "@/lib/adventure-model";
import {professionMoves} from "@/lib/adventure-model";
import {enemyOf, episodeOf} from "@/lib/adventure-catalog";
import type {CharacterState} from "@/lib/character-model";
import {arenaToScreen,arenaView,screenToArena} from "@/lib/arena-view";
import {facingFromVector} from "@/lib/pixel-actors";
import {walkFrame} from "@/lib/sprite-catalog";
import {CombatGround} from "./combat-ground";
import {bindGround} from "@/lib/touch-controls";
import {GameButton, MovementPad} from "./field-controls";
import {useGameSound} from "./game-sound";

type Props = {data: AdventureView; character: CharacterState; error: string; onAction: (action: object) => Promise<AdventureView | undefined>; onBack: () => void; onStory: () => void};
export default function ActionArena({data, character, error, onAction, onBack, onStory}: Props) {
  const battle = data.battle!, enemy = enemyOf(battle.enemyId)!;
  const sound = useGameSound();
  const [size,setSize]=useState({width:390,height:844});
  const [artReady,setArtReady]=useState(false);
  const theme=episodeOf(battle.episodeId)?.region;
  const [frame, setFrame] = useState<ArenaState>(() => structuredClone(battle.arena!));
  const live = useRef(structuredClone(battle.arena!)), input = useRef(emptyArenaInput()), queue = useRef<ArenaInput[]>([]), ack = useRef(battle.arena!.tick);
  const stage = useRef<HTMLDivElement | null>(null);
  const pending = useRef<Promise<boolean> | null>(null), paused = useRef(true), autoAttack = useRef(false), target = useRef<{x: number; y: number} | null>(null);
  const [isPaused, setPaused] = useState(true), [attacking, setAttacking] = useState(false), [saveError, setSaveError] = useState("");
  const [help, setHelp] = useState(battle.arena!.tick === 0);
  const callbacks = useRef({onAction, sound}), keys = useRef(new Set<string>()), heard = useRef(battle.arena!.eventId);
  useLayoutEffect(() => {callbacks.current = {onAction, sound};});
  async function flush(): Promise<boolean> {
    if (pending.current) return pending.current;
    if (!queue.current.length) return true;
    const frames = queue.current.slice(0, 45), fromTick = ack.current;
    const operation = callbacks.current.onAction({action: "arenaAdvance", battleId: battle.id, fromTick, frames}).then(updated => {
      if (!updated?.battle?.arena) {paused.current = true;setPaused(true);setSaveError("戰況尚未保存。請重試保存，或重新接續此瀏覽器的最新戰況。");return false;}
      queue.current.splice(0, frames.length);ack.current = updated.battle.arena.tick;setSaveError("");return true;
    }).finally(() => {pending.current = null;});
    pending.current = operation;return operation;
  }
  const flushRef = useRef(flush);useLayoutEffect(() => {flushRef.current = flush;});
  async function drain() {
    paused.current = true;input.current = emptyArenaInput();keys.current.clear();target.current = null;
    while (pending.current || queue.current.length) {if (!await flushRef.current()) return false;}
    return true;
  }
  const drainRef = useRef(drain);useLayoutEffect(() => {drainRef.current = drain;});
  useEffect(() => {
    callbacks.current.sound.mood("battle");
    const unbindGround = stage.current ? bindGround(stage.current, point => {if (paused.current || live.current.phase !== "active") return;const box = stage.current!.getBoundingClientRect();target.current = screenToArena(arenaView(box.width,box.height,live.current.x),{x:point.x-box.x,y:point.y-box.y});if (Math.hypot(target.current.x - live.current.enemyX, target.current.y - live.current.enemyY) < 70) {autoAttack.current = true;setAttacking(true);}}) : () => {};
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest("input,textarea,select,[role=dialog]") || event.key === " " && (event.target as HTMLElement).closest("button")) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Shift", "w", "a", "s", "d", "j", "k", "l"].includes(event.key)) event.preventDefault();
      keys.current.add(event.key.toLowerCase());
      if (event.repeat) return;
      if (event.key === " ") {autoAttack.current = !autoAttack.current;setAttacking(autoAttack.current);}
      if (event.key === "Shift") input.current.dash = true;
      if (event.key.toLowerCase() === "k") input.current.skill = true;
      if (event.key.toLowerCase() === "l") input.current.mend = true;
      if (event.key === "Escape") {paused.current = true;setPaused(true);void drainRef.current();}
    };
    const release = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const loseFocus = () => {paused.current = true;setPaused(true);keys.current.clear();input.current = emptyArenaInput();void drainRef.current();};
    const visibility = () => {if (document.hidden) loseFocus();};
    const blur = () => {keys.current.clear();if (document.hidden) loseFocus();};
    window.addEventListener("keydown", onKey);window.addEventListener("keyup", release);window.addEventListener("blur", blur);document.addEventListener("visibilitychange", visibility);window.addEventListener("reverie:pause", loseFocus);
    let animation = 0, last = performance.now(), accumulator = 0;
    const tick = (now: number) => {
      accumulator += Math.min(.1, (now - last) / 1000);last = now;
      if (!paused.current && live.current.phase === "active") {
        while (accumulator >= ARENA.step && queue.current.length < 44) {
          let x = input.current.x, y = input.current.y;
          if (keys.current.size) {x += Number(keys.current.has("d") || keys.current.has("arrowright")) - Number(keys.current.has("a") || keys.current.has("arrowleft"));y += Number(keys.current.has("s") || keys.current.has("arrowdown")) - Number(keys.current.has("w") || keys.current.has("arrowup"));}
          if (target.current && !x && !y) {const dx = target.current.x - live.current.x, dy = target.current.y - live.current.y, distance = Math.hypot(dx, dy);if (distance < 7) target.current = null;else {x = dx / distance;y = dy / distance;}}
          const controls = {...input.current, x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)), attack: autoAttack.current};
          queue.current.push(controls);stepArena(live.current, controls);input.current.dash = false;input.current.skill = false;input.current.mend = false;
          accumulator -= ARENA.step;
          if (live.current.phase !== "active") break;
        }
        for (const event of live.current.events.filter(event => event.id > heard.current)) {callbacks.current.sound.cue(event.kind);heard.current = event.id;}
        setFrame(structuredClone(live.current));
        if (queue.current.length >= 15 || live.current.phase !== "active") void flushRef.current();
      } else accumulator = 0;
      animation = requestAnimationFrame(tick);
    };
    animation = requestAnimationFrame(tick);
    return () => {cancelAnimationFrame(animation);unbindGround();window.removeEventListener("keydown", onKey);window.removeEventListener("keyup", release);window.removeEventListener("blur", blur);document.removeEventListener("visibilitychange", visibility);window.removeEventListener("reverie:pause", loseFocus);callbacks.current.sound.mood("town");};
  }, []);
  useEffect(()=>{if(!stage.current)return;const observer=new ResizeObserver(([entry])=>setSize({width:entry.contentRect.width,height:entry.contentRect.height}));observer.observe(stage.current);return()=>observer.disconnect();},[]);
  function begin() {setHelp(false);setPaused(false);paused.current = false;void sound.resume();}
  async function pause() {setPaused(true);await drain();}
  async function assist() {
    if (!await drain()) return;
    const updated = await onAction({action: "arenaAssist", battleId: battle.id, fromTick: ack.current, enabled: !live.current.assist});
    if (updated?.battle?.arena) {live.current.assist = updated.battle.arena.assist;setFrame(structuredClone(live.current));}
  }
  async function leave() {if (await drain()) onBack();}
  function retryLatest() {live.current = structuredClone(data.battle!.arena!);ack.current = live.current.tick;queue.current = [];setFrame(structuredClone(live.current));setSaveError("");}
  const swing=frame.events.findLast(event=>event.kind==="swing"&&frame.tick-event.tick<12);
  const recent = frame.events.filter(event => frame.tick - event.tick <= 15);
  const view=arenaView(size.width,size.height,frame.x);
  const locate=(x:number,y:number):CSSProperties=>{const p=arenaToScreen(view,{x,y});return {left:p.x,top:p.y};};
  return <main className="action-arena illustrated-battle" aria-label="可操作的回聲試煉">
    <div className="arena-topline"><GameButton aria-label="暫停試煉" onActivate={() => void pause()}><Pause size={19}/><span>暫停</span></GameButton><span>回聲試煉{battle.practice ? "・再次挑戰" : "・初次挑戰"}</span><span className="arena-save">{data.battle?.arena?.tick === frame.tick ? <Check size={13}/> : <LoaderCircle size={13}/>}戰況保存</span></div>
    <div className="arena-enemy-bar"><span>{enemy.boss && <Crown size={15}/>}<strong>{enemy.name}</strong><b>{frame.enemyHp} / {frame.enemyMaxHp}</b></span><div><i style={{width: frame.enemyHp / frame.enemyMaxHp * 100 + "%"}}/></div></div>
    <div className="arena-playfield" role="application" aria-label="試煉戰場：點選地面移動，也可用方向鍵" tabIndex={0} ref={stage}>
      <CombatGround appearance={character} state={frame} kind={enemy.kind} tier={character.advancements[frame.profession]} theme={theme==="archive"?"archive":theme==="dawnrift"?"rift":"sanctuary"} onReady={setArtReady}/>
      {frame.hazards.map(hazard=><span key={hazard.id} className="arena-hazard-label" style={locate(hazard.x,hazard.y-hazard.radius-12)}>{hazard.kind==="ring"?"環形衝擊 · 中心安全":"落雷將至"}</span>)}
      <div className="arena-opponent arena-render-marker" style={locate(frame.enemyX,frame.enemyY)} aria-label="試煉對手"><span className="pixel-enemy" role="img" aria-label={enemy.name}/></div>
      <div data-player-x={frame.x.toFixed(1)} data-player-y={frame.y.toFixed(1)} className="arena-player arena-render-marker" style={locate(frame.x,frame.y)}><span className="pixel-actor" data-ready="true" data-facing={swing?facingFromVector(frame.enemyX-frame.x,frame.enemyY-frame.y):facingFromVector(Math.cos(frame.facing),Math.sin(frame.facing))} data-walk-pose={walkFrame(frame.travelled??0)} role="img" aria-label={character.name}/></div>
      {recent.filter(event=>["hit","hurt","heal"].includes(event.kind)).map(event => <span key={event.id} className={"arena-feedback " + event.kind} style={locate(event.x, event.y)}>{event.kind === "hit" ? event.value : event.kind === "hurt" ? `−${event.value}` : event.kind === "heal" ? `+${event.value}` : event.kind === "dash" ? "閃避" : event.kind === "swing" ? "✧" : ""}</span>)}
      <div className={"arena-intent " + (frame.hazards.length ? "urgent" : "")} role="status">{frame.hazards.length ? <Wind size={16}/> : <Swords size={15}/>}<span>{arenaHint(frame)}</span></div>
    </div>
    <div className="arena-vitals"><span><Heart size={14}/>{frame.hp}<small>/ {frame.maxHp}</small></span><div className="arena-hp"><i style={{width: frame.hp / frame.maxHp * 100 + "%"}}/></div><span className="arena-focus" aria-label={`專注 ${frame.focus}，上限3`}>{[1, 2, 3].map(point => <i key={point} className={frame.focus >= point ? "lit" : ""}/>)}<small>專注</small></span></div>
    <div className="arena-controls"><MovementPad onMove={point => {input.current.x = point.x;input.current.y = point.y;target.current = null;}}/><div className="arena-actions"><GameButton className="arena-heal" aria-label="調息恢復生命" disabled={frame.focus < 2 || frame.hp === frame.maxHp || frame.skillCd > 0} onActivate={() => {input.current.mend = true;}}><Heart size={17}/><small>調息</small></GameButton><GameButton className="arena-skill" disabled={frame.focus < 2 || frame.skillCd > 0} onActivate={() => {input.current.skill = true;}}><Sparkles size={22}/><span>{professionMoves[frame.profession].name}</span></GameButton><GameButton className="arena-dash" disabled={frame.dashCd > 0} onActivate={() => {input.current.dash = true;}}><Wind size={22}/><span>{frame.dashCd > 0 ? frame.dashCd.toFixed(1) : "閃避"}</span></GameButton><GameButton className={"arena-attack " + (attacking ? "is-active" : "")} aria-pressed={attacking} onActivate={() => {autoAttack.current = !autoAttack.current;setAttacking(autoAttack.current);}}><Swords size={29}/><span>{attacking ? "停止普攻" : "持續普攻"}</span></GameButton></div></div>
    {(isPaused && frame.phase === "active" || frame.phase !== "active") && <div className="arena-pause-backdrop"><section className="arena-pause-panel" role="dialog" aria-modal="true" aria-label={frame.phase === "won" ? "試煉通過" : frame.phase === "lost" ? "試煉結束" : "試煉暫停"}>
      {frame.phase === "active" ? <><span className="eyebrow">{help ? "YOUR FIRST ECHO TRIAL" : "TAKE YOUR TIME"}</span><h2>{help ? "這一次，由你親自出手。" : "試煉已暫停"}</h2><p>點地面、按住十字鍵，或切換搖桿走位。開啟持續普攻後，靠近對手就會出招；看見落雷標記時，走出範圍或按閃避。</p><p className="arena-key-hint">方向鍵 / WASD 移動 · 空白鍵普攻<br/>Shift 閃避 · K 戰技 · L 調息</p><button className="primary-button" disabled={!!saveError || !artReady} onClick={begin}><Play size={18}/>{help ? "進入試煉" : "繼續戰鬥"}</button><button className="secondary-button" onClick={() => void assist()}><Shield size={16}/>{frame.assist ? "從容模式已開啟" : "開啟從容模式"}</button><small>從容模式延長預警、降低傷害；故事與獎勵相同。</small><button className="text-button" onClick={() => void leave()}><ArrowLeft size={15}/>暫離・保存目前戰況</button></> : frame.phase === "won" ? <><Crown size={38}/><h2>你尋回了這段回聲</h2><p>是你的觀察、走位與修練，讓眼前的光重新亮起。</p><button className="primary-button" disabled={data.battle?.phase !== "won"} onClick={onStory}>{data.battle?.phase !== "won" ? <LoaderCircle className="spin" size={17}/> : <Sparkles size={17}/>}帶回回聲，繼續故事</button></> : <><Shield size={34}/><h2>可以換個節奏再試。</h2><p>角色 XP、裝備與材料都保留。先回到小鎮，或開啟從容模式再挑戰。</p><button className="primary-button" onClick={onStory}>回到篇章</button><button className="text-button" onClick={onBack}>回到小鎮</button></>}
      {(saveError || error) && <div role="alert" className="arena-save-error"><p>{saveError || error}</p><button className="secondary-button" onClick={() => void drain()}>重試保存</button><button className="text-button" onClick={retryLatest}>接續已保存的戰況</button></div>}
    </section></div>}
  </main>;
}
