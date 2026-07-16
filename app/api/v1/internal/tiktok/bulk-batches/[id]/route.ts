import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokBulkBatch, tiktokBulkBatchItem, tiktokBulkVideoResult } from "@/db/tiktok-schema"
import { eq, and, count, sql } from "drizzle-orm"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100_000)
  const offset = Number(searchParams.get("offset") ?? 0)

  const [batch] = await db
    .select()
    .from(tiktokBulkBatch)
    .where(eq(tiktokBulkBatch.id, id))
    .limit(1)
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const itemsWhere = status
    ? and(eq(tiktokBulkBatchItem.batchId, id), eq(tiktokBulkBatchItem.status, status))
    : eq(tiktokBulkBatchItem.batchId, id)

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: tiktokBulkBatchItem.id,
        batchId: tiktokBulkBatchItem.batchId,
        url: tiktokBulkBatchItem.url,
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
        isTiktokShop: sql<boolean>`${tiktokBulkVideoResult.product} IS NOT NULL`,
        productDetail: tiktokBulkVideoResult.product,
      })
      .from(tiktokBulkBatchItem)
      .leftJoin(tiktokBulkVideoResult, eq(tiktokBulkVideoResult.itemId, tiktokBulkBatchItem.id))
      .where(itemsWhere)
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tiktokBulkBatchItem).where(itemsWhere),
  ])

  return NextResponse.json({ batch, items, total, limit, offset })
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
