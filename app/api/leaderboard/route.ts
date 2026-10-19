import {owner, failure} from "@/lib/dream-store";
import {characterState, leaderboardState} from "@/lib/character-store";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const ownerId = await owner();
    await characterState(ownerId);
    return Response.json(await leaderboardState(ownerId), {headers: {"Cache-Control": "private, no-store"}});
  } catch (error) {return failure(error);}
}
