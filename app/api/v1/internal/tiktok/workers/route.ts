import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tiktokWorker, tiktokWorkerHashtagTask } from "@/db/tiktok-schema"
import { asc, count, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { rebalance } from "@/lib/tiktok-rebalance"

const createSchema = z.object({
  name: z.string().min(1),
})

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workers = await db
    .select({
      id: tiktokWorker.id,
      name: tiktokWorker.name,
      createdAt: tiktokWorker.createdAt,
      hashtagCount: count(tiktokWorkerHashtagTask.id),
    })
    .from(tiktokWorker)
    .leftJoin(tiktokWorkerHashtagTask, eq(tiktokWorker.id, tiktokWorkerHashtagTask.workerId))
    .groupBy(tiktokWorker.id, tiktokWorker.name, tiktokWorker.createdAt)
    .orderBy(asc(tiktokWorker.createdAt))

  return NextResponse.json({ workers })
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
    .select({ id: tiktokWorker.id })
    .from(tiktokWorker)
    .where(eq(tiktokWorker.name, parsed.data.name))
    .limit(1)

  if (existing.length > 0) {
    return NextResponse.json({ error: "Worker name already exists" }, { status: 409 })
  }

  const [worker] = await db
    .insert(tiktokWorker)
    .values({ name: parsed.data.name })
    .returning()

  await rebalance()

  return NextResponse.json({ success: true, worker }, { status: 201 })
}
