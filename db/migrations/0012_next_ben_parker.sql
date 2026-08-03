CREATE TABLE "tiktok_phyllo_scrape_job_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"items_sent" integer DEFAULT 0 NOT NULL,
	"video_urls_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"filter_hashtags" jsonb,
	"filter_from" timestamp,
	"filter_to" timestamp
);
--> statement-breakpoint
CREATE TABLE "tiktok_phyllo_scrape_job_run_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_run_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"hashtag" text NOT NULL,
	"webhook_url" text NOT NULL,
	"url" text NOT NULL,
	"callback_id" text NOT NULL,
	"provider_job_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tiktok_phyllo_scrape_job_run_item_callback_id_unique" UNIQUE("callback_id")
);
--> statement-breakpoint
ALTER TABLE "tiktok_phyllo_scrape_job_run_item" ADD CONSTRAINT "tiktok_phyllo_scrape_job_run_item_job_run_id_tiktok_phyllo_scrape_job_run_id_fk" FOREIGN KEY ("job_run_id") REFERENCES "public"."tiktok_phyllo_scrape_job_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiktok_phyllo_scrape_job_run_item" ADD CONSTRAINT "tiktok_phyllo_scrape_job_run_item_request_id_tiktok_hashtag_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."tiktok_hashtag_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tiktok_phyllo_scrape_job_run_item_job_run_id_idx" ON "tiktok_phyllo_scrape_job_run_item" USING btree ("job_run_id");--> statement-breakpoint
CREATE INDEX "tiktok_phyllo_scrape_job_run_item_status_idx" ON "tiktok_phyllo_scrape_job_run_item" USING btree ("status");