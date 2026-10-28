import { browserPreview } from "@/lib/app-mode";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    application: "dreamlist",
    release: browserPreview ? "direct-play-audio-v1" : "npc-rpg-v1",
    mode: browserPreview ? "browser" : "cloud",
    commit: process.env.DREAMLIST_BUILD_SHA ?? "workspace",
    features: ["daily-quests", "npc-quests", "character", "equipment", "talents", "professions", ...(browserPreview ? ["story-campaign", "world-map", "turn-based-combat", "companion-stories", "runecrafting", "memory-codex", "walkable-town", "action-combat", "original-soundtrack", "audio-controls", "field-puzzle", "focused-life-actions"] : [])],
  }, { headers: { "Cache-Control": "no-store" } });
}
