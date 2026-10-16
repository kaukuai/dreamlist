import {getD1} from "@/db";
import {getChatGPTUser} from "@/app/chatgpt-auth";
import {z} from "zod";
import type {Dream,Task} from "./dream-model";
export const inputSchema=z.object({
 title:z.string().trim().min(1,"請寫下夢想名稱").max(100),
 description:z.string().trim().max(2000).default(""),
 category:z.enum(["travel","growth","health","career","life","other"]),
 targetDate:z.string().refine(v=>{const time=Date.parse(v+"T00:00:00Z");return !v||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===v);},"日期格式不正確").default(""),
 tasks:z.array(z.object({id:z.string().min(1).max(100),title:z.string().trim().min(1,"小目標不能空白").max(200),done:z.boolean()})).max(200).refine(tasks=>new Set(tasks.map(t=>t.id)).size===tasks.length,"小目標識別重複"),
 revision:z.number().int().positive().optional()
});
export class ApiError extends Error { constructor(public status:number,message:string){super(message);} }
export async function owner(){const user=await getChatGPTUser();if(!user)throw new ApiError(401,"請登入後再使用夢想基地");return user.userId;}
export function checkOrigin(request:Request){const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)throw new ApiError(403,"無法接受這個來源的修改");}
export function serialize(row:Record<string,unknown>):Dream{return {id:String(row.id),title:String(row.title),description:String(row.description),category:String(row.category),targetDate:String(row.target_date),createdAt:String(row.created_at),revision:Number(row.revision),tasks:JSON.parse(String(row.tasks))};}
export function prepared(){return getD1();}
export async function findDream(id:string,ownerId:string){const row=await getD1().prepare("SELECT * FROM dreams WHERE id = ? AND owner_id = ? AND deleted_at IS NULL").bind(id,ownerId).first<Record<string,unknown>>();if(!row)throw new ApiError(404,"這個夢想不存在，請重新整理");return serialize(row);}
export function normalizeTasks(tasks:z.infer<typeof inputSchema>["tasks"],old:Task[]=[],creating=false){const now=new Date().toISOString();return tasks.map(t=>({...t,done:creating?false:t.done,completedAt:!creating&&t.done?(old.find(o=>o.id===t.id&&o.done)?.completedAt??now):null}));}
export function failure(error:unknown){if(error instanceof SyntaxError)return Response.json({error:"資料格式不正確"},{status:400});if(error instanceof ApiError)return Response.json({error:error.message},{status:error.status});if(error instanceof z.ZodError)return Response.json({error:error.issues[0]?.message??"請檢查輸入內容"},{status:400});console.error("Dream storage operation failed",error);return Response.json({error:"目前無法儲存，請稍後重試。你輸入的內容會留在畫面上。"},{status:503});}


