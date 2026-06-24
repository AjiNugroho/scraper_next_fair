import { db } from "@/db/drizzle"
import { tiktokBulkBatch, tiktokBulkBatchItem } from "@/db/tiktok-schema"
import { publishTiktokVideoScrape } from "@/lib/rabbitmq"
import { eq, and, or, sql } from "drizzle-orm"
import { randomUUID } from "crypto"

// Flush dispatched counter and check for stop signal every N items
const FLUSH_INTERVAL = 50

export async function startBatch(batchId: string): Promise<void> {
  const appUrl = process.env.APP_BASE_URL
  if (!appUrl) throw new Error("APP_BASE_URL is not set")

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

  let pendingFlush = 0

  for (let i = 0; i < pendingItems.length; i++) {
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

    const item = pendingItems[i]

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

  // Mark done only if still running (not externally stopped while we were looping)
  const [batch] = await db
    .select({ status: tiktokBulkBatch.status })
    .from(tiktokBulkBatch)
    .where(eq(tiktokBulkBatch.id, batchId))
    .limit(1)

  if (batch?.status === "running") {
    await db
      .update(tiktokBulkBatch)
      .set({ status: "done", completedAt: new Date() })
      .where(eq(tiktokBulkBatch.id, batchId))
  }
}
