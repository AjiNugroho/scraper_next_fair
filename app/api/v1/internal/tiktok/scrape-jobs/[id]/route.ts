import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokScrapeJobRun, tiktokScrapeJobRunBatch } from "@/db/tiktok-schema"
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
    .from(tiktokScrapeJobRun)
    .where(eq(tiktokScrapeJobRun.id, id))
    .limit(1)
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const batchesWhere = status
    ? and(eq(tiktokScrapeJobRunBatch.jobRunId, id), eq(tiktokScrapeJobRunBatch.status, status))
    : eq(tiktokScrapeJobRunBatch.jobRunId, id)

  const [batches, [{ total }]] = await Promise.all([
    db
      .select({
        id: tiktokScrapeJobRunBatch.id,
        hashtag: tiktokScrapeJobRunBatch.hashtag,
        urlCount: tiktokScrapeJobRunBatch.urlCount,
        status: tiktokScrapeJobRunBatch.status,
        attempts: tiktokScrapeJobRunBatch.attempts,
        error: tiktokScrapeJobRunBatch.error,
        sentAt: tiktokScrapeJobRunBatch.sentAt,
        updatedAt: tiktokScrapeJobRunBatch.updatedAt,
      })
      .from(tiktokScrapeJobRunBatch)
      .where(batchesWhere)
      .orderBy(desc(tiktokScrapeJobRunBatch.updatedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tiktokScrapeJobRunBatch).where(batchesWhere),
  ])

  return NextResponse.json({ run, batches, total, limit, offset })
}
