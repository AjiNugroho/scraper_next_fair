CREATE TABLE "webhook_delivery_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" text,
	"platform" text NOT NULL,
	"account_name" text,
	"client_webhook" text,
	"total_count" integer DEFAULT 0 NOT NULL,
	"valid_count" integer DEFAULT 0 NOT NULL,
	"status_code" integer,
	"response_body" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "webhook_delivery_log_request_id_idx" ON "webhook_delivery_log" USING btree ("request_id");