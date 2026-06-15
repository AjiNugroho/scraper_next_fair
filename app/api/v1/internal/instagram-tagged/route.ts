import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { instagramTaggedRequest } from "@/db/scraper-schema"
import { desc, count, eq } from "drizzle-orm"
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

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 100)
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0"), 0)

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(instagramTaggedRequest)
      .orderBy(desc(instagramTaggedRequest.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(instagramTaggedRequest),
  ])

  return NextResponse.json({ requests: rows, total })
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  // Persist the request first — record always exists regardless of queue outcome.
  const [created] = await db
    .insert(instagramTaggedRequest)
    .values({
      id: crypto.randomUUID(),
      webhookUrl: webhook_url ?? null,
      extras: extras ? JSON.stringify(extras) : null,
      data: JSON.stringify(data),
    })
    .returning()

  // Publish one message per item in parallel, matching the worker contract.
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
    { success: true, sent_messages: data.length, request: created },
    { status: 201 },
  )
}
