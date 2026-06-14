CREATE TABLE "instagram_tagged_request" (
	"id" text PRIMARY KEY NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"requestor" text DEFAULT 'dashboard' NOT NULL,
	"webhook_url" text,
	"extras" text,
	"data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "instagram_tagged_request_status_idx" ON "instagram_tagged_request" USING btree ("status");