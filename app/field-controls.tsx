"use client";
import {useRef, useState, type PointerEvent} from "react";
import {ArrowDown, ArrowLeft, ArrowRight, ArrowUp} from "lucide-react";
import type {Point} from "@/lib/field-engine";

export function MovementPad({onMove}: {onMove: (point: Point) => void}) {
  const pointer = useRef<number | null>(null), [thumb, setThumb] = useState({x: 0, y: 0});
  function move(event: PointerEvent<HTMLDivElement>) {
    if (pointer.current !== event.pointerId) return;
    const box = event.currentTarget.getBoundingClientRect(), x = event.clientX - box.x - box.width / 2, y = event.clientY - box.y - box.height / 2;
    const size = Math.max(1, Math.hypot(x, y) / 32), next = {x: x / size, y: y / size};setThumb(next);onMove({x: next.x / 32, y: next.y / 32});
  }
  function end(event: PointerEvent<HTMLDivElement>) {if (pointer.current !== event.pointerId) return;pointer.current = null;setThumb({x: 0, y: 0});onMove({x: 0, y: 0});}
  return <div className="movement-pad" aria-label="角色移動控制">
    <div className="movement-stick" onPointerDown={event => {event.stopPropagation();pointer.current = event.pointerId;event.currentTarget.setPointerCapture(event.pointerId);move(event);}} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}><span className="stick-guides" aria-hidden="true">✧</span><span className="stick-thumb" style={{transform: `translate(${thumb.x}px,${thumb.y}px)`}}/></div>
    <div className="movement-digital" aria-label="單次方向移動">{[{name: "上", x: 0, y: -1, Icon: ArrowUp}, {name: "左", x: -1, y: 0, Icon: ArrowLeft}, {name: "下", x: 0, y: 1, Icon: ArrowDown}, {name: "右", x: 1, y: 0, Icon: ArrowRight}].map(item => <button key={item.name} aria-label={`向${item.name}移動`} onClick={() => {onMove({x: item.x, y: item.y});setTimeout(() => onMove({x: 0, y: 0}), 180);}}><item.Icon size={16}/></button>)}</div>
  </div>;
}
