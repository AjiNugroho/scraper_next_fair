import { pgTable, text, timestamp, uuid, integer, jsonb, index, boolean } from "drizzle-orm/pg-core"

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

export const tiktokBulkBatch = pgTable("tiktok_bulk_batch", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploadName: text("upload_name").notNull(),
  batchNumber: integer("batch_number").notNull(),
  totalBatches: integer("total_batches").notNull(),
  status: text("status").notNull().default("pending"), // pending | running | stopped | done
  totalUrls: integer("total_urls").notNull().default(0),
  dispatched: integer("dispatched").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
})

export const tiktokBulkBatchItem = pgTable(
  "tiktok_bulk_batch_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => tiktokBulkBatch.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    status: text("status").notNull().default("pending"), // pending | running | success | failed
    retryCount: integer("retry_count").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("tiktok_bulk_batch_item_batch_id_idx").on(table.batchId),
    index("tiktok_bulk_batch_item_status_idx").on(table.status),
  ],
)

export const tiktokBulkVideoResult = pgTable("tiktok_bulk_video_result", {
  id: uuid("id").primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .unique()
    .references(() => tiktokBulkBatchItem.id, { onDelete: "cascade" }),
  videoId: text("video_id"),
  url: text("url"),
  description: text("description"),
  videoCreatedAt: text("video_created_at"),
  durationS: integer("duration_s"),
  location: text("location"),
  isAd: boolean("is_ad"),
  isEcom: boolean("is_ecom"),
  statsPlays: integer("stats_plays"),
  statsLikes: integer("stats_likes"),
  statsComments: integer("stats_comments"),
  statsShares: integer("stats_shares"),
  statsSaves: integer("stats_saves"),
  statsReposts: integer("stats_reposts"),
  hashtags: jsonb("hashtags").$type<string[]>(),
  suggestedWords: jsonb("suggested_words").$type<string[]>(),
  music: jsonb("music").$type<Record<string, unknown>>(),
  author: jsonb("author").$type<Record<string, unknown>>(),
  product: jsonb("product").$type<Record<string, unknown> | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
