CREATE TABLE "phyllo_scrape_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listen_group_id" integer,
	"request_data_id" integer,
	"hashtag" text NOT NULL,
	"webhook_url" text,
	"extras" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tiktok_phyllo_scrape_job_run_item" DROP CONSTRAINT "tiktok_phyllo_scrape_job_run_item_request_id_tiktok_hashtag_request_id_fk";
--> statement-breakpoint
CREATE INDEX "phyllo_scrape_request_hashtag_idx" ON "phyllo_scrape_request" USING btree ("hashtag");--> statement-breakpoint
-- Carry over only the tiktok_hashtag_request rows that existing phyllo run items
-- already point at, keeping their ids so the new foreign key validates and the
-- run history stays intact. Nothing else is copied.
INSERT INTO "phyllo_scrape_request" ("id", "listen_group_id", "request_data_id", "hashtag", "webhook_url", "extras", "created_at")
SELECT DISTINCT r."id", r."listen_group_id", r."request_data_id", r."hashtag", r."webhook_url", r."extras", r."created_at"
FROM "tiktok_hashtag_request" r
JOIN "tiktok_phyllo_scrape_job_run_item" i ON i."request_id" = r."id";--> statement-breakpoint
ALTER TABLE "tiktok_phyllo_scrape_job_run_item" ADD CONSTRAINT "tiktok_phyllo_scrape_job_run_item_request_id_phyllo_scrape_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."phyllo_scrape_request"("id") ON DELETE cascade ON UPDATE no action;