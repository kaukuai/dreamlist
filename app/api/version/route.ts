import { browserPreview } from "@/lib/app-mode";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    application: "dreamlist",
    release: browserPreview ? "companions-wardrobe-rpg-v3" : "npc-rpg-v1",
    mode: browserPreview ? "browser" : "cloud",
    commit: process.env.DREAMLIST_BUILD_SHA ?? "workspace",
    features: ["daily-quests", "npc-quests", "character", "equipment", "talents", "professions", ...(browserPreview ? ["story-campaign", "world-map", "turn-based-combat", "companion-stories", "runecrafting", "memory-codex", "walkable-town", "action-combat", "original-soundtrack", "audio-controls", "field-puzzle", "focused-life-actions", "pixel-map-actors", "native-touch-controls", "visible-dpad", "layered-pixel-world", "three-walkable-areas", "immersive-game-menu", "exploration-notes", "original-scene-art", "world-space-combat", "enemy-animation-atlas", "scene-minimap", "npc-conversations", "companion-quest-chains", "equipment-sprite-appearance", "visible-star-dew-shop"] : [])],
  }, { headers: { "Cache-Control": "no-store" } });
}
