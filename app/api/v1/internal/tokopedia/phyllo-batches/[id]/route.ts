import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tokopediaPhylloBatch, tokopediaPhylloBatchItem } from "@/db/tokopedia-schema"
import { eq, and, count, desc } from "drizzle-orm"

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
    .from(tokopediaPhylloBatch)
    .where(eq(tokopediaPhylloBatch.id, id))
    .limit(1)
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const itemsWhere = status
    ? and(eq(tokopediaPhylloBatchItem.batchId, id), eq(tokopediaPhylloBatchItem.status, status))
    : eq(tokopediaPhylloBatchItem.batchId, id)

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: tokopediaPhylloBatchItem.id,
        workerName: tokopediaPhylloBatchItem.workerName,
        hashtag: tokopediaPhylloBatchItem.hashtag,
        videoUrl: tokopediaPhylloBatchItem.videoUrl,
        status: tokopediaPhylloBatchItem.status,
        attempts: tokopediaPhylloBatchItem.attempts,
        error: tokopediaPhylloBatchItem.error,
        sentAt: tokopediaPhylloBatchItem.sentAt,
        updatedAt: tokopediaPhylloBatchItem.updatedAt,
      })
      .from(tokopediaPhylloBatchItem)
      .where(itemsWhere)
      .orderBy(desc(tokopediaPhylloBatchItem.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tokopediaPhylloBatchItem).where(itemsWhere),
  ])

  return NextResponse.json({ batch, items, total, limit, offset })
}
