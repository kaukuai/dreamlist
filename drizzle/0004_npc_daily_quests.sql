CREATE TABLE `quest_contracts` (
	`owner_id` text NOT NULL,
	`offer_id` text NOT NULL,
	`kind` text NOT NULL,
	`template_id` text NOT NULL,
	`npc_id` text NOT NULL,
	`day_key` text NOT NULL,
	`dream_id` text NOT NULL,
	`accepted_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `offer_id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_quest_contract_dream` ON `quest_contracts` (`owner_id`,`dream_id`);--> statement-breakpoint
CREATE INDEX `idx_quest_contract_day` ON `quest_contracts` (`owner_id`,`kind`,`day_key`);--> statement-breakpoint
CREATE TABLE `quest_daily_boards` (
	`owner_id` text NOT NULL,
	`day_key` text NOT NULL,
	`template_ids` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `day_key`)
);
