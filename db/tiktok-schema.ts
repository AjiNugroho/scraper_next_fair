import { pgTable, text, timestamp, uuid, integer, jsonb, index } from "drizzle-orm/pg-core"

export const tiktokWorker = pgTable("tiktok_worker", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const tiktokJobHashtag = pgTable("tiktok_job_hashtag", {
  id: uuid("id").primaryKey().defaultRandom(),
  hashtag: text("hashtag").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const tiktokWorkerHashtagTask = pgTable("tiktok_worker_hashtag_task", {
  id: uuid("id").primaryKey().defaultRandom(),
  workerId: uuid("worker_id")
    .notNull()
    .references(() => tiktokWorker.id, { onDelete: "cascade" }),
  hashtagId: uuid("hashtag_id")
    .notNull()
    .unique()
    .references(() => tiktokJobHashtag.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const tiktokHashtagRequest = pgTable("tiktok_hashtag_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  listenGroupId: integer("listen_group_id"),
  requestDataId: integer("request_data_id"),
  hashtag: text("hashtag").notNull(),
  webhookUrl: text("webhook_url"),
  extras: jsonb("extras").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const tiktokHashtagVideoResult = pgTable(
  "tiktok_hashtag_video_result",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workerName: text("worker_name").notNull(),
    hashtag: text("hashtag").notNull(),
    videoUrl: text("video_url").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("tiktok_hashtag_video_result_hashtag_idx").on(table.hashtag)],
)

export const tiktokScrapeJobRun = pgTable("tiktok_scrape_job_run", {
  id: uuid("id").primaryKey().defaultRandom(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  batchesSent: integer("batches_sent").notNull().default(0),
  videoUrlsCount: integer("video_urls_count").notNull().default(0),
  status: text("status").notNull().default("running"), // "running" | "done" | "failed"
})
