import {z} from "zod";
import {checkOrigin, failure, owner} from "@/lib/dream-store";
import {acceptQuest, questBoardState} from "@/lib/quest-store";

export const dynamic = "force-dynamic";
const schema = z.object({offerId: z.string().min(1).max(120)}).strict();
export async function GET() {
  try {return Response.json(await questBoardState(await owner()), {headers: {"Cache-Control": "private, no-store"}});}
  catch (error) {return failure(error);}
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const ownerId = await owner(), data = schema.parse(await request.json());
    const result = await acceptQuest(ownerId, data.offerId);
    return Response.json(result, {status: result.created ? 201 : 200, headers: {"Cache-Control": "private, no-store"}});
  } catch (error) {return failure(error);}
}
