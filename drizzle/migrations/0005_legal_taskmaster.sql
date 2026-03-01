CREATE TABLE `emails` (
	`id` text PRIMARY KEY NOT NULL,
	`from_address` text NOT NULL,
	`to_address` text NOT NULL,
	`subject` text NOT NULL,
	`summary` text NOT NULL,
	`received_at` text NOT NULL,
	`r2_key` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_emails_received_at` ON `emails` (`received_at`);