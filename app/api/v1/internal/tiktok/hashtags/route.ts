import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tiktokJobHashtag, tiktokWorker, tiktokWorkerHashtagTask } from "@/db/tiktok-schema"
import { asc, count, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { rebalance } from "@/lib/tiktok-rebalance"

const createSchema = z.object({
  hashtag: z.string().min(1),
})

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200)
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0"), 0)
  const workerId = searchParams.get("worker_id")

  const whereClause = workerId ? eq(tiktokWorker.id, workerId) : undefined

  const baseQuery = db
    .select({
      id: tiktokJobHashtag.id,
      hashtag: tiktokJobHashtag.hashtag,
      createdAt: tiktokJobHashtag.createdAt,
      workerName: tiktokWorker.name,
      workerId: tiktokWorker.id,
    })
    .from(tiktokJobHashtag)
    .leftJoin(tiktokWorkerHashtagTask, eq(tiktokJobHashtag.id, tiktokWorkerHashtagTask.hashtagId))
    .leftJoin(tiktokWorker, eq(tiktokWorkerHashtagTask.workerId, tiktokWorker.id))
    .$dynamic()

  const [rows, [{ total }]] = await Promise.all([
    baseQuery
      .where(whereClause)
      .orderBy(asc(tiktokJobHashtag.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tiktokJobHashtag),
  ])

  return NextResponse.json({ hashtags: rows, total })
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

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const existing = await db
    .select({ id: tiktokJobHashtag.id })
    .from(tiktokJobHashtag)
    .where(eq(tiktokJobHashtag.hashtag, parsed.data.hashtag))
    .limit(1)

  if (existing.length > 0) {
    return NextResponse.json({ error: "Hashtag already exists" }, { status: 409 })
  }

  const [hashtag] = await db
    .insert(tiktokJobHashtag)
    .values({ hashtag: parsed.data.hashtag })
    .returning()

  await rebalance()

  return NextResponse.json({ success: true, hashtag }, { status: 201 })
}
