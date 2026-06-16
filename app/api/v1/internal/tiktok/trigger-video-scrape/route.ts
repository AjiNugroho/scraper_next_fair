import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { runTiktokScrapeJob } from "@/lib/tiktok-scrape-job"

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const result = await runTiktokScrapeJob()
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[trigger-video-scrape]", err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
