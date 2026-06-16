CREATE TABLE "tiktok_scrape_job_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"batches_sent" integer DEFAULT 0 NOT NULL,
	"video_urls_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'running' NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tiktok_hashtag_video_result_hashtag_idx" ON "tiktok_hashtag_video_result" USING btree ("hashtag");