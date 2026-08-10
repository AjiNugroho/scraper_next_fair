import { pgTable, text, timestamp, uuid, integer, jsonb, index } from "drizzle-orm/pg-core"

/**
 * Scrape requests owned by the Phyllo pipeline. Deliberately a separate table from
 * `tiktok_hashtag_request` so the Phyllo section can be managed without touching
 * the Bright Data / mobile-worker requests, even though both feed the same
 * mobile-worker hashtag pool and read the same collected video URLs.
 */
export const phylloScrapeRequest = pgTable(
  "phyllo_scrape_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listenGroupId: integer("listen_group_id"),
    requestDataId: integer("request_data_id"),
    hashtag: text("hashtag").notNull(),
    webhookUrl: text("webhook_url"),
    extras: jsonb("extras").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("phyllo_scrape_request_hashtag_idx").on(table.hashtag)],
)
