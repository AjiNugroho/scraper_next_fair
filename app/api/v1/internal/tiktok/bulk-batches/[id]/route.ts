import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import {
  tiktokBulkBatch,
  tiktokBulkBatchItem,
  tiktokBulkVideoResult,
  tiktokHashtagVideoResult,
} from "@/db/tiktok-schema"
import { eq, and, count, inArray, isNull, sql } from "drizzle-orm"

// The worker stores TikTok's createTime as unix seconds in a string.
function toDatePosted(value: string | null): string | null {
  if (!value) return null
  const date = /^\d+$/.test(value) ? new Date(Number(value) * 1000) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

// Fallback for items uploaded without a hashtag: the hashtag(s) each URL was
// collected under by the hashtag scraper, keyed by URL. Unlike the uploaded
// value this is a best guess and can list several. Both sides drop the query
// string so a share link (?is_from_webapp=1…) still matches the URL the worker
// saved.
async function hashtagsByUrl(batchId: string): Promise<Map<string, string>> {
  const resultUrl = sql<string>`split_part(${tiktokHashtagVideoResult.videoUrl}, '?', 1)`
  const rows = await db
    .select({
      url: resultUrl,
      hashtags: sql<string>`string_agg(DISTINCT ${tiktokHashtagVideoResult.hashtag}, ', ' ORDER BY ${tiktokHashtagVideoResult.hashtag})`,
    })
    .from(tiktokHashtagVideoResult)
    .where(
      inArray(
        resultUrl,
        db
          .select({ url: sql<string>`split_part(${tiktokBulkBatchItem.url}, '?', 1)` })
          .from(tiktokBulkBatchItem)
          .where(and(eq(tiktokBulkBatchItem.batchId, batchId), isNull(tiktokBulkBatchItem.hashtag))),
      ),
    )
    .groupBy(resultUrl)
  return new Map(rows.map((row) => [row.url, row.hashtags]))
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100_000)
  const offset = Number(searchParams.get("offset") ?? 0)
  // Only the CSV download asks for the hashtag fallback: the lookup scans the
  // hashtag results table, which is too heavy for the detail page's 4s polling.
  const includeHashtag = searchParams.get("include") === "hashtag"

  const [batch] = await db
    .select()
    .from(tiktokBulkBatch)
    .where(eq(tiktokBulkBatch.id, id))
    .limit(1)
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const itemsWhere = status
    ? and(eq(tiktokBulkBatchItem.batchId, id), eq(tiktokBulkBatchItem.status, status))
    : eq(tiktokBulkBatchItem.batchId, id)

  const [rows, [{ total }], statusCountRows, hashtags] = await Promise.all([
    db
      .select({
        id: tiktokBulkBatchItem.id,
        batchId: tiktokBulkBatchItem.batchId,
        url: tiktokBulkBatchItem.url,
        hashtag: tiktokBulkBatchItem.hashtag,
        status: tiktokBulkBatchItem.status,
        retryCount: tiktokBulkBatchItem.retryCount,
        error: tiktokBulkBatchItem.error,
        createdAt: tiktokBulkBatchItem.createdAt,
        updatedAt: tiktokBulkBatchItem.updatedAt,
        statsPlays: tiktokBulkVideoResult.statsPlays,
        statsLikes: tiktokBulkVideoResult.statsLikes,
        statsComments: tiktokBulkVideoResult.statsComments,
        statsShares: tiktokBulkVideoResult.statsShares,
        statsSaves: tiktokBulkVideoResult.statsSaves,
        statsReposts: tiktokBulkVideoResult.statsReposts,
        authorFollowers: sql<number | null>`${tiktokBulkVideoResult.author} -> 'followers'`,
        authorUsername: sql<string | null>`${tiktokBulkVideoResult.author} ->> 'handle'`,
        description: tiktokBulkVideoResult.description,
        videoCreatedAt: tiktokBulkVideoResult.videoCreatedAt,
        isTiktokShop: sql<boolean>`${tiktokBulkVideoResult.product} IS NOT NULL`,
        productDetail: tiktokBulkVideoResult.product,
      })
      .from(tiktokBulkBatchItem)
      .leftJoin(tiktokBulkVideoResult, eq(tiktokBulkVideoResult.itemId, tiktokBulkBatchItem.id))
      .where(itemsWhere)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tiktokBulkBatchItem).where(itemsWhere),
    // Ground truth for how many items are actually in each status right now —
    // unlike batch.dispatched/successCount/failedCount (running counters that
    // can drift), this is a live count straight off the item rows. Always
    // scoped to the whole batch, independent of the `status` filter above.
    db
      .select({ status: tiktokBulkBatchItem.status, count: count() })
      .from(tiktokBulkBatchItem)
      .where(eq(tiktokBulkBatchItem.batchId, id))
      .groupBy(tiktokBulkBatchItem.status),
    includeHashtag ? hashtagsByUrl(id) : null,
  ])

  const items = rows.map(({ videoCreatedAt, ...row }) => ({
    ...row,
    datePosted: toDatePosted(videoCreatedAt),
    hashtag: row.hashtag ?? hashtags?.get(row.url.split("?")[0]) ?? null,
  }))

  const statusCounts = { pending: 0, running: 0, success: 0, failed: 0 }
  for (const row of statusCountRows) {
    if (row.status in statusCounts) statusCounts[row.status as keyof typeof statusCounts] = row.count
  }

  return NextResponse.json({ batch, items, total, limit, offset, statusCounts })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [batch] = await db
    .select()
    .from(tiktokBulkBatch)
    .where(eq(tiktokBulkBatch.id, id))
    .limit(1)
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (batch.status === "running") {
    return NextResponse.json({ error: "Cannot delete a running batch" }, { status: 409 })
  }

  await db.delete(tiktokBulkBatch).where(eq(tiktokBulkBatch.id, id))

  return NextResponse.json({ success: true })
}
