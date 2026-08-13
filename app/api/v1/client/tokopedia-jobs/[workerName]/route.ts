import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tokopediaWorker, tokopediaWorkerHashtagTask, tokopediaJobHashtag } from "@/db/tokopedia-schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"

async function requireApiKey(req: NextRequest) {
  const key = req.headers.get("x-api-key")
  if (!key) {
    return { error: NextResponse.json({ error: "Missing API key" }, { status: 401 }) }
  }
  const result = await auth.api.verifyApiKey({ body: { key } })
  if (!result.valid) {
    return {
      error: NextResponse.json(
        { error: result.error?.message ?? "Invalid API key" },
        { status: 401 },
      ),
    }
  }
  return { error: null }
}

// Called by a mobile scraper worker to fetch the hashtags currently assigned to
// it, so it knows what to search for on this poll.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workerName: string }> },
) {
  const { error: authError } = await requireApiKey(req)
  if (authError) return authError

  const { workerName } = await params

  const [worker] = await db
    .select()
    .from(tokopediaWorker)
    .where(eq(tokopediaWorker.name, workerName))
    .limit(1)

  if (!worker) {
    return NextResponse.json({ error: "Worker not registered" }, { status: 404 })
  }

  const tasks = await db
    .select({ hashtag: tokopediaJobHashtag.hashtag })
    .from(tokopediaWorkerHashtagTask)
    .innerJoin(tokopediaJobHashtag, eq(tokopediaWorkerHashtagTask.hashtagId, tokopediaJobHashtag.id))
    .where(eq(tokopediaWorkerHashtagTask.workerId, worker.id))

  return NextResponse.json({ hashtags: tasks.map((t) => t.hashtag) })
}
