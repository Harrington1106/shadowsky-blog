CREATE TABLE `blocked_ips` (
	`ip` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `excluded_ips` (
	`ip` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `greetings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`time` text,
	`ip` text,
	`ua` text
);
