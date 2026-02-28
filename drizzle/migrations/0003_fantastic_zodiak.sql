CREATE TABLE `calendar_uids` (
	`id` text PRIMARY KEY NOT NULL,
	`event_uid` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_uids_event_uid_unique` ON `calendar_uids` (`event_uid`);