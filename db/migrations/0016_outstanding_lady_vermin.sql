CREATE TABLE "tokopedia_hashtag_video_result" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_name" text NOT NULL,
	"hashtag" text NOT NULL,
	"video_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tokopedia_hashtag_video_result_hashtag_idx" ON "tokopedia_hashtag_video_result" USING btree ("hashtag");