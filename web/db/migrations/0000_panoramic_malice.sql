CREATE TABLE `ai_projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`url` text,
	`description` text,
	`stars` integer DEFAULT 0,
	`language` text,
	`tags` text DEFAULT '[]',
	`added_at` text
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `bookmark_categories` (
	`slug` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`subcategories` text DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`category` text,
	`subcategory` text,
	`tags` text DEFAULT '[]',
	`description` text,
	`added_at` text
);
--> statement-breakpoint
CREATE TABLE `feeds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`category` text
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`cover` text,
	`progress` integer DEFAULT 0,
	`total` integer,
	`status` text,
	`tag` text
);
--> statement-breakpoint
CREATE TABLE `moments` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`content` text,
	`image` text,
	`location` text,
	`tags` text DEFAULT '[]',
	`source` text DEFAULT 'admin'
);
--> statement-breakpoint
CREATE TABLE `notice` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text DEFAULT '',
	`show` integer DEFAULT 1,
	`style` text DEFAULT 'info',
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `page_visits` (
	`page` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `site_stats` (
	`key` text PRIMARY KEY NOT NULL,
	`value` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`filename` text NOT NULL,
	`url` text,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `social_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`icon` text,
	`sort` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`thumbnail` text,
	`duration` text,
	`views` integer DEFAULT 0,
	`category` text,
	`type` text,
	`bvid` text,
	`kind` text DEFAULT 'video'
);
