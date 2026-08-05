CREATE TABLE "tiktok_scraper_test_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"video_url" text NOT NULL,
	"client_webhook_url" text NOT NULL,
	"extras" jsonb,
	"callback_id" text NOT NULL,
	"provider_webhook_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"dispatch_error" text,
	"provider_job_id" text,
	"provider_payload" jsonb,
	"forwarded_payload" jsonb,
	"client_status_code" integer,
	"client_response_body" text,
	"client_error" text,
	"sent_at" timestamp,
	"received_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tiktok_scraper_test_run_callback_id_unique" UNIQUE("callback_id")
);
--> statement-breakpoint
CREATE INDEX "tiktok_scraper_test_run_status_idx" ON "tiktok_scraper_test_run" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tiktok_scraper_test_run_created_at_idx" ON "tiktok_scraper_test_run" USING btree ("created_at");