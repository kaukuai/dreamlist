import {integer,sqliteTable,text,index,uniqueIndex,primaryKey} from "drizzle-orm/sqlite-core";
export const dreams=sqliteTable("dreams",{
 id:text("id").primaryKey(),
 ownerId:text("owner_id").notNull(),
 title:text("title").notNull(),
 description:text("description").notNull().default(""),
 category:text("category").notNull(),
 targetDate:text("target_date").notNull().default(""),
 tasks:text("tasks").notNull().default("[]"),
 revision:integer("revision").notNull().default(1),
 createdAt:text("created_at").notNull(),
 updatedAt:text("updated_at").notNull(),
 deletedAt:text("deleted_at")
},(table)=>[index("idx_dreams_owner_id").on(table.ownerId)]);

export const islandRewards=sqliteTable("island_rewards",{
 id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),amount:integer("amount").notNull(),kind:text("kind").notNull(),createdAt:text("created_at").notNull()
},(table)=>[index("idx_rewards_owner").on(table.ownerId)]);
export const islandItems=sqliteTable("island_items",{
 id:text("id").primaryKey(),ownerId:text("owner_id").notNull(),kind:text("kind").notNull(),slot:integer("slot").notNull(),cost:integer("cost").notNull(),createdAt:text("created_at").notNull()
},(table)=>[index("idx_items_owner").on(table.ownerId),uniqueIndex("idx_items_owner_slot").on(table.ownerId,table.slot),uniqueIndex("idx_items_owner_kind").on(table.ownerId,table.kind)]);
export const islandProfiles=sqliteTable("island_profiles",{ownerId:text("owner_id").primaryKey(),name:text("name").notNull().default("曙光小島")});

export const characterProfiles = sqliteTable("character_profiles", {
 ownerId: text("owner_id").primaryKey(),
 name: text("name").notNull().default("初行旅人"),
 profession: text("profession").notNull().default("wanderer"),
 avatarColor: text("avatar_color").notNull().default("mint"),
 leaderboardOptIn: integer("leaderboard_opt_in").notNull().default(0),
 weaponId: text("weapon_id"), outfitId: text("outfit_id"), charmId: text("charm_id"),
 headId: text("head_id"), offhandId: text("offhand_id"), bootsId: text("boots_id"),
});
export const characterRewards = sqliteTable("character_rewards", {
 ownerId: text("owner_id").notNull(), dreamId: text("dream_id").notNull(), taskId: text("task_id").notNull(),
 kind: text("kind").notNull(), skillId: text("skill_id"), xp: integer("xp").notNull(), skillXp: integer("skill_xp").notNull(), createdAt: text("created_at").notNull(),
}, table => [primaryKey({columns: [table.ownerId, table.dreamId, table.taskId, table.kind]}), index("idx_character_rewards_owner").on(table.ownerId)]);
export const characterTalents = sqliteTable("character_talents", {
 ownerId: text("owner_id").notNull(), talentId: text("talent_id").notNull(), rank: integer("rank").notNull(),
}, table => [primaryKey({columns: [table.ownerId, table.talentId]})]);
export const characterInventory = sqliteTable("character_inventory", {
 ownerId: text("owner_id").notNull(), itemId: text("item_id").notNull(), cost: integer("cost").notNull(), createdAt: text("created_at").notNull(),
}, table => [primaryKey({columns: [table.ownerId, table.itemId]})]);
export const characterAdvancements = sqliteTable("character_advancements", {
 ownerId: text("owner_id").notNull(), profession: text("profession").notNull(), stage: integer("stage").notNull().default(0),
}, table => [primaryKey({columns: [table.ownerId, table.profession]})]);

export const questDailyBoards = sqliteTable("quest_daily_boards", {
 ownerId: text("owner_id").notNull(), dayKey: text("day_key").notNull(),
 templateIds: text("template_ids").notNull(), createdAt: text("created_at").notNull(),
}, table => [primaryKey({columns: [table.ownerId, table.dayKey]})]);
export const questContracts = sqliteTable("quest_contracts", {
 ownerId: text("owner_id").notNull(), offerId: text("offer_id").notNull(), kind: text("kind").notNull(),
 templateId: text("template_id").notNull(), npcId: text("npc_id").notNull(), dayKey: text("day_key").notNull(),
 dreamId: text("dream_id").notNull(), acceptedAt: text("accepted_at").notNull(),
}, table => [primaryKey({columns: [table.ownerId, table.offerId]}), uniqueIndex("idx_quest_contract_dream").on(table.ownerId, table.dreamId), index("idx_quest_contract_day").on(table.ownerId, table.kind, table.dayKey)]);

