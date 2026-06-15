import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { instagramTaggedRequest } from "@/db/scraper-schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { publishInstagramTaggedItems } from "@/lib/rabbitmq"

const itemSchema = z.object({
  data_size: z.number().min(1),
  identifier: z.string().min(1),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
})

const inputSchema = z.object({
  webhook_url: z.url().optional(),
  extras: z.record(z.string(), z.unknown()).optional(),
  data: z.array(itemSchema).min(1).max(50),
})

async function requireApiKey(req: NextRequest) {
  const key = req.headers.get("x-api-key")
  if (!key) {
    return { key: null, error: NextResponse.json({ error: "Missing API key" }, { status: 401 }) }
  }

  const result = await auth.api.verifyApiKey({ body: { key } })
  if (!result.valid) {
    return { key: null, error: NextResponse.json({ error: result.error?.message ?? "Invalid API key" }, { status: 401 }) }
  }

  return { key: result.key!, error: null }
}

export async function POST(req: NextRequest) {
  const { key: apiKey, error: authError } = await requireApiKey(req)
  if (authError) return authError

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = inputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { webhook_url, extras, data } = parsed.data
  const requestor = apiKey.name ?? "api-client"

  const [created] = await db
    .insert(instagramTaggedRequest)
    .values({
      id: crypto.randomUUID(),
      requestor,
      webhookUrl: webhook_url ?? null,
      extras: extras ? JSON.stringify(extras) : null,
      data: JSON.stringify(data),
    })
    .returning()

  try {
    await publishInstagramTaggedItems({
      items: data,
      webhookUrl: webhook_url,
      extras,
      requestId: created.id,
    })
  } catch (err) {
    await db
      .update(instagramTaggedRequest)
      .set({ status: "failed" })
      .where(eq(instagramTaggedRequest.id, created.id))

    console.error("[rabbitmq] publish failed:", err)
    return NextResponse.json(
      { error: "Request saved but could not be queued. Check RabbitMQ connectivity." },
      { status: 502 },
    )
  }

  return NextResponse.json(
    { success: true, request_id: created.id, sent_messages: data.length },
    { status: 201 },
  )
}
