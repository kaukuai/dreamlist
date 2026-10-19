import {z} from 'zod';
import {owner,prepared,failure,checkOrigin,ApiError} from '@/lib/dream-store';
import {islandState,moveItem} from '@/lib/island-store';
import {buildings} from '@/lib/island-model';
import {walletBalanceSql} from '@/lib/wallet-store';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json({island:await islandState(await owner())},{headers:{'Cache-Control':'no-store'}});}catch(e){return failure(e);}}
const purchase=z.object({action:z.literal('purchase'),kind:z.string(),slot:z.number().int().min(0).max(5),requestId:z.string().uuid()}).strict();
const move=z.object({action:z.literal('move'),id:z.string().min(1).max(100),slot:z.number().int().min(0).max(5)}).strict();
const rename=z.object({action:z.literal('rename'),name:z.string().trim().min(1).max(24)}).strict();
export async function POST(request:Request){try{
 checkOrigin(request);const ownerId=await owner();const data=z.union([purchase,move,rename]).parse(await request.json());
 if(data.action==='rename'){await prepared().prepare('INSERT INTO island_profiles(owner_id,name) VALUES(?,?) ON CONFLICT(owner_id) DO UPDATE SET name=excluded.name').bind(ownerId,data.name).run();}
 else if(data.action==='move')await moveItem(ownerId,data.id,data.slot);
 else{
 const building=buildings.find(b=>b.id===data.kind);if(!building)throw new ApiError(400,'這項建設不存在');
 const state=await islandState(ownerId);if(state.level<building.level)throw new ApiError(400,'島嶼等級還未解鎖這項建設');
 const old=await prepared().prepare('SELECT owner_id,kind,slot FROM island_items WHERE id=?').bind(data.requestId).first<{owner_id:string;kind:string;slot:number}>();
 if(old){if(old.owner_id!==ownerId||old.kind!==data.kind||old.slot!==data.slot)throw new ApiError(409,'購買識別已使用');return Response.json({island:await islandState(ownerId)});}
 if(state.items.some(i=>i.slot===data.slot))throw new ApiError(409,'這個位置已有建設');
 if(state.items.some(i=>i.kind===data.kind))throw new ApiError(409,'這項建設已收藏，可以在島上移動它');
 // One conditional insert serializes spending and prevents overdrafts across tabs.
 let result;
 try{result=await prepared().prepare(`INSERT INTO island_items(id,owner_id,kind,slot,cost,created_at) SELECT ?,?,?,?,?,?
 WHERE ${walletBalanceSql}>=?`).bind(data.requestId,ownerId,data.kind,data.slot,building.cost,new Date().toISOString(),ownerId,ownerId,ownerId,building.cost).run();}
 catch(error){if(error instanceof Error&&/UNIQUE constraint|constraint failed/i.test(error.message))throw new ApiError(409,'建設或位置剛剛已更新，請重新載入小島');throw error;}
 if(result.meta.changes!==1)throw new ApiError(400,'星露不足，完成小目標就能獲得更多');
 }
 return Response.json({island:await islandState(ownerId)});
 }catch(e){return failure(e);}}

