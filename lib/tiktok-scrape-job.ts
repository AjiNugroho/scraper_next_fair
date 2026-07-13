import { db } from "@/db/drizzle"
import {
  tiktokHashtagRequest,
  tiktokHashtagVideoResult,
  tiktokScrapeJobRun,
  tiktokScrapeJobRunBatch,
} from "@/db/tiktok-schema"
import { and, eq, gt, lte, isNotNull, inArray, max } from "drizzle-orm"
import { scrapeVideosByUrl } from "@/lib/brightdata"

const BATCH_SIZE = 50
const WEBHOOK_BASE = process.env.BETTER_AUTH_URL ?? ""

type ScrapeJobRunBatch = typeof tiktokScrapeJobRunBatch.$inferSelect

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

async function dispatchBatchRow(row: ScrapeJobRunBatch): Promise<void> {
  try {
    await scrapeVideosByUrl(row.urls, row.webhookUrl)
    await db
      .update(tiktokScrapeJobRunBatch)
      .set({ status: "sent", sentAt: new Date(), error: null, attempts: row.attempts + 1 })
      .where(eq(tiktokScrapeJobRunBatch.id, row.id))
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown dispatch error"
    console.error(`[tiktok-scrape-job] failed to dispatch batch ${row.id}:`, err)
    await db
      .update(tiktokScrapeJobRunBatch)
      .set({ status: "failed", error, attempts: row.attempts + 1 })
      .where(eq(tiktokScrapeJobRunBatch.id, row.id))
  }
}

async function recomputeJobRunStatus(jobRunId: string): Promise<void> {
  const rows = await db
    .select({ status: tiktokScrapeJobRunBatch.status, urlCount: tiktokScrapeJobRunBatch.urlCount })
    .from(tiktokScrapeJobRunBatch)
    .where(eq(tiktokScrapeJobRunBatch.jobRunId, jobRunId))

  const sent = rows.filter((r) => r.status === "sent")
  const notSent = rows.filter((r) => r.status !== "sent")

  const status = notSent.length === 0 ? "done" : sent.length === 0 ? "failed" : "partial"
  const batchesSent = sent.length
  const videoUrlsCount = sent.reduce((sum, r) => sum + r.urlCount, 0)

  await db
    .update(tiktokScrapeJobRun)
    .set({ status, completedAt: new Date(), batchesSent, videoUrlsCount })
    .where(eq(tiktokScrapeJobRun.id, jobRunId))
}

export async function runTiktokScrapeJob(): Promise<{ batchesSent: number; videoUrlsCount: number }> {
  // Record this run start — also acts as the cursor for next run
  const [jobRun] = await db
    .insert(tiktokScrapeJobRun)
    .values({ status: "running" })
    .returning()

  const thisRunStartedAt = jobRun.startedAt

  try {
    // Cursor: find the startedAt of the last run that got far enough to claim its URL window
    // (done or partial — a fully-failed run never created batch rows, so it's safe to retry naturally)
    const [lastClaimed] = await db
      .select({ lastRunAt: max(tiktokScrapeJobRun.startedAt) })
      .from(tiktokScrapeJobRun)
      .where(inArray(tiktokScrapeJobRun.status, ["done", "partial"]))

    const lastRunAt = lastClaimed?.lastRunAt ?? new Date(0)

    // All requests that have a webhook to notify
    const requests = await db
      .select()
      .from(tiktokHashtagRequest)
      .where(isNotNull(tiktokHashtagRequest.webhookUrl))

    const batchRows: ScrapeJobRunBatch[] = []

    for (const request of requests) {
      // Video URLs collected since the last claimed run and before this run started
      const rows = await db
        .select({ videoUrl: tiktokHashtagVideoResult.videoUrl })
        .from(tiktokHashtagVideoResult)
        .where(
          and(
            eq(tiktokHashtagVideoResult.hashtag, request.hashtag),
            gt(tiktokHashtagVideoResult.createdAt, lastRunAt),
            lte(tiktokHashtagVideoResult.createdAt, thisRunStartedAt),
          ),
        )

      if (rows.length === 0) continue

      const urls = rows.map((r) => r.videoUrl)
      const batches = chunk(urls, BATCH_SIZE)
      const webhookUrl = `${WEBHOOK_BASE}/api/webhooks/tiktok/hashtag?request_id=${request.id}`

      const inserted = await db
        .insert(tiktokScrapeJobRunBatch)
        .values(
          batches.map((batch) => ({
            jobRunId: jobRun.id,
            requestId: request.id,
            hashtag: request.hashtag,
            webhookUrl,
            urls: batch,
            urlCount: batch.length,
          })),
        )
        .returning()

      batchRows.push(...inserted)
    }

    for (const row of batchRows) {
      await dispatchBatchRow(row)
    }

    await recomputeJobRunStatus(jobRun.id)
  } catch (err) {
    // Truly unexpected failure (e.g. DB unreachable) before/while batches could be created
    await db
      .update(tiktokScrapeJobRun)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(tiktokScrapeJobRun.id, jobRun.id))
    throw err
  }

  const [finalRun] = await db
    .select({ batchesSent: tiktokScrapeJobRun.batchesSent, videoUrlsCount: tiktokScrapeJobRun.videoUrlsCount })
    .from(tiktokScrapeJobRun)
    .where(eq(tiktokScrapeJobRun.id, jobRun.id))

  return { batchesSent: finalRun?.batchesSent ?? 0, videoUrlsCount: finalRun?.videoUrlsCount ?? 0 }
}

export async function retryFailedScrapeJobBatches(jobRunId: string): Promise<void> {
  const [jobRun] = await db
    .select()
    .from(tiktokScrapeJobRun)
    .where(eq(tiktokScrapeJobRun.id, jobRunId))
    .limit(1)

  if (!jobRun) throw new Error("Job run not found")
  if (jobRun.status === "running") throw new Error("Job run is already running")

  await db
    .update(tiktokScrapeJobRun)
    .set({ status: "running" })
    .where(eq(tiktokScrapeJobRun.id, jobRunId))

  const pendingBatches = await db
    .select()
    .from(tiktokScrapeJobRunBatch)
    .where(
      and(
        eq(tiktokScrapeJobRunBatch.jobRunId, jobRunId),
        inArray(tiktokScrapeJobRunBatch.status, ["pending", "failed"]),
      ),
    )

  for (const row of pendingBatches) {
    await dispatchBatchRow(row)
  }

  await recomputeJobRunStatus(jobRunId)
}
