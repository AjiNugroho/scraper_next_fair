import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core"

export const instagramTaggedRequest = pgTable(
  "instagram_tagged_request",
  {
    id: text("id").primaryKey(),
    status: text("status").default("queued").notNull(),
    requestor: text("requestor").default("dashboard").notNull(),
    webhookUrl: text("webhook_url"),
    extras: text("extras"),
    data: text("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("instagram_tagged_request_status_idx").on(table.status)],
)
