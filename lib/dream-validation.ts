import {z} from "zod";
import type {Task} from "./dream-model";
import {defaultTraining,skillIds,type SkillId} from "./character-model.ts";

export const inputSchema=z.object({
 title:z.string().trim().min(1,"請寫下夢想名稱").max(100),
 description:z.string().trim().max(2000).default(""),
 category:z.enum(["travel","growth","health","career","life","other"]),
 targetDate:z.string().refine(v=>{const time=Date.parse(v+"T00:00:00Z");return !v||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===v);},"日期格式不正確").default(""),
 tasks:z.array(z.object({id:z.string().min(1).max(100),title:z.string().trim().min(1,"小目標不能空白").max(200),done:z.boolean(),training:z.enum(skillIds).optional()})).max(200).refine(tasks=>new Set(tasks.map(t=>t.id)).size===tasks.length,"小目標識別重複"),
 revision:z.number().int().positive().optional()
});

export function normalizeTasks(tasks:z.infer<typeof inputSchema>["tasks"],old:Task[]=[],creating=false,category="other",awarded:Map<string,SkillId>=new Map()){
 const now=new Date().toISOString();
 return tasks.map(t=>({...t,training:awarded.get(t.id)??t.training??old.find(o=>o.id===t.id)?.training??defaultTraining(category),trainingLocked:awarded.has(t.id)||(!creating&&t.done),done:creating?false:t.done,completedAt:!creating&&t.done?(old.find(o=>o.id===t.id&&o.done)?.completedAt??now):null}));
}
