import { NextRequest, NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { runTiktokPhylloScrapeJob, phylloScrapeJobFilterSchema } from "@/lib/tiktok-phyllo-scrape-job"

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    // No body is fine — falls back to the fully-default run
  }

  const parsed = phylloScrapeJobFilterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const filters = {
    hashtags: parsed.data.hashtags ?? null,
    from: parsed.data.from ? new Date(parsed.data.from) : null,
    to: parsed.data.to ? new Date(parsed.data.to) : null,
  }

  after(() =>
    runTiktokPhylloScrapeJob(filters).catch((err) =>
      console.error("[trigger-phyllo-scrape] job failed:", err),
    ),
  )

  return NextResponse.json({ success: true })
}
