import {owner,prepared,inputSchema,normalizeTasks,findDream,failure,checkOrigin,ApiError} from "@/lib/dream-store";
import {islandState,rewardStatements} from "@/lib/island-store";
import {characterRewardStatements,characterState} from "@/lib/character-store";
import type {SkillId} from "@/lib/character-model";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function PUT(request:Request,context:Context){try{
 checkOrigin(request);const ownerId=await owner();const {id}=await context.params;
 const previous=await findDream(id,ownerId);const data=inputSchema.parse(await request.json());
 if(typeof data.revision!=="number"||data.revision!==previous.revision)throw new ApiError(409,"這個夢想在另一個視窗已更新。請關閉編輯、重新載入後再試，你的草稿仍會保留。");
 if(previous.quest&&(data.title!==previous.title||data.description!==previous.description||data.category!==previous.category||data.targetDate!==previous.targetDate||data.tasks.length!==previous.tasks.length||data.tasks.some((task,index)=>{const old=previous.tasks[index];return task.id!==old.id||task.title!==old.title||(task.training??old.training)!==old.training;})))throw new ApiError(400,"NPC 委託的修練內容固定；你可以完成行動，或另外建立自己的目標");
 // Snapshot older completed goals before edits, including imported pre-RPG goals.
 await prepared().batch(characterRewardStatements(ownerId));
 const receipts=await prepared().prepare("SELECT task_id,skill_id FROM character_rewards WHERE owner_id=? AND dream_id=? AND kind='step'").bind(ownerId,id).all<{task_id:string;skill_id:SkillId}>();
 const tasks=normalizeTasks(data.tasks,previous.tasks,false,data.category,new Map(receipts.results.map(row=>[row.task_id,row.skill_id])));const now=new Date().toISOString();
 const results=await prepared().batch([
  prepared().prepare("UPDATE dreams SET title=?,description=?,category=?,target_date=?,tasks=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=? AND deleted_at IS NULL").bind(data.title,data.description,data.category,data.targetDate,JSON.stringify(tasks),now,id,ownerId,data.revision),
  ...rewardStatements(ownerId),
  ...characterRewardStatements(ownerId)
 ]);
 if(results[0].meta.changes!==1)throw new ApiError(409,"資料剛剛已更新，請重新載入後再試");
 return Response.json({island:await islandState(ownerId),character:await characterState(ownerId),dream:{...previous,title:data.title,description:data.description,category:data.category,targetDate:data.targetDate,tasks,revision:previous.revision!+1}});
 }catch(error){return failure(error);}}
export async function DELETE(request:Request,context:Context){try{checkOrigin(request);const ownerId=await owner();const {id}=await context.params;await findDream(id,ownerId);await prepared().prepare("UPDATE dreams SET deleted_at=?,updated_at=?,revision=revision+1 WHERE id=? AND owner_id=? AND deleted_at IS NULL").bind(new Date().toISOString(),new Date().toISOString(),id,ownerId).run();return Response.json({ok:true});}catch(error){return failure(error);}}

