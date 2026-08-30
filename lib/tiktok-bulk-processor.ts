import { db } from "@/db/drizzle"
import { tiktokBulkBatch, tiktokBulkBatchItem } from "@/db/tiktok-schema"
import { publishTiktokVideoScrape } from "@/lib/rabbitmq"
import { eq, and, or, inArray, sql, count } from "drizzle-orm"
import { randomUUID } from "crypto"

// Flush dispatched counter and check for stop signal every N items
const FLUSH_INTERVAL = 50

type BulkBatchItemRow = typeof tiktokBulkBatchItem.$inferSelect

// Publishes a set of already-`pending` items to the scraper queue, flushing the
// batch's dispatched counter periodically and bailing out early if the batch is
// stopped mid-flight. Shared by the initial dispatch (startBatch) and by retries,
// which scope this to just the retried item IDs so the two never race over the
// same rows.
async function dispatchItems(batchId: string, items: BulkBatchItemRow[]): Promise<void> {
  const appUrl = process.env.APP_BASE_URL
  if (!appUrl) throw new Error("APP_BASE_URL is not set")

  let pendingFlush = 0

  for (let i = 0; i < items.length; i++) {
    if (i > 0 && i % FLUSH_INTERVAL === 0) {
      // Flush dispatched count and check if user stopped the batch
      await db
        .update(tiktokBulkBatch)
        .set({ dispatched: sql`${tiktokBulkBatch.dispatched} + ${pendingFlush}` })
        .where(eq(tiktokBulkBatch.id, batchId))
      pendingFlush = 0

      const [row] = await db
        .select({ status: tiktokBulkBatch.status })
        .from(tiktokBulkBatch)
        .where(eq(tiktokBulkBatch.id, batchId))
        .limit(1)
      if (!row || row.status !== "running") return
    }

    const item = items[i]

    try {
      await db
        .update(tiktokBulkBatchItem)
        .set({ status: "running" })
        .where(eq(tiktokBulkBatchItem.id, item.id))

      await publishTiktokVideoScrape({
        taskId: randomUUID(),
        requestId: item.id,
        url: item.url,
        webhookUrl: `${appUrl}/api/webhooks/tiktok/video`,
        extras: {},
      })

      pendingFlush++
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown publish error"
      console.error(`[batch-processor] failed to publish item ${item.id}:`, err)

      await Promise.all([
        db
          .update(tiktokBulkBatchItem)
          .set({ status: "failed", error })
          .where(eq(tiktokBulkBatchItem.id, item.id)),
        db
          .update(tiktokBulkBatch)
          .set({ failedCount: sql`${tiktokBulkBatch.failedCount} + 1` })
          .where(eq(tiktokBulkBatch.id, batchId)),
      ])
    }
  }

  // Final flush of any remaining dispatched count
  if (pendingFlush > 0) {
    await db
      .update(tiktokBulkBatch)
      .set({ dispatched: sql`${tiktokBulkBatch.dispatched} + ${pendingFlush}` })
      .where(eq(tiktokBulkBatch.id, batchId))
  }
}

// Marks the batch `done` only if it's still `running` AND no items remain
// `pending`/`running`. Checking actual remaining work (rather than trusting
// "my own loop just finished") matters because startBatch's initial dispatch
// and a retry's dispatch can be in flight for the same batch at once — each
// only touches its own item IDs, but both race to decide when the batch as a
// whole is complete.
async function maybeMarkDone(batchId: string): Promise<void> {
  const [batch] = await db
    .select({ status: tiktokBulkBatch.status })
    .from(tiktokBulkBatch)
    .where(eq(tiktokBulkBatch.id, batchId))
    .limit(1)
  if (batch?.status !== "running") return

  const [{ outstanding }] = await db
    .select({ outstanding: count() })
    .from(tiktokBulkBatchItem)
    .where(
      and(
        eq(tiktokBulkBatchItem.batchId, batchId),
        or(eq(tiktokBulkBatchItem.status, "pending"), eq(tiktokBulkBatchItem.status, "running")),
      ),
    )
  if (outstanding > 0) return

  await db
    .update(tiktokBulkBatch)
    .set({ status: "done", completedAt: new Date() })
    .where(and(eq(tiktokBulkBatch.id, batchId), eq(tiktokBulkBatch.status, "running")))
}

export async function startBatch(batchId: string): Promise<void> {
  // Only transition if currently pending or stopped
  await db
    .update(tiktokBulkBatch)
    .set({
      status: "running",
      startedAt: sql`COALESCE(${tiktokBulkBatch.startedAt}, NOW())`,
    })
    .where(
      and(
        eq(tiktokBulkBatch.id, batchId),
        or(eq(tiktokBulkBatch.status, "pending"), eq(tiktokBulkBatch.status, "stopped")),
      ),
    )

  const pendingItems = await db
    .select()
    .from(tiktokBulkBatchItem)
    .where(and(eq(tiktokBulkBatchItem.batchId, batchId), eq(tiktokBulkBatchItem.status, "pending")))

  await dispatchItems(batchId, pendingItems)
  await maybeMarkDone(batchId)
}

export type RetryableStatus = "failed" | "running"

// Resets every item in the batch whose current status is in `statuses` back to
// `pending` and redispatches exactly those items. `running` items are included
// unconditionally (no staleness check) — if the original worker replies after
// this runs, its webhook will still land on the same item row and can
// double-count that one item's result. Acceptable tradeoff for a manually
// triggered admin action.
export async function retryItems(batchId: string, statuses: RetryableStatus[]): Promise<number> {
  if (statuses.length === 0) return 0

  const targets = await db
    .select()
    .from(tiktokBulkBatchItem)
    .where(
      and(eq(tiktokBulkBatchItem.batchId, batchId), inArray(tiktokBulkBatchItem.status, statuses)),
    )

  if (targets.length === 0) return 0

  const targetIds = targets.map((item) => item.id)

  // Re-assert the status filter here: if a `running` item genuinely resolved via
  // webhook in the gap since the SELECT above, it no longer matches and is left
  // alone rather than getting clobbered back to `pending`. RETURNING tells us
  // exactly which rows this actually touched, so counters and the redispatch
  // list stay consistent even if some targets were skipped for that reason.
  const reset = await db
    .update(tiktokBulkBatchItem)
    .set({ status: "pending", error: null, retryCount: sql`${tiktokBulkBatchItem.retryCount} + 1` })
    .where(
      and(
        inArray(tiktokBulkBatchItem.id, targetIds),
        inArray(tiktokBulkBatchItem.status, statuses),
      ),
    )
    .returning({ id: tiktokBulkBatchItem.id })

  if (reset.length === 0) return 0

  const resetIds = new Set(reset.map((r) => r.id))
  const resetTargets = targets.filter((item) => resetIds.has(item.id))
  const failedCount = resetTargets.filter((item) => item.status === "failed").length
  const runningCount = resetTargets.filter((item) => item.status === "running").length

  await db
    .update(tiktokBulkBatch)
    .set({
      status: "running",
      completedAt: null,
      failedCount: sql`${tiktokBulkBatch.failedCount} - ${failedCount}`,
      dispatched: sql`${tiktokBulkBatch.dispatched} - ${runningCount}`,
    })
    .where(eq(tiktokBulkBatch.id, batchId))

  const resetItems = resetTargets.map((item) => ({ ...item, status: "pending" as const }))
  await dispatchItems(batchId, resetItems)
  await maybeMarkDone(batchId)

  return resetTargets.length
}
