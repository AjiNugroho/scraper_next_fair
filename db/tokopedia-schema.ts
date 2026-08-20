import { pgTable, text, timestamp, uuid, jsonb, index, integer, date } from "drizzle-orm/pg-core"

export const tokopediaWorker = pgTable("tokopedia_worker", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const tokopediaJobHashtag = pgTable("tokopedia_job_hashtag", {
  id: uuid("id").primaryKey().defaultRandom(),
  hashtag: text("hashtag").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

export const tokopediaWorkerHashtagTask = pgTable("tokopedia_worker_hashtag_task", {
  id: uuid("id").primaryKey().defaultRandom(),
  workerId: uuid("worker_id")
    .notNull()
    .references(() => tokopediaWorker.id, { onDelete: "cascade" }),
  hashtagId: uuid("hashtag_id")
    .notNull()
    .unique()
    .references(() => tokopediaJobHashtag.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Submission log. webhookUrl is always stamped from the TOKOPEDIA_WEBHOOK_URL env
// var at insert time (never client-supplied) — kept on the row as an audit trail
// of what was configured when the request went out.
export const tokopediaHashtagRequest = pgTable("tokopedia_hashtag_request", {
  id: uuid("id").primaryKey().defaultRandom(),
  hashtag: text("hashtag").notNull(),
  webhookUrl: text("webhook_url").notNull(),
  extras: jsonb("extras").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Videos a worker collected while scraping an assigned hashtag, submitted back
// through the client-facing results endpoint.
export const tokopediaHashtagVideoResult = pgTable(
  "tokopedia_hashtag_video_result",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workerName: text("worker_name").notNull(),
    hashtag: text("hashtag").notNull(),
    videoUrl: text("video_url").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("tokopedia_hashtag_video_result_hashtag_idx").on(table.hashtag)],
)

// One rolling batch per calendar day (UTC). Every time a worker submits video
// URLs, they're appended to today's batch and dispatched to Phyllo — this lets
// ops retry only the URLs collected that day instead of everything ever scraped.
export const tokopediaPhylloBatch = pgTable("tokopedia_phyllo_batch", {
  id: uuid("id").primaryKey().defaultRandom(),
  batchDate: date("batch_date").notNull().unique(),
  status: text("status").notNull().default("running"), // running | done | partial | failed
  itemsSent: integer("items_sent").notNull().default(0),
  videoUrlsCount: integer("video_urls_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

// Individual video URL dispatched (or pending dispatch) to Phyllo as part of a
// batch. Phyllo is told to call back our own inbound webhook (see
// app/api/webhooks/tokopedia/phyllo), not the client's. webhookUrl here is a
// snapshot of TOKOPEDIA_WEBHOOK_URL at dispatch time — once the inbound webhook
// receives and formats the raw result (matched back to this row by callbackId),
// it relays the formatted payload to this URL.
export const tokopediaPhylloBatchItem = pgTable(
  "tokopedia_phyllo_batch_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => tokopediaPhylloBatch.id, { onDelete: "cascade" }),
    workerName: text("worker_name").notNull(),
    hashtag: text("hashtag").notNull(),
    videoUrl: text("video_url").notNull(),
    webhookUrl: text("webhook_url").notNull(),
    // Snapshot of the matching tokopedia_hashtag_request's extras at dispatch
    // time (looked up by hashtag — one lookup per worker submission, since every
    // item created from the same submission shares one hashtag). Read back by
    // the inbound webhook route when it builds the formatted client payload.
    extras: jsonb("extras").$type<Record<string, unknown>>(),
    callbackId: text("callback_id").notNull().unique(),
    providerJobId: text("provider_job_id"),
    status: text("status").notNull().default("pending"), // pending | sent | failed
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    sentAt: timestamp("sent_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("tokopedia_phyllo_batch_item_batch_id_idx").on(table.batchId),
    index("tokopedia_phyllo_batch_item_status_idx").on(table.status),
  ],
)
