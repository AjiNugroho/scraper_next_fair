import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tokopediaWorker, tokopediaWorkerHashtagTask } from "@/db/tokopedia-schema"
import { asc, count, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { rebalance } from "@/lib/tokopedia-rebalance"

const createSchema = z.object({
  name: z.string().min(1),
})

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const workers = await db
    .select({
      id: tokopediaWorker.id,
      name: tokopediaWorker.name,
      createdAt: tokopediaWorker.createdAt,
      hashtagCount: count(tokopediaWorkerHashtagTask.id),
    })
    .from(tokopediaWorker)
    .leftJoin(tokopediaWorkerHashtagTask, eq(tokopediaWorker.id, tokopediaWorkerHashtagTask.workerId))
    .groupBy(tokopediaWorker.id, tokopediaWorker.name, tokopediaWorker.createdAt)
    .orderBy(asc(tokopediaWorker.createdAt))

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
    .select({ id: tokopediaWorker.id })
    .from(tokopediaWorker)
    .where(eq(tokopediaWorker.name, parsed.data.name))
    .limit(1)

  if (existing.length > 0) {
    return NextResponse.json({ error: "Worker name already exists" }, { status: 409 })
  }

  const [worker] = await db
    .insert(tokopediaWorker)
    .values({ name: parsed.data.name })
    .returning()

  await rebalance()

  return NextResponse.json({ success: true, worker }, { status: 201 })
}
