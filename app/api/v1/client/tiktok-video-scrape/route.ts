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

async function requireApiKey(req: NextRequest) {
  const key = req.headers.get("x-api-key")
  if (!key) {
    return { key: null, error: NextResponse.json({ error: "Missing API key" }, { status: 401 }) }
  }
  const result = await auth.api.verifyApiKey({ body: { key } })
  if (!result.valid) {
    return {
      key: null,
      error: NextResponse.json(
        { error: result.error?.message ?? "Invalid API key" },
        { status: 401 },
      ),
    }
  }
  return { key: result.key!, error: null }
}

export async function POST(req: NextRequest) {
  const { error: authError } = await requireApiKey(req)
  if (authError) return authError

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
    console.error("[tiktok-video-scrape] rabbitmq publish failed:", err)
    return NextResponse.json({ error: message }, { status: 502 })
  }

  return NextResponse.json({ request_id, status: "queued" }, { status: 202 })
}
