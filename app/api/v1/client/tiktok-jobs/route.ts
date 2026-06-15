import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tiktokHashtagRequest, tiktokJobHashtag } from "@/db/tiktok-schema"
import { desc, count } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { rebalance } from "@/lib/tiktok-rebalance"

const dataItemSchema = z.object({
  identifier: z.string().min(1),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
  data_size: z.number().int().optional(),
})

const createSchema = z.object({
  webhook_url: z.string().optional(),
  extras: z.record(z.string(), z.unknown()).optional(),
  data: z.array(dataItemSchema).min(1).max(50),
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

export async function GET(req: NextRequest) {
  const { error: authError } = await requireApiKey(req)
  if (authError) return authError

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100)
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0"), 0)

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(tiktokHashtagRequest)
      .orderBy(desc(tiktokHashtagRequest.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tiktokHashtagRequest),
  ])

  return NextResponse.json({ jobs: rows, total, limit, offset })
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

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { webhook_url, extras, data } = parsed.data
  const listenGroupId =
    typeof extras?.listen_group_id === "number" ? extras.listen_group_id : null
  const requestDataId =
    typeof extras?.request_data_id === "number" ? extras.request_data_id : null

  const created = await db
    .insert(tiktokHashtagRequest)
    .values(
      data.map((item) => ({
        listenGroupId,
        requestDataId,
        hashtag: item.identifier,
        webhookUrl: webhook_url ?? null,
        extras: extras ?? null,
      })),
    )
    .returning()

  await db
    .insert(tiktokJobHashtag)
    .values(data.map((item) => ({ hashtag: item.identifier })))
    .onConflictDoNothing()

  await rebalance()

  return NextResponse.json({ success: true, jobs: created }, { status: 201 })
}
