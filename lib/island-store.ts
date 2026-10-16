import {prepared,ApiError} from './dream-store';
import {islandLevel,type IslandState} from './island-model';
// Completion receipts survive edits and are unique per owner / dream / task.
// Re-read persisted goals so concurrent writes can only reward real saved progress.
export function rewardStatements(ownerId:string){
 const db=prepared(); const now=new Date().toISOString();
 return [
 db.prepare(`INSERT OR IGNORE INTO island_rewards(id,owner_id,amount,kind,created_at)
 SELECT ? || ':step:' || d.id || ':' || json_extract(t.value,'$.id'),?,25,'step',?
 FROM dreams d,json_each(d.tasks) t WHERE d.owner_id=? AND d.deleted_at IS NULL AND json_extract(t.value,'$.done')=1`).bind(ownerId,ownerId,now,ownerId),
 db.prepare(`INSERT OR IGNORE INTO island_rewards(id,owner_id,amount,kind,created_at)
 SELECT ? || ':dream:' || d.id,?,100,'dream',? FROM dreams d WHERE d.owner_id=? AND d.deleted_at IS NULL AND json_array_length(d.tasks)>0
 AND NOT EXISTS(SELECT 1 FROM json_each(d.tasks) t WHERE json_extract(t.value,'$.done')!=1)`).bind(ownerId,ownerId,now,ownerId)
 ];
}
export async function islandState(ownerId:string):Promise<IslandState>{
 const db=prepared();
 await db.batch(rewardStatements(ownerId));
 const results=await db.batch([
 db.prepare("SELECT COALESCE(SUM(amount),0) earned,COALESCE(SUM(CASE WHEN kind='step' THEN 1 ELSE 0 END),0) steps,COALESCE(SUM(CASE WHEN kind='dream' THEN 1 ELSE 0 END),0) fulfilled FROM island_rewards WHERE owner_id=?").bind(ownerId),
 db.prepare('SELECT id,kind,slot,cost FROM island_items WHERE owner_id=? ORDER BY slot').bind(ownerId),
 db.prepare('SELECT name FROM island_profiles WHERE owner_id=?').bind(ownerId)
 ]);
 const totals=results[0].results[0] as {earned?:number;steps?:number;fulfilled?:number}|undefined;
 const profile=results[2].results[0] as {name?:string}|undefined;
 const earned=Number(totals?.earned??0);
 const items=results[1].results as IslandState['items'];
 return{earned,balance:100+earned-items.reduce((n,i)=>n+i.cost,0),level:islandLevel(earned),name:String(profile?.name??'曙光小島'),steps:Number(totals?.steps??0),dreamsFulfilled:Number(totals?.fulfilled??0),items};
}
export async function moveItem(ownerId:string,id:string,slot:number){
 const db=prepared();
 const item=await db.prepare('SELECT id,slot FROM island_items WHERE id=? AND owner_id=?').bind(id,ownerId).first<{id:string;slot:number}>();
 if(!item)throw new ApiError(404,'找不到這項建設');
 if(item.slot===slot)return;
 const occupied=await db.prepare('SELECT id FROM island_items WHERE owner_id=? AND slot=? AND id!=?').bind(ownerId,slot,id).first<{id:string}>();
 try{
  if(occupied){
   // A temporary slot lives only inside this transaction. Full islands can swap
   // buildings without losing inventory or requiring an empty construction lot.
   const results=await db.batch([
    db.prepare('UPDATE island_items SET slot=-1 WHERE id=? AND owner_id=? AND slot=? AND EXISTS(SELECT 1 FROM island_items WHERE id=? AND owner_id=? AND slot=?)').bind(id,ownerId,item.slot,occupied.id,ownerId,slot),
    db.prepare('UPDATE island_items SET slot=? WHERE id=? AND owner_id=? AND slot=? AND EXISTS(SELECT 1 FROM island_items WHERE id=? AND owner_id=? AND slot=-1)').bind(item.slot,occupied.id,ownerId,slot,id,ownerId),
    db.prepare('UPDATE island_items SET slot=? WHERE id=? AND owner_id=? AND slot=-1').bind(slot,id,ownerId)
   ]);
   if(results.some(r=>r.meta.changes!==1))throw new ApiError(409,'位置剛剛已更新，請重新載入小島');
  }else{
   const result=await db.prepare('UPDATE island_items SET slot=? WHERE id=? AND owner_id=? AND slot=? AND NOT EXISTS(SELECT 1 FROM island_items WHERE owner_id=? AND slot=?)').bind(slot,id,ownerId,item.slot,ownerId,slot).run();
   if(result.meta.changes!==1)throw new ApiError(409,'位置剛剛已更新，請重新載入小島');
  }
 }catch(error){if(error instanceof Error&&/UNIQUE constraint|constraint failed/i.test(error.message))throw new ApiError(409,'位置剛剛已更新，請重新載入小島');throw error;}
}
