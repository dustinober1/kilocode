CREATE TABLE `metric_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`event_type` text NOT NULL,
	`timestamp` integer NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`start_time` integer NOT NULL,
	`end_time` integer,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`total_cost` integer DEFAULT 0 NOT NULL,
	`command_count` integer DEFAULT 0 NOT NULL,
	`tool_usage_count` integer DEFAULT 0 NOT NULL,
	`exit_reason` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
