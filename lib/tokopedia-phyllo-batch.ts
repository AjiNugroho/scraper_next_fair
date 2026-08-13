import { randomUUID } from "crypto"
import { db } from "@/db/drizzle"
import { tokopediaPhylloBatch, tokopediaPhylloBatchItem } from "@/db/tokopedia-schema"
import { and, eq, inArray } from "drizzle-orm"
import { scrapeVideoByUrl } from "@/lib/phyllo-scraper"

const CONCURRENCY = 5

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
    await scrapeVideoByUrl(row.videoUrl, row.callbackId, row.webhookUrl)
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

// Called right after a worker's video URLs are stored. Appends them to today's
// batch and dispatches each one to Phyllo, with the client's static webhook URL
// so Phyllo delivers the scrape result straight to the client — we don't see it.
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

  const inserted = await db
    .insert(tokopediaPhylloBatchItem)
    .values(
      input.videoUrls.map((url) => ({
        batchId: batch.id,
        workerName: input.workerName,
        hashtag: input.hashtag,
        videoUrl: url,
        webhookUrl,
        callbackId: randomUUID(),
      })),
    )
    .returning()

  await mapWithConcurrency(inserted, CONCURRENCY, dispatchItemRow)

  await recomputeBatchStatus(batch.id)
}

export async function retryFailedPhylloBatchItems(batchId: string): Promise<void> {
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

  const pendingItems = await db
    .select()
    .from(tokopediaPhylloBatchItem)
    .where(
      and(
        eq(tokopediaPhylloBatchItem.batchId, batchId),
        inArray(tokopediaPhylloBatchItem.status, ["pending", "failed"]),
      ),
    )

  await mapWithConcurrency(pendingItems, CONCURRENCY, dispatchItemRow)

  await recomputeBatchStatus(batchId)
}
