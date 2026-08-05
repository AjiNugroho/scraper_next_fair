import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokScraperTestRun } from "@/db/tiktok-schema"
import { desc, count } from "drizzle-orm"
import { createScraperTestRun, scraperTestInputSchema } from "@/lib/tiktok-scraper-test"

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100)
  const offset = Number(searchParams.get("offset") ?? 0)

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: tiktokScraperTestRun.id,
        provider: tiktokScraperTestRun.provider,
        videoUrl: tiktokScraperTestRun.videoUrl,
        clientWebhookUrl: tiktokScraperTestRun.clientWebhookUrl,
        status: tiktokScraperTestRun.status,
        clientStatusCode: tiktokScraperTestRun.clientStatusCode,
        createdAt: tiktokScraperTestRun.createdAt,
        sentAt: tiktokScraperTestRun.sentAt,
        deliveredAt: tiktokScraperTestRun.deliveredAt,
      })
      .from(tiktokScraperTestRun)
      .orderBy(desc(tiktokScraperTestRun.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tiktokScraperTestRun),
  ])

  return NextResponse.json({ runs: rows, total, limit, offset })
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = scraperTestInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  // Awaited, not deferred — the tester needs to see immediately whether the
  // provider accepted the trigger. The provider callback lands separately.
  const run = await createScraperTestRun(parsed.data)

  return NextResponse.json({ run }, { status: 201 })
}
