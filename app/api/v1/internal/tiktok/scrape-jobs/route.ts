import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokScrapeJobRun } from "@/db/tiktok-schema"
import { desc, count } from "drizzle-orm"

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100)
  const offset = Number(searchParams.get("offset") ?? 0)

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(tiktokScrapeJobRun)
      .orderBy(desc(tiktokScrapeJobRun.startedAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tiktokScrapeJobRun),
  ])

  return NextResponse.json({ runs: rows, total, limit, offset })
}
