import { pgTable, text, timestamp, uuid, integer, jsonb } from "drizzle-orm/pg-core"

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

export const tiktokHashtagVideoResult = pgTable("tiktok_hashtag_video_result", {
  id: uuid("id").primaryKey().defaultRandom(),
  workerName: text("worker_name").notNull(),
  hashtag: text("hashtag").notNull(),
  videoUrl: text("video_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})
