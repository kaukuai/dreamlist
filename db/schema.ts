import {integer,sqliteTable,text,index,uniqueIndex} from "drizzle-orm/sqlite-core";
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

