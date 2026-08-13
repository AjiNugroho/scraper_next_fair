CREATE TABLE "tokopedia_hashtag_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hashtag" text NOT NULL,
	"webhook_url" text NOT NULL,
	"extras" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tokopedia_job_hashtag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hashtag" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tokopedia_job_hashtag_hashtag_unique" UNIQUE("hashtag")
);
--> statement-breakpoint
CREATE TABLE "tokopedia_worker" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tokopedia_worker_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tokopedia_worker_hashtag_task" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_id" uuid NOT NULL,
	"hashtag_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tokopedia_worker_hashtag_task_hashtag_id_unique" UNIQUE("hashtag_id")
);
--> statement-breakpoint
ALTER TABLE "tokopedia_worker_hashtag_task" ADD CONSTRAINT "tokopedia_worker_hashtag_task_worker_id_tokopedia_worker_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."tokopedia_worker"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokopedia_worker_hashtag_task" ADD CONSTRAINT "tokopedia_worker_hashtag_task_hashtag_id_tokopedia_job_hashtag_id_fk" FOREIGN KEY ("hashtag_id") REFERENCES "public"."tokopedia_job_hashtag"("id") ON DELETE cascade ON UPDATE no action;