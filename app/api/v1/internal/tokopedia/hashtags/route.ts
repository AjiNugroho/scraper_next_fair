import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tokopediaJobHashtag, tokopediaWorker, tokopediaWorkerHashtagTask } from "@/db/tokopedia-schema"
import { asc, count, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200)
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0"), 0)
  const workerId = searchParams.get("worker_id")

  const whereClause = workerId ? eq(tokopediaWorker.id, workerId) : undefined

  const baseQuery = db
    .select({
      id: tokopediaJobHashtag.id,
      hashtag: tokopediaJobHashtag.hashtag,
      createdAt: tokopediaJobHashtag.createdAt,
      workerName: tokopediaWorker.name,
      workerId: tokopediaWorker.id,
    })
    .from(tokopediaJobHashtag)
    .leftJoin(
      tokopediaWorkerHashtagTask,
      eq(tokopediaJobHashtag.id, tokopediaWorkerHashtagTask.hashtagId),
    )
    .leftJoin(tokopediaWorker, eq(tokopediaWorkerHashtagTask.workerId, tokopediaWorker.id))
    .$dynamic()

  const [rows, [{ total }]] = await Promise.all([
    baseQuery
      .where(whereClause)
      .orderBy(asc(tokopediaJobHashtag.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tokopediaJobHashtag),
  ])

  return NextResponse.json({ hashtags: rows, total })
}
