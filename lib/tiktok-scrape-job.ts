import { db } from "@/db/drizzle"
import { tiktokHashtagRequest, tiktokHashtagVideoResult, tiktokScrapeJobRun } from "@/db/tiktok-schema"
import { and, eq, gt, lte, isNotNull, max } from "drizzle-orm"
import { scrapeVideosByUrl } from "@/lib/brightdata"

const BATCH_SIZE = 50
const WEBHOOK_BASE = process.env.BETTER_AUTH_URL ?? ""

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

export async function runTiktokScrapeJob(): Promise<{ batchesSent: number; videoUrlsCount: number }> {
  // Record this run start — also acts as the cursor for next run
  const [jobRun] = await db
    .insert(tiktokScrapeJobRun)
    .values({ status: "running" })
    .returning()

  const thisRunStartedAt = jobRun.startedAt

  // Cursor: find the startedAt of the last successful run
  const [lastDone] = await db
    .select({ lastRunAt: max(tiktokScrapeJobRun.startedAt) })
    .from(tiktokScrapeJobRun)
    .where(eq(tiktokScrapeJobRun.status, "done"))

  const lastRunAt = lastDone?.lastRunAt ?? new Date(0)

  // All requests that have a webhook to notify
  const requests = await db
    .select()
    .from(tiktokHashtagRequest)
    .where(isNotNull(tiktokHashtagRequest.webhookUrl))

  let totalBatches = 0
  let totalUrls = 0

  try {
    for (const request of requests) {
      // Video URLs collected since the last job run and before this run started
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

      for (const batch of batches) {
        await scrapeVideosByUrl(batch, webhookUrl)
        totalBatches++
        totalUrls += batch.length
      }
    }

    await db
      .update(tiktokScrapeJobRun)
      .set({ status: "done", completedAt: new Date(), batchesSent: totalBatches, videoUrlsCount: totalUrls })
      .where(eq(tiktokScrapeJobRun.id, jobRun.id))
  } catch (err) {
    await db
      .update(tiktokScrapeJobRun)
      .set({ status: "failed", completedAt: new Date(), batchesSent: totalBatches, videoUrlsCount: totalUrls })
      .where(eq(tiktokScrapeJobRun.id, jobRun.id))
    throw err
  }

  return { batchesSent: totalBatches, videoUrlsCount: totalUrls }
}
