"use client";
import {createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode} from "react";
import {Music2, Volume2, VolumeX} from "lucide-react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {defaultSound, GameAudio, readSoundSettings, SOUND_KEY, type SoundCue, type SoundMood, type SoundSettings} from "@/lib/game-audio";

type SoundContextValue = {settings: SoundSettings; error: string; enable: () => Promise<void>; update: (settings: SoundSettings) => void; cue: (cue: SoundCue) => void; mood: (mood: SoundMood) => void; resume: () => Promise<void>};
const SoundContext = createContext<SoundContextValue>({settings: defaultSound, error: "", enable: async () => {}, update: () => {}, cue: () => {}, mood: () => {}, resume: async () => {}});
export const useGameSound = () => useContext(SoundContext);
export function SoundProvider({children}: {children: ReactNode}) {
  const [settings, setSettings] = useState({...defaultSound}), [error, setError] = useState("");
  const audio = useRef<GameAudio | null>(null), preferences = useRef(settings);
  useEffect(() => {void Promise.resolve().then(() => {try {const restored = readSoundSettings(localStorage);preferences.current = restored;setSettings(restored);} catch {setError("聲音設定無法讀取，這次先保持安靜。");}});return () => {void audio.current?.close();audio.current = null;};}, []);
  const update = useCallback((next: SoundSettings) => {
    preferences.current = next;setSettings(next);audio.current?.apply(next);
    try {localStorage.setItem(SOUND_KEY, JSON.stringify(next));} catch {setError("聲音設定這次無法保存，角色進度不受影響。");}
  }, []);
  const resume = useCallback(async () => {
    if (!preferences.current.enabled || document.hidden) return;
    audio.current ??= new GameAudio(setError);
    try {await audio.current.unlock(preferences.current);} catch {setError("聲音尚未啟動，請點選開啟聲音再試一次。");}
  }, []);
  const enable = useCallback(async () => {update({...preferences.current, enabled: true});await resume();}, [update, resume]);
  const cue = useCallback((kind: SoundCue) => audio.current?.cue(kind), []);
  const mood = useCallback((next: SoundMood) => {if (!audio.current) {audio.current = new GameAudio(setError);}void audio.current.setMood(next);}, []);
  useEffect(() => {
    const gesture = () => {if (preferences.current.enabled && (!audio.current?.context || audio.current.context.state === "suspended")) void resume();};
    const visibility = () => {if (document.hidden) void audio.current?.suspend();};
    document.addEventListener("pointerdown", gesture, true);document.addEventListener("keydown", gesture, true);document.addEventListener("visibilitychange", visibility);
    return () => {document.removeEventListener("pointerdown", gesture, true);document.removeEventListener("keydown", gesture, true);document.removeEventListener("visibilitychange", visibility);};
  }, [resume]);
  return <SoundContext.Provider value={{settings, error, enable, update, cue, mood, resume}}>{children}</SoundContext.Provider>;
}
export function SoundControls() {
  const sound = useGameSound(), [open, setOpen] = useState(false);
  return <><button className="rpg-icon-button sound-settings-button" aria-label="聲音設定" onClick={() => {window.dispatchEvent(new Event("reverie:pause"));setOpen(true);}}>{sound.settings.enabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}</button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="sound-dialog"><DialogHeader><span className="eyebrow">SOUND OF THE ECHO LANDS</span><DialogTitle>讓旅途有聲音</DialogTitle><DialogDescription>原創探索與戰鬥配樂、環境聲及行動音效。隨時可以安靜遊玩，重要提示也會顯示在畫面上。</DialogDescription></DialogHeader><button className="primary-button" onClick={() => sound.settings.enabled ? sound.update({...sound.settings, enabled: false}) : void sound.enable()}>{sound.settings.enabled ? <VolumeX size={18}/> : <Music2 size={18}/>} {sound.settings.enabled ? "關閉遊戲聲音" : "開啟遊戲聲音"}</button>{([{key: "music", label: "配樂"}, {key: "effects", label: "行動音效"}, {key: "ambience", label: "環境聲"}] as const).map(item => <label className="sound-slider" key={item.key}><span>{item.label}<output>{Math.round(sound.settings[item.key] * 100)}%</output></span><input type="range" min="0" max="100" step="1" aria-label={item.label + "音量"} value={Math.round(sound.settings[item.key] * 100)} onChange={event => sound.update({...sound.settings, [item.key]: Number(event.target.value) / 100})}/></label>)}<button className="text-button" disabled={!sound.settings.enabled} onClick={() => sound.cue("echo")}>試聽回聲提示</button>{sound.error && <p role="alert">{sound.error}</p>}<p className="rpg-footnote">切到背景會暫停聲音；返回後點一下即可接續。<br/>沒有自動播放的廣告或語音。</p></DialogContent></Dialog></>;
}
