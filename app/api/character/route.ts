import {z} from "zod";
import {owner, prepared, failure, checkOrigin, ApiError} from "@/lib/dream-store";
import {characterState} from "@/lib/character-store";
import {avatarColors, canAdvance, canBecome, canLearnTalent, equipment, equipmentSlots, nextEvolution, professionIds, professionOf, talentIds, talents} from "@/lib/character-model";
import {islandState} from "@/lib/island-store";
import {walletBalanceSql} from "@/lib/wallet-store";

export const dynamic = "force-dynamic";
const actionSchema = z.discriminatedUnion("action", [
  z.object({action: z.literal("profile"), name: z.string().trim().min(1).max(24), avatarColor: z.enum(avatarColors), leaderboardOptIn: z.boolean()}).strict(),
  z.object({action: z.literal("profession"), profession: z.enum(professionIds)}).strict(),
  z.object({action: z.literal("talent"), talentId: z.enum(talentIds)}).strict(),
  z.object({action: z.literal("advance")}).strict(),
  z.object({action: z.literal("purchase"), itemId: z.string().min(1).max(60)}).strict(),
  z.object({action: z.literal("equip"), slot: z.enum(equipmentSlots), itemId: z.string().min(1).max(60).nullable()}).strict(),
]);
export async function GET() {
  try {return Response.json({character: await characterState(await owner())}, {headers: {"Cache-Control": "private, no-store"}});}
  catch (error) {return failure(error);}
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const ownerId = await owner();
    const data = actionSchema.parse(await request.json());
    const state = await characterState(ownerId);
    const db = prepared();
    switch (data.action) {
      case "profile":
        await db.prepare("UPDATE character_profiles SET name=?,avatar_color=?,leaderboard_opt_in=? WHERE owner_id=?")
          .bind(data.name, data.avatarColor, Number(data.leaderboardOptIn), ownerId).run();
        break;
      case "profession": {
        const profession = professionOf(data.profession);
        if (!canBecome(profession, state)) throw new ApiError(400, "還沒完成這個職業的基礎修練，看看下方的解鎖條件吧");
        await db.prepare("UPDATE character_profiles SET profession=? WHERE owner_id=?").bind(profession.id, ownerId).run();
        break;
      }
      case "talent": {
        const talent = talents.find(talent => talent.id === data.talentId)!;
        if (state.availableTalentPoints < 1) throw new ApiError(400, "天賦點不足；角色每升一級獲得 1 點");
        if (!canLearnTalent(talent, state)) throw new ApiError(400, "尚未達到等級或前置天賦條件，或此節點已滿階");
        // The budget is rechecked inside this write; concurrent requests cannot overspend.
        const result = await db.prepare(`INSERT INTO character_talents(owner_id,talent_id,rank)
          SELECT ?,?,1 WHERE COALESCE((SELECT SUM(rank) FROM character_talents WHERE owner_id=?),0)<?
          ON CONFLICT(owner_id,talent_id) DO UPDATE SET rank=rank+1 WHERE rank<?`)
          .bind(ownerId, talent.id, ownerId, state.level - 1, talent.maxRank).run();
        if (result.meta.changes !== 1) throw new ApiError(409, "天賦已更新或達到上限，請重新載入角色");
        break;
      }
      case "advance": {
        const stage = state.advancements[state.profession];
        const next = nextEvolution(state.profession, stage);
        if (!next) throw new ApiError(400, state.profession === "wanderer" ? "請先選擇一個基礎職業，再進行職業進化" : "目前進化路線已完成，角色仍可繼續升級與修練");
        if (!canAdvance(state.profession, stage, state)) throw new ApiError(400, `進化為${next.name}需要 Lv.${next.level}，以及對應技能 R${next.skillRank}`);
        // Recheck both the active class and prior stage in this write. A double
        // tap or concurrent class switch cannot skip a stage or upgrade another class.
        const result = await db.prepare(`INSERT INTO character_advancements(owner_id,profession,stage)
          SELECT ?,?,? WHERE (SELECT profession FROM character_profiles WHERE owner_id=?)=?
          AND COALESCE((SELECT stage FROM character_advancements WHERE owner_id=? AND profession=?),0)=?
          ON CONFLICT(owner_id,profession) DO UPDATE SET stage=excluded.stage
          WHERE character_advancements.stage=excluded.stage-1`)
          .bind(ownerId, state.profession, next.stage, ownerId, state.profession, ownerId, state.profession, stage).run();
        if (result.meta.changes !== 1) throw new ApiError(409, "職業狀態剛剛已更新，請重新載入後再進化");
        break;
      }
      case "purchase": {
        const item = equipment.find(item => item.id === data.itemId);
        if (!item) throw new ApiError(400, "這件裝備不存在");
        if (state.level < item.level) throw new ApiError(400, "角色等級還沒解鎖這件裝備");
        if (state.inventory.includes(item.id)) break;
        await islandState(ownerId); // Backfill existing completion rewards before checking the shared wallet.
        const result = await db.prepare(`INSERT OR IGNORE INTO character_inventory(owner_id,item_id,cost,created_at)
          SELECT ?,?,?,? WHERE ${walletBalanceSql}>=?`)
          .bind(ownerId, item.id, item.cost, new Date().toISOString(), ownerId, ownerId, ownerId, item.cost).run();
        if (result.meta.changes !== 1) {
          const owned = await db.prepare("SELECT item_id FROM character_inventory WHERE owner_id=? AND item_id=?").bind(ownerId, item.id).first();
          if (!owned) throw new ApiError(400, "星露不足，完成生活中的小目標就能累積更多");
        }
        break;
      }
      case "equip": {
        const item = equipment.find(item => item.id === data.itemId);
        if (data.itemId !== null && (!item || item.slot !== data.slot || !state.inventory.includes(item.id))) throw new ApiError(400, "只能穿戴已擁有、且位置相符的裝備");
        const column = {weapon: "weapon_id", outfit: "outfit_id", charm: "charm_id", head: "head_id", offhand: "offhand_id", boots: "boots_id"}[data.slot];
        await db.prepare(`UPDATE character_profiles SET ${column}=? WHERE owner_id=?`).bind(data.itemId, ownerId).run();
        break;
      }
    }
    return Response.json({character: await characterState(ownerId), island: await islandState(ownerId)});
  } catch (error) {return failure(error);}
}
