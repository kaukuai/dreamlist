"use client";
import {useEffect, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode} from "react";
import {ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Gamepad2, Move} from "lucide-react";
import {bindDirection, bindStick, bindTap, type Axis} from "@/lib/touch-controls";

export function GameButton({onActivate, children, ...props}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> & {onActivate: () => void; children: ReactNode}) {
  const element = useRef<HTMLButtonElement | null>(null), callback = useRef(onActivate);
  useLayoutEffect(() => {callback.current = onActivate;});
  useEffect(() => {if (element.current) return bindTap(element.current, () => callback.current());}, []);
  return <button type="button" {...props} ref={element} data-touch-control="action">{children}</button>;
}
function DirectionKey({axis, label, children, onMove}: {axis: Axis; label: string; children: ReactNode; onMove: (axis: Axis) => void}) {
  const element = useRef<HTMLButtonElement | null>(null), callback = useRef(onMove), [held, setHeld] = useState(false);
  useLayoutEffect(() => {callback.current = onMove;});
  useEffect(() => {if (element.current) return bindDirection(element.current, axis, point => callback.current(point), setHeld);}, [axis]);
  return <button type="button" ref={element} className={held ? "is-held" : ""} aria-label={label} data-touch-control="direction">{children}</button>;
}
const directions = [{name: "上", x: 0, y: -1, Icon: ArrowUp}, {name: "左", x: -1, y: 0, Icon: ArrowLeft}, {name: "右", x: 1, y: 0, Icon: ArrowRight}, {name: "下", x: 0, y: 1, Icon: ArrowDown}] as const;
const modeKey = "dreamlist:control-mode:v1";
export function MovementPad({onMove}: {onMove: (point: Axis) => void}) {
  const element = useRef<HTMLDivElement | null>(null), callback = useRef(onMove), [thumb, setThumb] = useState({x: 0, y: 0}), [mode, setMode] = useState<"pad" | "stick">("pad");
  useLayoutEffect(() => {callback.current = onMove;});
  useEffect(() => {
    const sync = () => {try {setMode(localStorage.getItem(modeKey) === "stick" ? "stick" : "pad");} catch { /* Session controls still work. */ }};
    void Promise.resolve().then(sync);window.addEventListener("reverie:controls-mode", sync);window.addEventListener("storage", sync);
    return () => {window.removeEventListener("reverie:controls-mode", sync);window.removeEventListener("storage", sync);};
  }, []);
  useEffect(() => {if (mode === "stick" && element.current) return bindStick(element.current, point => callback.current(point), setThumb);}, [mode]);
  function switchMode() {callback.current({x: 0, y: 0});const next = mode === "pad" ? "stick" : "pad";setMode(next);try {localStorage.setItem(modeKey, next);window.dispatchEvent(new Event("reverie:controls-mode"));} catch { /* The chosen mode remains usable in this view. */ }}
  return <div className="movement-pad" aria-label="角色移動控制" data-control-mode={mode}>
    {mode === "pad" ? <div className="movement-dpad" aria-label="十字方向鍵">{directions.map(direction => <DirectionKey key={direction.name} axis={direction} label={`向${direction.name}移動`} onMove={onMove}><direction.Icon size={21}/></DirectionKey>)}<span aria-hidden="true">✧</span></div> : <div ref={element} className="movement-stick" data-touch-control="stick"><span className="stick-guides" aria-hidden="true">✧</span><span className="stick-thumb" style={{transform: `translate(${thumb.x}px,${thumb.y}px)`}}/></div>}
    <GameButton className="movement-mode" aria-label={mode === "pad" ? "改用搖桿" : "改用十字鍵"} onActivate={switchMode}>{mode === "pad" ? <Move size={12}/> : <Gamepad2 size={12}/>} {mode === "pad" ? "改用搖桿" : "改用十字鍵"}</GameButton>
  </div>;
}
