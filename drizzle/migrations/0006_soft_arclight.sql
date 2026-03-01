CREATE TABLE `memories` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_memories_chat_id` ON `memories` (`chat_id`);