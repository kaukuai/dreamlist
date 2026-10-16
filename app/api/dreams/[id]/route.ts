import {owner,prepared,inputSchema,normalizeTasks,findDream,failure,checkOrigin,ApiError} from "@/lib/dream-store";
import {islandState,rewardStatements} from "@/lib/island-store";
export const dynamic="force-dynamic";
type Context={params:Promise<{id:string}>};
export async function PUT(request:Request,context:Context){try{
 checkOrigin(request);const ownerId=await owner();const {id}=await context.params;
 const previous=await findDream(id,ownerId);const data=inputSchema.parse(await request.json());
 if(data.revision!==previous.revision)throw new ApiError(409,"這個夢想在另一個視窗已更新。請關閉編輯、重新載入後再試，你的草稿仍會保留。");
 const tasks=normalizeTasks(data.tasks,previous.tasks);const now=new Date().toISOString();
 const results=await prepared().batch([
  prepared().prepare("UPDATE dreams SET title=?,description=?,category=?,target_date=?,tasks=?,revision=revision+1,updated_at=? WHERE id=? AND owner_id=? AND revision=? AND deleted_at IS NULL").bind(data.title,data.description,data.category,data.targetDate,JSON.stringify(tasks),now,id,ownerId,data.revision),
  ...rewardStatements(ownerId)
 ]);
 if(results[0].meta.changes!==1)throw new ApiError(409,"資料剛剛已更新，請重新載入後再試");
 return Response.json({island:await islandState(ownerId),dream:{...previous,title:data.title,description:data.description,category:data.category,targetDate:data.targetDate,tasks,revision:previous.revision!+1}});
 }catch(error){return failure(error);}}
export async function DELETE(request:Request,context:Context){try{checkOrigin(request);const ownerId=await owner();const {id}=await context.params;await findDream(id,ownerId);await prepared().prepare("UPDATE dreams SET deleted_at=?,updated_at=?,revision=revision+1 WHERE id=? AND owner_id=? AND deleted_at IS NULL").bind(new Date().toISOString(),new Date().toISOString(),id,ownerId).run();return Response.json({ok:true});}catch(error){return failure(error);}}

