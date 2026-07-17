import { pgTable, text, timestamp, index, integer, uuid, jsonb } from "drizzle-orm/pg-core"

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

export const webhookDeliveryLog = pgTable(
  "webhook_delivery_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: text("request_id"),
    platform: text("platform").notNull(),
    accountName: text("account_name"),
    clientWebhook: text("client_webhook"),
    totalCount: integer("total_count").notNull().default(0),
    validCount: integer("valid_count").notNull().default(0),
    statusCode: integer("status_code"),
    responseBody: text("response_body"),
    errorMessage: text("error_message"),
    payload: jsonb("payload"),
    retryCount: integer("retry_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("webhook_delivery_log_request_id_idx").on(table.requestId)],
)
