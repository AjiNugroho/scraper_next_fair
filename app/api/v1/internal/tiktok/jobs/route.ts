import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tiktokHashtagRequest, tiktokJobHashtag } from "@/db/tiktok-schema"
import { and, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { rebalance } from "@/lib/tiktok-rebalance"

const dataItemSchema = z.object({
  identifier: z.string().min(1),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
  data_size: z.number().int().optional(),
})

const inputSchema = z.object({
  webhook_url: z.string().optional(),
  extras: z.record(z.string(), z.unknown()).optional(),
  data: z.array(dataItemSchema).min(1).max(50),
})

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100)
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0"), 0)
  const search = searchParams.get("search")?.trim() ?? ""
  const listenGroupId = parseInt(searchParams.get("listenGroupId") ?? "")
  const requestDataId = parseInt(searchParams.get("requestDataId") ?? "")

  const filters: SQL[] = []
  if (search) {
    const pattern = `%${search}%`
    filters.push(
      or(
        ilike(tiktokHashtagRequest.hashtag, pattern),
        sql`${tiktokHashtagRequest.extras}::text ilike ${pattern}`,
      )!,
    )
  }
  if (!Number.isNaN(listenGroupId)) filters.push(eq(tiktokHashtagRequest.listenGroupId, listenGroupId))
  if (!Number.isNaN(requestDataId)) filters.push(eq(tiktokHashtagRequest.requestDataId, requestDataId))
  const where = filters.length > 0 ? and(...filters) : undefined

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(tiktokHashtagRequest)
      .where(where)
      .orderBy(desc(tiktokHashtagRequest.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tiktokHashtagRequest).where(where),
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
  const listenGroupId = typeof extras?.listen_group_id === "number" ? extras.listen_group_id : null
  const requestDataId = typeof extras?.request_data_id === "number" ? extras.request_data_id : null

  await db
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

  await db
    .insert(tiktokJobHashtag)
    .values(data.map((item) => ({ hashtag: item.identifier })))
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

  await db.delete(tiktokHashtagRequest).where(inArray(tiktokHashtagRequest.id, parsed.data.ids))

  return NextResponse.json({ success: true })
}
