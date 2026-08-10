import { randomUUID } from "crypto"
import { db } from "@/db/drizzle"
import {
  tiktokHashtagVideoResult,
  tiktokPhylloScrapeJobRun,
  tiktokPhylloScrapeJobRunItem,
} from "@/db/tiktok-schema"
import { phylloScrapeRequest } from "@/db/phyllo-schema"
import { and, eq, gt, lte, isNotNull, inArray, max, count } from "drizzle-orm"
import { z } from "zod"
import { scrapeVideoByUrl } from "@/lib/phyllo-scraper"

const CONCURRENCY = 10
const WEBHOOK_BASE = process.env.BETTER_AUTH_URL ?? ""

type ScrapeJobRunItem = typeof tiktokPhylloScrapeJobRunItem.$inferSelect

export const phylloScrapeJobFilterSchema = z.object({
  hashtags: z.array(z.string()).nullable().optional(),
  from: z.iso.datetime().nullable().optional(),
  to: z.iso.datetime().nullable().optional(),
})

export type PhylloScrapeJobFilters = {
  hashtags?: string[] | null
  from?: Date | null
  to?: Date | null
}

async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0
  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor++]
      await fn(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
}

async function resolveWindow(filters?: PhylloScrapeJobFilters): Promise<{ from: Date; to: Date }> {
  const to = filters?.to ?? new Date()
  if (filters?.from) return { from: filters.from, to }

  // Cursor: last run that got far enough to claim its URL window (done or partial),
  // excluding custom/filtered runs — those only cover a subset of hashtags or a
  // one-off window, so they must never move the shared cursor forward.
  const [lastClaimed] = await db
    .select({ lastRunAt: max(tiktokPhylloScrapeJobRun.startedAt) })
    .from(tiktokPhylloScrapeJobRun)
    .where(
      and(
        inArray(tiktokPhylloScrapeJobRun.status, ["done", "partial"]),
        eq(tiktokPhylloScrapeJobRun.isCustom, false),
      ),
    )

  return { from: lastClaimed?.lastRunAt ?? new Date(0), to }
}

async function resolveEligibleRequests(hashtags?: string[] | null) {
  const conditions = [isNotNull(phylloScrapeRequest.webhookUrl)]
  if (hashtags && hashtags.length > 0) {
    conditions.push(inArray(phylloScrapeRequest.hashtag, hashtags))
  }
  return db
    .select()
    .from(phylloScrapeRequest)
    .where(and(...conditions))
}

async function dispatchItemRow(row: ScrapeJobRunItem): Promise<void> {
  try {
    await scrapeVideoByUrl(row.url, row.callbackId, row.webhookUrl)
    await db
      .update(tiktokPhylloScrapeJobRunItem)
      .set({ status: "sent", sentAt: new Date(), error: null, attempts: row.attempts + 1 })
      .where(eq(tiktokPhylloScrapeJobRunItem.id, row.id))
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown dispatch error"
    console.error(`[tiktok-phyllo-scrape-job] failed to dispatch item ${row.id}:`, err)
    await db
      .update(tiktokPhylloScrapeJobRunItem)
      .set({ status: "failed", error, attempts: row.attempts + 1 })
      .where(eq(tiktokPhylloScrapeJobRunItem.id, row.id))
  }
}

async function recomputeJobRunStatus(jobRunId: string): Promise<void> {
  const rows = await db
    .select({ status: tiktokPhylloScrapeJobRunItem.status })
    .from(tiktokPhylloScrapeJobRunItem)
    .where(eq(tiktokPhylloScrapeJobRunItem.jobRunId, jobRunId))

  const sent = rows.filter((r) => r.status === "sent")
  const notSent = rows.filter((r) => r.status !== "sent")

  const status = notSent.length === 0 ? "done" : sent.length === 0 ? "failed" : "partial"

  await db
    .update(tiktokPhylloScrapeJobRun)
    .set({ status, completedAt: new Date(), itemsSent: sent.length, videoUrlsCount: sent.length })
    .where(eq(tiktokPhylloScrapeJobRun.id, jobRunId))
}

