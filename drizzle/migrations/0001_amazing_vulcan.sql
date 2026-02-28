CREATE TABLE `pending_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`chat_id` text NOT NULL,
	`thread_id` integer,
	`tool_name` text NOT NULL,
	`tool_input` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL
);
