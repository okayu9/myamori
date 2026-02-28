CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`chat_id` text NOT NULL,
	`metadata` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_audit_logs_chat_created` ON `audit_logs` (`chat_id`,`created_at`);