export async function previewPhylloScrapeJob(filters?: PhylloScrapeJobFilters): Promise<{
  from: Date
  to: Date
  hashtagsCount: number
  videoUrlsCount: number
}> {
  const { from, to } = await resolveWindow(filters)
  const requests = await resolveEligibleRequests(filters?.hashtags)

  let videoUrlsCount = 0
  for (const request of requests) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(tiktokHashtagVideoResult)
      .where(
        and(
          eq(tiktokHashtagVideoResult.hashtag, request.hashtag),
          gt(tiktokHashtagVideoResult.createdAt, from),
          lte(tiktokHashtagVideoResult.createdAt, to),
        ),
      )
    videoUrlsCount += total
  }

  return { from, to, hashtagsCount: requests.length, videoUrlsCount }
}

export async function runTiktokPhylloScrapeJob(
  filters?: PhylloScrapeJobFilters,
): Promise<{ itemsSent: number; videoUrlsCount: number }> {
  const isCustom = !!(filters?.hashtags || filters?.from || filters?.to)
  const { from, to } = await resolveWindow(filters)

  // Record this run start — a non-custom run also acts as the cursor for the next default run
  const [jobRun] = await db
    .insert(tiktokPhylloScrapeJobRun)
    .values({
      status: "running",
      isCustom,
      filterHashtags: filters?.hashtags ?? null,
      filterFrom: filters?.from ?? null,
      filterTo: filters?.to ?? null,
    })
    .returning()

  try {
    // All requests that have a webhook to notify (optionally restricted to selected hashtags)
    const requests = await resolveEligibleRequests(filters?.hashtags)

    const itemRows: ScrapeJobRunItem[] = []

    for (const request of requests) {
      // Video URLs collected within the resolved window
      const rows = await db
        .select({ videoUrl: tiktokHashtagVideoResult.videoUrl })
        .from(tiktokHashtagVideoResult)
        .where(
          and(
            eq(tiktokHashtagVideoResult.hashtag, request.hashtag),
            gt(tiktokHashtagVideoResult.createdAt, from),
            lte(tiktokHashtagVideoResult.createdAt, to),
          ),
        )

      if (rows.length === 0) continue

      const webhookUrl = `${WEBHOOK_BASE}/api/webhooks/tiktok/phyllo`

      const inserted = await db
        .insert(tiktokPhylloScrapeJobRunItem)
        .values(
          rows.map((r) => ({
            jobRunId: jobRun.id,
            requestId: request.id,
            hashtag: request.hashtag,
            webhookUrl,
            url: r.videoUrl,
            callbackId: randomUUID(),
          })),
        )
        .returning()

      itemRows.push(...inserted)
    }

    await mapWithConcurrency(itemRows, CONCURRENCY, dispatchItemRow)

    await recomputeJobRunStatus(jobRun.id)
  } catch (err) {
    // Truly unexpected failure (e.g. DB unreachable) before/while items could be created
    await db
      .update(tiktokPhylloScrapeJobRun)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(tiktokPhylloScrapeJobRun.id, jobRun.id))
    throw err
  }

  const [finalRun] = await db
    .select({ itemsSent: tiktokPhylloScrapeJobRun.itemsSent, videoUrlsCount: tiktokPhylloScrapeJobRun.videoUrlsCount })
    .from(tiktokPhylloScrapeJobRun)
    .where(eq(tiktokPhylloScrapeJobRun.id, jobRun.id))

  return { itemsSent: finalRun?.itemsSent ?? 0, videoUrlsCount: finalRun?.videoUrlsCount ?? 0 }
}

export async function retryFailedPhylloScrapeJobItems(jobRunId: string): Promise<void> {
  const [jobRun] = await db
    .select()
    .from(tiktokPhylloScrapeJobRun)
    .where(eq(tiktokPhylloScrapeJobRun.id, jobRunId))
    .limit(1)

  if (!jobRun) throw new Error("Job run not found")
  if (jobRun.status === "running") throw new Error("Job run is already running")

  await db
    .update(tiktokPhylloScrapeJobRun)
    .set({ status: "running" })
    .where(eq(tiktokPhylloScrapeJobRun.id, jobRunId))

  const pendingItems = await db
    .select()
    .from(tiktokPhylloScrapeJobRunItem)
    .where(
      and(
        eq(tiktokPhylloScrapeJobRunItem.jobRunId, jobRunId),
        inArray(tiktokPhylloScrapeJobRunItem.status, ["pending", "failed"]),
      ),
    )

  await mapWithConcurrency(pendingItems, CONCURRENCY, dispatchItemRow)

  await recomputeJobRunStatus(jobRunId)
}
