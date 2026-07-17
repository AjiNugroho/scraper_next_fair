ALTER TABLE "webhook_delivery_log" ADD COLUMN "payload" jsonb;--> statement-breakpoint
ALTER TABLE "webhook_delivery_log" ADD COLUMN "retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_delivery_log" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;