ALTER TABLE "tiktok_scrape_job_run" ADD COLUMN "is_custom" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "tiktok_scrape_job_run" ADD COLUMN "filter_hashtags" jsonb;--> statement-breakpoint
ALTER TABLE "tiktok_scrape_job_run" ADD COLUMN "filter_from" timestamp;--> statement-breakpoint
ALTER TABLE "tiktok_scrape_job_run" ADD COLUMN "filter_to" timestamp;