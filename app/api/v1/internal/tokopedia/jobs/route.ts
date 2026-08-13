import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tokopediaHashtagRequest, tokopediaJobHashtag } from "@/db/tokopedia-schema"
import { desc, count, inArray } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { rebalance } from "@/lib/tokopedia-rebalance"

const dataItemSchema = z.object({
  hashtag: z.string().min(1),
})

const inputSchema = z.object({
  extras: z.record(z.string(), z.unknown()).optional(),
  data: z.array(dataItemSchema).min(1).max(50),
})

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100)
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0"), 0)

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(tokopediaHashtagRequest)
      .orderBy(desc(tokopediaHashtagRequest.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tokopediaHashtagRequest),
  ])

  return NextResponse.json({ requests: rows, total })
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Client-facing webhook is fixed by ops, not chosen per-request — read it from
  // the environment rather than trusting a value submitted in the request body.
  const webhookUrl = process.env.TOKOPEDIA_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "TOKOPEDIA_WEBHOOK_URL is not configured on the server" },
      { status: 500 },
    )
  }

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

  const { extras, data } = parsed.data

  await db.insert(tokopediaHashtagRequest).values(
    data.map((item) => ({
      hashtag: item.hashtag,
      webhookUrl,
      extras: extras ?? null,
    })),
  )

  await db
    .insert(tokopediaJobHashtag)
    .values(data.map((item) => ({ hashtag: item.hashtag })))
    .onConflictDoNothing()

  await rebalance()

  return NextResponse.json({ success: true }, { status: 201 })
}

const deleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  await db
    .delete(tokopediaHashtagRequest)
    .where(inArray(tokopediaHashtagRequest.id, parsed.data.ids))

  return NextResponse.json({ success: true })
}
