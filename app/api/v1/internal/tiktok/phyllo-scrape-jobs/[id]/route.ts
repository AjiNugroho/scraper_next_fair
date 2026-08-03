import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokPhylloScrapeJobRun, tiktokPhylloScrapeJobRunItem } from "@/db/tiktok-schema"
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
    .from(tiktokPhylloScrapeJobRun)
    .where(eq(tiktokPhylloScrapeJobRun.id, id))
    .limit(1)
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const itemsWhere = status
    ? and(eq(tiktokPhylloScrapeJobRunItem.jobRunId, id), eq(tiktokPhylloScrapeJobRunItem.status, status))
    : eq(tiktokPhylloScrapeJobRunItem.jobRunId, id)

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: tiktokPhylloScrapeJobRunItem.id,
        hashtag: tiktokPhylloScrapeJobRunItem.hashtag,
        url: tiktokPhylloScrapeJobRunItem.url,
        status: tiktokPhylloScrapeJobRunItem.status,
        attempts: tiktokPhylloScrapeJobRunItem.attempts,
        error: tiktokPhylloScrapeJobRunItem.error,
        sentAt: tiktokPhylloScrapeJobRunItem.sentAt,
        updatedAt: tiktokPhylloScrapeJobRunItem.updatedAt,
      })
      .from(tiktokPhylloScrapeJobRunItem)
      .where(itemsWhere)
      .orderBy(desc(tiktokPhylloScrapeJobRunItem.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tiktokPhylloScrapeJobRunItem).where(itemsWhere),
  ])

  return NextResponse.json({ run, items, total, limit, offset })
}
