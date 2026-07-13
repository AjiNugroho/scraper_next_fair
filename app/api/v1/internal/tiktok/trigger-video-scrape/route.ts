import { NextRequest, NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { runTiktokScrapeJob } from "@/lib/tiktok-scrape-job"

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  after(() =>
    runTiktokScrapeJob().catch((err) => console.error("[trigger-video-scrape] job failed:", err)),
  )

  return NextResponse.json({ success: true })
}
