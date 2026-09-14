import { randomUUID } from "crypto"
import { db } from "@/db/drizzle"
import {
  tiktokBeautyPhylloJobRun,
  tiktokBeautyPhylloJobRunItem,
  tiktokHashtagRequest,
  tiktokHashtagVideoResult,
} from "@/db/tiktok-schema"
import { and, eq, gt, lte, isNotNull, inArray, max, count } from "drizzle-orm"
import { z } from "zod"
import { scrapeVideoByUrl } from "@/lib/phyllo-scraper"

const CONCURRENCY = 10
const WEBHOOK_BASE = process.env.BETTER_AUTH_URL ?? ""

type JobRunItem = typeof tiktokBeautyPhylloJobRunItem.$inferSelect

export const beautyPhylloJobFilterSchema = z.object({
  requestIds: z.array(z.uuid()).min(1).nullable().optional(),
  from: z.iso.datetime().nullable().optional(),
  to: z.iso.datetime().nullable().optional(),
})

export type BeautyPhylloJobFilters = {
  requestIds?: string[] | null
  from?: Date | null
  to?: Date | null
}

export function parseBeautyPhylloJobFilters(
  data: z.infer<typeof beautyPhylloJobFilterSchema>,
): BeautyPhylloJobFilters {
  return {
    requestIds: data.requestIds ?? null,
    from: data.from ? new Date(data.from) : null,
    to: data.to ? new Date(data.to) : null,
  }
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

async function resolveWindow(filters?: BeautyPhylloJobFilters): Promise<{ from: Date; to: Date }> {
  const to = filters?.to ?? new Date()
  if (filters?.from) return { from: filters.from, to }

  // Cursor: last non-custom run that claimed its URL window. Custom runs only cover
  // a subset of requests or a one-off window, so they never move the cursor.
  const [lastClaimed] = await db
    .select({ lastRunAt: max(tiktokBeautyPhylloJobRun.startedAt) })
    .from(tiktokBeautyPhylloJobRun)
    .where(
      and(
        inArray(tiktokBeautyPhylloJobRun.status, ["done", "partial"]),
        eq(tiktokBeautyPhylloJobRun.isCustom, false),
      ),
    )

  return { from: lastClaimed?.lastRunAt ?? new Date(0), to }
}

async function resolveEligibleRequests(requestIds?: string[] | null) {
  const conditions = [isNotNull(tiktokHashtagRequest.webhookUrl)]
  if (requestIds && requestIds.length > 0) {
    conditions.push(inArray(tiktokHashtagRequest.id, requestIds))
  }
  return db
    .select()
    .from(tiktokHashtagRequest)
    .where(and(...conditions))
}

function videoUrlsInWindow(hashtag: string, from: Date, to: Date) {
  return and(
    eq(tiktokHashtagVideoResult.hashtag, hashtag),
    gt(tiktokHashtagVideoResult.createdAt, from),
    lte(tiktokHashtagVideoResult.createdAt, to),
  )
}

async function dispatchItemRow(row: JobRunItem): Promise<void> {
  try {
    await scrapeVideoByUrl(row.url, row.callbackId, row.webhookUrl)
    await db
      .update(tiktokBeautyPhylloJobRunItem)
      .set({ status: "sent", sentAt: new Date(), error: null, attempts: row.attempts + 1 })
      .where(eq(tiktokBeautyPhylloJobRunItem.id, row.id))
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown dispatch error"
    console.error(`[tiktok-beauty-phyllo-job] failed to dispatch item ${row.id}:`, err)
    await db
      .update(tiktokBeautyPhylloJobRunItem)
      .set({ status: "failed", error, attempts: row.attempts + 1 })
      .where(eq(tiktokBeautyPhylloJobRunItem.id, row.id))
  }
}

async function recomputeJobRunStatus(jobRunId: string): Promise<void> {
  const rows = await db
    .select({ status: tiktokBeautyPhylloJobRunItem.status })
    .from(tiktokBeautyPhylloJobRunItem)
    .where(eq(tiktokBeautyPhylloJobRunItem.jobRunId, jobRunId))

  const sent = rows.filter((r) => r.status === "sent")
  const notSent = rows.filter((r) => r.status !== "sent")

  const status = notSent.length === 0 ? "done" : sent.length === 0 ? "failed" : "partial"

  await db
    .update(tiktokBeautyPhylloJobRun)
    .set({ status, completedAt: new Date(), itemsSent: sent.length, videoUrlsCount: sent.length })
    .where(eq(tiktokBeautyPhylloJobRun.id, jobRunId))
}

export async function previewBeautyPhylloJob(filters?: BeautyPhylloJobFilters): Promise<{
  from: Date
  to: Date
  requestsCount: number
  hashtagsCount: number
  videoUrlsCount: number
}> {
  const { from, to } = await resolveWindow(filters)
  const requests = await resolveEligibleRequests(filters?.requestIds)

  // Each request gets its own copy of its hashtag's URLs, so count per request.
  let videoUrlsCount = 0
  for (const request of requests) {
    const [{ total }] = await db
      .select({ total: count() })
      .from(tiktokHashtagVideoResult)
      .where(videoUrlsInWindow(request.hashtag, from, to))
    videoUrlsCount += total
  }

  return {
    from,
    to,
    requestsCount: requests.length,
    hashtagsCount: new Set(requests.map((r) => r.hashtag)).size,
    videoUrlsCount,
  }
}

export async function runBeautyPhylloJob(
  filters?: BeautyPhylloJobFilters,
): Promise<{ itemsSent: number; videoUrlsCount: number }> {
  const isCustom = !!(filters?.requestIds || filters?.from || filters?.to)
  const { from, to } = await resolveWindow(filters)

  const [jobRun] = await db
    .insert(tiktokBeautyPhylloJobRun)
    .values({
      status: "running",
      isCustom,
      filterRequestIds: filters?.requestIds ?? null,
      filterFrom: filters?.from ?? null,
      filterTo: filters?.to ?? null,
    })
    .returning()

  try {
    const requests = await resolveEligibleRequests(filters?.requestIds)

    await db
      .update(tiktokBeautyPhylloJobRun)
      .set({
        requestsCount: requests.length,
        hashtags: [...new Set(requests.map((r) => r.hashtag))].sort(),
      })
      .where(eq(tiktokBeautyPhylloJobRun.id, jobRun.id))

    const webhookUrl = `${WEBHOOK_BASE}/api/webhooks/tiktok-beauty/phyllo`
    const itemRows: JobRunItem[] = []

    for (const request of requests) {
      const rows = await db
        .select({ videoUrl: tiktokHashtagVideoResult.videoUrl })
        .from(tiktokHashtagVideoResult)
        .where(videoUrlsInWindow(request.hashtag, from, to))

      if (rows.length === 0) continue

      // One item per (request, URL) with its own callback_id — the webhook resolves
      // the callback back to exactly this request, never to others sharing the hashtag.
      const inserted = await db
        .insert(tiktokBeautyPhylloJobRunItem)
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
    await db
      .update(tiktokBeautyPhylloJobRun)
      .set({ status: "failed", completedAt: new Date() })
      .where(eq(tiktokBeautyPhylloJobRun.id, jobRun.id))
    throw err
  }

  const [finalRun] = await db
    .select({
      itemsSent: tiktokBeautyPhylloJobRun.itemsSent,
      videoUrlsCount: tiktokBeautyPhylloJobRun.videoUrlsCount,
    })
    .from(tiktokBeautyPhylloJobRun)
    .where(eq(tiktokBeautyPhylloJobRun.id, jobRun.id))

  return { itemsSent: finalRun?.itemsSent ?? 0, videoUrlsCount: finalRun?.videoUrlsCount ?? 0 }
}

export async function retryFailedBeautyPhylloJobItems(jobRunId: string): Promise<void> {
  const [jobRun] = await db
    .select()
    .from(tiktokBeautyPhylloJobRun)
    .where(eq(tiktokBeautyPhylloJobRun.id, jobRunId))
    .limit(1)

  if (!jobRun) throw new Error("Job run not found")
  if (jobRun.status === "running") throw new Error("Job run is already running")

  await db
    .update(tiktokBeautyPhylloJobRun)
    .set({ status: "running" })
    .where(eq(tiktokBeautyPhylloJobRun.id, jobRunId))

  const pendingItems = await db
    .select()
    .from(tiktokBeautyPhylloJobRunItem)
    .where(
      and(
        eq(tiktokBeautyPhylloJobRunItem.jobRunId, jobRunId),
        inArray(tiktokBeautyPhylloJobRunItem.status, ["pending", "failed"]),
      ),
    )

  await mapWithConcurrency(pendingItems, CONCURRENCY, dispatchItemRow)

  await recomputeJobRunStatus(jobRunId)
}
