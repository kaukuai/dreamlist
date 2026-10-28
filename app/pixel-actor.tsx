"use client";
import {memo} from "react";
import {pixelCharacter, pixelEnemy, pixelLooks, type Facing, type PixelLook} from "@/lib/pixel-actors";

export const PixelActor = memo(function PixelActor({identity, direction = "down", pose = 1, tier = 0, label}: {identity: keyof typeof pixelLooks; direction?: Facing; pose?: 0 | 1 | 2; tier?: number; label: string}) {
  const look: PixelLook = pixelLooks[identity] ?? pixelLooks.wanderer;
  return <svg className="pixel-actor" viewBox="0 0 32 48" role="img" aria-label={label} shapeRendering="crispEdges" data-facing={direction} data-walk-pose={pose} data-identity={identity}>{pixelCharacter(look, direction, pose, tier).map((pixel, index) => <rect key={index} x={pixel.x} y={pixel.y} width={pixel.w} height={pixel.h} fill={pixel.color}/>)}</svg>;
});
export const PixelEnemy = memo(function PixelEnemy({kind, pose, label}: {kind: string; pose: number; label: string}) {
  return <svg className="pixel-enemy" viewBox="0 0 40 48" role="img" aria-label={label} shapeRendering="crispEdges">{pixelEnemy(kind, pose).map((pixel, index) => <rect key={index} x={pixel.x} y={pixel.y} width={pixel.w} height={pixel.h} fill={pixel.color}/>)}</svg>;
});
