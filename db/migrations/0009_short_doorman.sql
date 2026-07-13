CREATE TABLE "tiktok_scrape_job_run_batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_run_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"hashtag" text NOT NULL,
	"webhook_url" text NOT NULL,
	"urls" jsonb NOT NULL,
	"url_count" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tiktok_scrape_job_run_batch" ADD CONSTRAINT "tiktok_scrape_job_run_batch_job_run_id_tiktok_scrape_job_run_id_fk" FOREIGN KEY ("job_run_id") REFERENCES "public"."tiktok_scrape_job_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiktok_scrape_job_run_batch" ADD CONSTRAINT "tiktok_scrape_job_run_batch_request_id_tiktok_hashtag_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."tiktok_hashtag_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tiktok_scrape_job_run_batch_job_run_id_idx" ON "tiktok_scrape_job_run_batch" USING btree ("job_run_id");--> statement-breakpoint
CREATE INDEX "tiktok_scrape_job_run_batch_status_idx" ON "tiktok_scrape_job_run_batch" USING btree ("status");