import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import {
  tiktokBeautyPhylloJobRun,
  tiktokBeautyPhylloJobRunItem,
  tiktokHashtagRequest,
} from "@/db/tiktok-schema"
import { eq, and, count, desc } from "drizzle-orm"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100_000)
  const offset = Number(searchParams.get("offset") ?? 0)

  const [run] = await db
    .select()
    .from(tiktokBeautyPhylloJobRun)
    .where(eq(tiktokBeautyPhylloJobRun.id, id))
    .limit(1)
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const itemsWhere = status
    ? and(eq(tiktokBeautyPhylloJobRunItem.jobRunId, id), eq(tiktokBeautyPhylloJobRunItem.status, status))
    : eq(tiktokBeautyPhylloJobRunItem.jobRunId, id)

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: tiktokBeautyPhylloJobRunItem.id,
        requestId: tiktokBeautyPhylloJobRunItem.requestId,
        listenGroupId: tiktokHashtagRequest.listenGroupId,
        requestDataId: tiktokHashtagRequest.requestDataId,
        hashtag: tiktokBeautyPhylloJobRunItem.hashtag,
        url: tiktokBeautyPhylloJobRunItem.url,
        status: tiktokBeautyPhylloJobRunItem.status,
        attempts: tiktokBeautyPhylloJobRunItem.attempts,
        error: tiktokBeautyPhylloJobRunItem.error,
        sentAt: tiktokBeautyPhylloJobRunItem.sentAt,
        updatedAt: tiktokBeautyPhylloJobRunItem.updatedAt,
      })
      .from(tiktokBeautyPhylloJobRunItem)
      .leftJoin(tiktokHashtagRequest, eq(tiktokBeautyPhylloJobRunItem.requestId, tiktokHashtagRequest.id))
      .where(itemsWhere)
      .orderBy(desc(tiktokBeautyPhylloJobRunItem.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tiktokBeautyPhylloJobRunItem).where(itemsWhere),
  ])

  return NextResponse.json({ run, items, total, limit, offset })
}
