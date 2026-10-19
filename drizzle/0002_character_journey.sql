CREATE TABLE `character_inventory` (
	`owner_id` text NOT NULL,
	`item_id` text NOT NULL,
	`cost` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `item_id`)
);
--> statement-breakpoint
CREATE TABLE `character_profiles` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '初行旅人' NOT NULL,
	`profession` text DEFAULT 'wanderer' NOT NULL,
	`avatar_color` text DEFAULT 'mint' NOT NULL,
	`leaderboard_opt_in` integer DEFAULT 0 NOT NULL,
	`weapon_id` text,
	`outfit_id` text,
	`charm_id` text
);
--> statement-breakpoint
CREATE TABLE `character_rewards` (
	`owner_id` text NOT NULL,
	`dream_id` text NOT NULL,
	`task_id` text NOT NULL,
	`kind` text NOT NULL,
	`skill_id` text,
	`xp` integer NOT NULL,
	`skill_xp` integer NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `dream_id`, `task_id`, `kind`)
);
--> statement-breakpoint
CREATE INDEX `idx_character_rewards_owner` ON `character_rewards` (`owner_id`);--> statement-breakpoint
CREATE TABLE `character_talents` (
	`owner_id` text NOT NULL,
	`talent_id` text NOT NULL,
	`rank` integer NOT NULL,
	PRIMARY KEY(`owner_id`, `talent_id`)
);
