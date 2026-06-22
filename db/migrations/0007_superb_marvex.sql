CREATE TABLE "tiktok_bulk_job" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_urls" integer DEFAULT 0 NOT NULL,
	"processed" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tiktok_bulk_job_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bulk_job_id" uuid NOT NULL,
	"url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tiktok_bulk_video_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"video_id" text,
	"url" text,
	"description" text,
	"video_created_at" text,
	"duration_s" integer,
	"location" text,
	"is_ad" boolean,
	"is_ecom" boolean,
	"stats_plays" integer,
	"stats_likes" integer,
	"stats_comments" integer,
	"stats_shares" integer,
	"stats_saves" integer,
	"stats_reposts" integer,
	"hashtags" jsonb,
	"suggested_words" jsonb,
	"music" jsonb,
	"author" jsonb,
	"product" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tiktok_bulk_video_result_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
ALTER TABLE "tiktok_bulk_job_item" ADD CONSTRAINT "tiktok_bulk_job_item_bulk_job_id_tiktok_bulk_job_id_fk" FOREIGN KEY ("bulk_job_id") REFERENCES "public"."tiktok_bulk_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tiktok_bulk_video_result" ADD CONSTRAINT "tiktok_bulk_video_result_item_id_tiktok_bulk_job_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."tiktok_bulk_job_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tiktok_bulk_job_item_bulk_job_id_idx" ON "tiktok_bulk_job_item" USING btree ("bulk_job_id");--> statement-breakpoint
CREATE INDEX "tiktok_bulk_job_item_status_idx" ON "tiktok_bulk_job_item" USING btree ("status");