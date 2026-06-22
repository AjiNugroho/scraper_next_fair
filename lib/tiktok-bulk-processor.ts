import { db } from "@/db/drizzle"
import { tiktokBulkJob, tiktokBulkJobItem } from "@/db/tiktok-schema"
import { publishTiktokVideoScrape } from "@/lib/rabbitmq"
import { eq, and } from "drizzle-orm"
import { randomUUID } from "crypto"

const DELAY_MS = 5_000

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
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

  let successCount = 0
  let failedCount = 0

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

      failedCount++

      await db
        .update(tiktokBulkJob)
        .set({
          processed: i + 1,
          failedCount,
        })
        .where(eq(tiktokBulkJob.id, jobId))

      if (i < pendingItems.length - 1) await sleep(DELAY_MS)
      continue
    }

    await db
      .update(tiktokBulkJob)
      .set({ processed: i + 1 })
      .where(eq(tiktokBulkJob.id, jobId))

    if (i < pendingItems.length - 1) await sleep(DELAY_MS)
  }

  // Mark job done — webhook callbacks update success/failed counts as they arrive
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
