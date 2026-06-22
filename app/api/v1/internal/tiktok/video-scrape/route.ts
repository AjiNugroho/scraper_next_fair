import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { publishTiktokVideoScrape } from "@/lib/rabbitmq"
import { randomUUID } from "crypto"

const scrapeSchema = z.object({
  request_id: z.string().min(1),
  url: z.string().url(),
  webhook_url: z.string().url(),
  extras: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = scrapeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { request_id, url, webhook_url, extras } = parsed.data

  try {
    await publishTiktokVideoScrape({
      taskId: randomUUID(),
      requestId: request_id,
      url,
      webhookUrl: webhook_url,
      extras,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[internal/tiktok/video-scrape] rabbitmq publish failed:", err)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  return NextResponse.json({ request_id, status: "queued" }, { status: 202 })
}
