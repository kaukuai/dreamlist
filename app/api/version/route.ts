import { browserPreview } from "@/lib/app-mode";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    application: "dreamlist",
    release: browserPreview ? "npc-rpg-preview-v1" : "npc-rpg-v1",
    mode: browserPreview ? "browser" : "cloud",
    commit: process.env.DREAMLIST_BUILD_SHA ?? "workspace",
    features: ["daily-quests", "npc-quests", "character", "equipment", "talents", "professions"],
  }, { headers: { "Cache-Control": "no-store" } });
}
