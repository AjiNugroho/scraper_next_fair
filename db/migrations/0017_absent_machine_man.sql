CREATE TABLE "tokopedia_phyllo_batch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_date" date NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"items_sent" integer DEFAULT 0 NOT NULL,
	"video_urls_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tokopedia_phyllo_batch_batch_date_unique" UNIQUE("batch_date")
);
--> statement-breakpoint
CREATE TABLE "tokopedia_phyllo_batch_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"worker_name" text NOT NULL,
	"hashtag" text NOT NULL,
	"video_url" text NOT NULL,
	"webhook_url" text NOT NULL,
	"callback_id" text NOT NULL,
	"provider_job_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tokopedia_phyllo_batch_item_callback_id_unique" UNIQUE("callback_id")
);
--> statement-breakpoint
ALTER TABLE "tokopedia_phyllo_batch_item" ADD CONSTRAINT "tokopedia_phyllo_batch_item_batch_id_tokopedia_phyllo_batch_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."tokopedia_phyllo_batch"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tokopedia_phyllo_batch_item_batch_id_idx" ON "tokopedia_phyllo_batch_item" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "tokopedia_phyllo_batch_item_status_idx" ON "tokopedia_phyllo_batch_item" USING btree ("status");