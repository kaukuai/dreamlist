import {getD1} from "@/db";
import {getChatGPTUser} from "@/app/chatgpt-auth";
import {z} from "zod";
import type {Dream} from "./dream-model";
import type {NpcId,QuestKind} from "./quest-model";
export {inputSchema,normalizeTasks} from "./dream-validation";
export class ApiError extends Error { constructor(public status:number,message:string){super(message);} }
export async function owner(){const user=await getChatGPTUser();if(!user)throw new ApiError(401,"請登入後再使用夢想基地");return user.userId;}
export function checkOrigin(request:Request){const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)throw new ApiError(403,"無法接受這個來源的修改");}
export const dreamSelectSql="SELECT d.*,q.kind quest_kind,q.template_id quest_template_id,q.npc_id quest_npc_id,q.day_key quest_day_key FROM dreams d LEFT JOIN quest_contracts q ON q.dream_id=d.id AND q.owner_id=d.owner_id";
export function serialize(row:Record<string,unknown>):Dream{return {id:String(row.id),title:String(row.title),description:String(row.description),category:String(row.category),targetDate:String(row.target_date),createdAt:String(row.created_at),revision:Number(row.revision),tasks:JSON.parse(String(row.tasks)),...(row.quest_kind?{quest:{kind:row.quest_kind as QuestKind,npcId:row.quest_npc_id as NpcId,templateId:String(row.quest_template_id),dayKey:String(row.quest_day_key)}}:{})};}
export function prepared(){return getD1();}
export async function findDream(id:string,ownerId:string){const row=await getD1().prepare(dreamSelectSql+" WHERE d.id = ? AND d.owner_id = ? AND d.deleted_at IS NULL").bind(id,ownerId).first<Record<string,unknown>>();if(!row)throw new ApiError(404,"這個夢想不存在，請重新整理");return serialize(row);}
export function failure(error:unknown){if(error instanceof SyntaxError)return Response.json({error:"資料格式不正確"},{status:400});if(error instanceof ApiError)return Response.json({error:error.message},{status:error.status});if(error instanceof z.ZodError)return Response.json({error:error.issues[0]?.message??"請檢查輸入內容"},{status:400});console.error("Dream storage operation failed",error);return Response.json({error:"目前無法儲存，請稍後重試。你輸入的內容會留在畫面上。"},{status:503});}


