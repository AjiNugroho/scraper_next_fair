import { NextRequest, NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokScrapeJobRun } from "@/db/tiktok-schema"
import { eq } from "drizzle-orm"
import { retryFailedScrapeJobBatches } from "@/lib/tiktok-scrape-job"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [run] = await db
    .select()
    .from(tiktokScrapeJobRun)
    .where(eq(tiktokScrapeJobRun.id, id))
    .limit(1)
  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (run.status === "running") {
    return NextResponse.json({ error: "Job run is already running" }, { status: 409 })
  }

  after(() =>
    retryFailedScrapeJobBatches(id).catch((err) => console.error("[scrape-jobs/retry] failed:", err)),
  )

  return NextResponse.json({ success: true })
}
