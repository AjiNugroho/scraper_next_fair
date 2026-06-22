import { db } from "@/db/drizzle"
import { tiktokBulkJob, tiktokBulkJobItem } from "@/db/tiktok-schema"
import { publishTiktokVideoScrape } from "@/lib/rabbitmq"
import { eq, and } from "drizzle-orm"
import { randomUUID } from "crypto"

const DELAY_MS = 5_000
const POLL_INTERVAL_MS = 3_000
// Max time to wait for a single item's webhook before giving up and marking it failed
const ITEM_TIMEOUT_MS = 5 * 60 * 1_000 // 5 minutes

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

async function waitForItemCompletion(itemId: string): Promise<void> {
  const deadline = Date.now() + ITEM_TIMEOUT_MS

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)

    const [row] = await db
      .select({ status: tiktokBulkJobItem.status })
      .from(tiktokBulkJobItem)
      .where(eq(tiktokBulkJobItem.id, itemId))
      .limit(1)

    if (!row || row.status === "success" || row.status === "failed") return
  }

  // Timed out — webhook never arrived
  await db
    .update(tiktokBulkJobItem)
    .set({ status: "failed", error: "Timed out waiting for scraper response", updatedAt: new Date() })
    .where(eq(tiktokBulkJobItem.id, itemId))
}

export async function processBulkJob(jobId: string): Promise<void> {
  const appUrl = process.env.APP_BASE_URL
  if (!appUrl) throw new Error("APP_BASE_URL is not set")

  await db
    .update(tiktokBulkJob)
    .set({ status: "running", startedAt: new Date() })
    .where(and(eq(tiktokBulkJob.id, jobId), eq(tiktokBulkJob.status, "pending")))

  const pendingItems = await db
    .select()
    .from(tiktokBulkJobItem)
    .where(and(eq(tiktokBulkJobItem.bulkJobId, jobId), eq(tiktokBulkJobItem.status, "pending")))

  for (let i = 0; i < pendingItems.length; i++) {
    const item = pendingItems[i]

    await db
      .update(tiktokBulkJobItem)
      .set({ status: "running" })
      .where(eq(tiktokBulkJobItem.id, item.id))

    try {
      await publishTiktokVideoScrape({
        taskId: randomUUID(),
        requestId: item.id,
        url: item.url,
        webhookUrl: `${appUrl}/api/webhooks/tiktok/video`,
        extras: {},
      })
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown error"
      console.error(`[bulk-processor] failed to publish item ${item.id}:`, err)

      await db
        .update(tiktokBulkJobItem)
        .set({ status: "failed", error, updatedAt: new Date() })
        .where(eq(tiktokBulkJobItem.id, item.id))

      await db
        .update(tiktokBulkJob)
        .set({ processed: i + 1, failedCount: i + 1 })
        .where(eq(tiktokBulkJob.id, jobId))

      // Still wait before next item even on publish failure
      if (i < pendingItems.length - 1) await sleep(DELAY_MS)
      continue
    }

    // Wait for the webhook to mark this item success/failed before moving on
    await waitForItemCompletion(item.id)

    await db
      .update(tiktokBulkJob)
      .set({ processed: i + 1 })
      .where(eq(tiktokBulkJob.id, jobId))

    // Delay before dispatching the next item
    if (i < pendingItems.length - 1) await sleep(DELAY_MS)
  }

  await db
    .update(tiktokBulkJob)
    .set({ status: "done", completedAt: new Date() })
    .where(eq(tiktokBulkJob.id, jobId))
}

export async function retryFailedItems(jobId: string): Promise<void> {
  await db
    .update(tiktokBulkJobItem)
    .set({ status: "pending", error: null, updatedAt: new Date() })
    .where(and(eq(tiktokBulkJobItem.bulkJobId, jobId), eq(tiktokBulkJobItem.status, "failed")))

  await db
    .update(tiktokBulkJob)
    .set({ status: "pending", completedAt: null })
    .where(eq(tiktokBulkJob.id, jobId))
}
