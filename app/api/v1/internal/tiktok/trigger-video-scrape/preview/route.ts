import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { previewTiktokScrapeJob, scrapeJobFilterSchema } from "@/lib/tiktok-scrape-job"

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    // No body is fine — falls back to the fully-default preview
  }

  const parsed = scrapeJobFilterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const preview = await previewTiktokScrapeJob({
    hashtags: parsed.data.hashtags ?? null,
    from: parsed.data.from ? new Date(parsed.data.from) : null,
    to: parsed.data.to ? new Date(parsed.data.to) : null,
  })

  return NextResponse.json(preview)
}
