CREATE TABLE `island_items` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`slot` integer NOT NULL,
	`cost` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_items_owner` ON `island_items` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_items_owner_slot` ON `island_items` (`owner_id`,`slot`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_items_owner_kind` ON `island_items` (`owner_id`,`kind`);--> statement-breakpoint
CREATE TABLE `island_profiles` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '曙光小島' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `island_rewards` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`amount` integer NOT NULL,
	`kind` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rewards_owner` ON `island_rewards` (`owner_id`);