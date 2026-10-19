CREATE TABLE `character_advancements` (
	`owner_id` text NOT NULL,
	`profession` text NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`owner_id`, `profession`)
);
--> statement-breakpoint
ALTER TABLE `character_profiles` ADD `head_id` text;--> statement-breakpoint
ALTER TABLE `character_profiles` ADD `offhand_id` text;--> statement-breakpoint
ALTER TABLE `character_profiles` ADD `boots_id` text;