CREATE TABLE `scheduled_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`cron_expr` text NOT NULL,
	`prompt` text NOT NULL,
	`chat_id` text NOT NULL,
	`thread_id` integer,
	`enabled` integer DEFAULT 1 NOT NULL,
	`next_run_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scheduled_jobs_next_run` ON `scheduled_jobs` (`enabled`,`next_run_at`);