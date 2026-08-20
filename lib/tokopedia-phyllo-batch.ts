import { randomUUID } from "crypto"
import { db } from "@/db/drizzle"
import { tokopediaHashtagRequest, tokopediaPhylloBatch, tokopediaPhylloBatchItem } from "@/db/tokopedia-schema"
import { and, desc, eq, inArray } from "drizzle-orm"
import { scrapeVideoByUrl } from "@/lib/phyllo-scraper"

const CONCURRENCY = 5
const WEBHOOK_BASE = process.env.BETTER_AUTH_URL ?? ""
// Ours, not the client's — Phyllo calls us back here so we can format the raw
// result before relaying it to the client. See app/api/webhooks/tokopedia/phyllo.
const INBOUND_WEBHOOK_URL = `${WEBHOOK_BASE}/api/webhooks/tokopedia/phyllo`

type BatchItemRow = typeof tokopediaPhylloBatchItem.$inferSelect

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor++]
      await fn(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

async function getOrCreateTodayBatch(): Promise<typeof tokopediaPhylloBatch.$inferSelect> {
  const batchDate = todayUtc()

  const inserted = await db
    .insert(tokopediaPhylloBatch)
    .values({ batchDate, status: "running" })
    .onConflictDoNothing({ target: tokopediaPhylloBatch.batchDate })
    .returning()

  if (inserted.length > 0) return inserted[0]

  const [existing] = await db
    .select()
    .from(tokopediaPhylloBatch)
    .where(eq(tokopediaPhylloBatch.batchDate, batchDate))
    .limit(1)

  return existing
}

async function dispatchItemRow(row: BatchItemRow): Promise<void> {
  try {
    // row.webhookUrl is the client's TOKOPEDIA_WEBHOOK_URL snapshot — that's where
    // we relay the *formatted* result once it comes back, not where Phyllo sends
    // the raw one. Phyllo gets pointed at our own inbound webhook instead.
    await scrapeVideoByUrl(row.videoUrl, row.callbackId, INBOUND_WEBHOOK_URL)
    await db
      .update(tokopediaPhylloBatchItem)
      .set({ status: "sent", sentAt: new Date(), error: null, attempts: row.attempts + 1 })
      .where(eq(tokopediaPhylloBatchItem.id, row.id))
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown dispatch error"
    console.error(`[tokopedia-phyllo-batch] failed to dispatch item ${row.id}:`, err)
    await db
      .update(tokopediaPhylloBatchItem)
      .set({ status: "failed", error, attempts: row.attempts + 1 })
      .where(eq(tokopediaPhylloBatchItem.id, row.id))
  }
}

async function recomputeBatchStatus(batchId: string): Promise<void> {
  const rows = await db
    .select({ status: tokopediaPhylloBatchItem.status })
    .from(tokopediaPhylloBatchItem)
    .where(eq(tokopediaPhylloBatchItem.batchId, batchId))

  const sent = rows.filter((r) => r.status === "sent")
  const notSent = rows.filter((r) => r.status !== "sent")
  const status = notSent.length === 0 ? "done" : sent.length === 0 ? "failed" : "partial"

  await db
    .update(tokopediaPhylloBatch)
    .set({ status, itemsSent: sent.length, videoUrlsCount: rows.length })
    .where(eq(tokopediaPhylloBatch.id, batchId))
}

// tokopedia_hashtag_request.hashtag has no unique constraint — a hashtag can
// have been submitted more than once (e.g. resubmitted with different extras).
// The most recently created row is treated as the current one. Returns null if
// the hashtag was never submitted through a request (e.g. queued some other
// way), in which case the batch item just carries no extras.
async function resolveExtrasForHashtag(hashtag: string): Promise<Record<string, unknown> | null> {
  const [latest] = await db
    .select({ extras: tokopediaHashtagRequest.extras })
    .from(tokopediaHashtagRequest)
    .where(eq(tokopediaHashtagRequest.hashtag, hashtag))
    .orderBy(desc(tokopediaHashtagRequest.createdAt))
    .limit(1)

  return latest?.extras ?? null
}

// Called right after a worker's video URLs are stored. Appends them to today's
// batch and dispatches each one to Phyllo, pointed at our own inbound webhook.
// The client's static webhook URL is only snapshotted onto the item — the
// inbound webhook route uses it to relay the formatted result once Phyllo calls
// back with the raw one.
export async function dispatchVideoUrlsToPhyllo(input: {
  workerName: string
  hashtag: string
  videoUrls: string[]
}): Promise<void> {
  if (input.videoUrls.length === 0) return

  const webhookUrl = process.env.TOKOPEDIA_WEBHOOK_URL
  if (!webhookUrl) {
    console.error("[tokopedia-phyllo-batch] TOKOPEDIA_WEBHOOK_URL is not configured, skipping dispatch")
    return
  }

  const batch = await getOrCreateTodayBatch()

  await db
    .update(tokopediaPhylloBatch)
    .set({ status: "running" })
    .where(eq(tokopediaPhylloBatch.id, batch.id))

  // One lookup for the whole call — every item created here shares input.hashtag.
  const extras = await resolveExtrasForHashtag(input.hashtag)

  const inserted = await db
    .insert(tokopediaPhylloBatchItem)
    .values(
      input.videoUrls.map((url) => ({
        batchId: batch.id,
        workerName: input.workerName,
        hashtag: input.hashtag,
        videoUrl: url,
        webhookUrl,
        extras,
        callbackId: randomUUID(),
      })),
    )
    .returning()

  await mapWithConcurrency(inserted, CONCURRENCY, dispatchItemRow)

  await recomputeBatchStatus(batch.id)
}

async function retryPhylloBatchItems(
  batchId: string,
  statuses?: (typeof tokopediaPhylloBatchItem.$inferSelect)["status"][],
): Promise<void> {
  const [batch] = await db
    .select()
    .from(tokopediaPhylloBatch)
    .where(eq(tokopediaPhylloBatch.id, batchId))
    .limit(1)

  if (!batch) throw new Error("Batch not found")
  if (batch.status === "running") throw new Error("Batch is already running")

  await db
    .update(tokopediaPhylloBatch)
    .set({ status: "running" })
    .where(eq(tokopediaPhylloBatch.id, batchId))

  const items = await db
    .select()
    .from(tokopediaPhylloBatchItem)
    .where(
      statuses
        ? and(
            eq(tokopediaPhylloBatchItem.batchId, batchId),
            inArray(tokopediaPhylloBatchItem.status, statuses),
          )
        : eq(tokopediaPhylloBatchItem.batchId, batchId),
    )

  await mapWithConcurrency(items, CONCURRENCY, dispatchItemRow)

  await recomputeBatchStatus(batchId)
}

// Resubmits only items that haven't been successfully sent yet.
export async function retryFailedPhylloBatchItems(batchId: string): Promise<void> {
  return retryPhylloBatchItems(batchId, ["pending", "failed"])
}

// Resubmits every item in the batch regardless of status — including ones
// already marked "sent". Used to force a full re-dispatch to Phyllo.
export async function retryAllPhylloBatchItems(batchId: string): Promise<void> {
  return retryPhylloBatchItems(batchId)
}
