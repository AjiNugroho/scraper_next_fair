import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tiktokHashtagRequest, tiktokWorker, tiktokWorkerHashtagTask, tiktokJobHashtag } from "@/db/tiktok-schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { z } from "zod"

const updateSchema = z.object({
  webhook_url: z.string().nullable().optional(),
  extras: z.record(z.string(), z.unknown()).nullable().optional(),
  listen_group_id: z.number().int().nullable().optional(),
  request_data_id: z.number().int().nullable().optional(),
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireApiKey(req)
  if (authError) return authError

  const { id: workerName } = await params

  const [worker] = await db
    .select()
    .from(tiktokWorker)
    .where(eq(tiktokWorker.name, workerName))
    .limit(1)

  if (!worker) {
    return NextResponse.json({ error: "Worker not registered" }, { status: 404 })
  }

  const tasks = await db
    .select({ hashtag: tiktokJobHashtag.hashtag })
    .from(tiktokWorkerHashtagTask)
    .innerJoin(tiktokJobHashtag, eq(tiktokWorkerHashtagTask.hashtagId, tiktokJobHashtag.id))
    .where(eq(tiktokWorkerHashtagTask.workerId, worker.id))

  return NextResponse.json({ hashtags: tasks.map((t) => t.hashtag) })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireApiKey(req)
  if (authError) return authError

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { webhook_url, extras, listen_group_id, request_data_id } = parsed.data

  const patch: Record<string, unknown> = {}
  if (webhook_url !== undefined) patch.webhookUrl = webhook_url
  if (extras !== undefined) patch.extras = extras
  if (listen_group_id !== undefined) patch.listenGroupId = listen_group_id
  if (request_data_id !== undefined) patch.requestDataId = request_data_id

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 })
  }

  const [updated] = await db
    .update(tiktokHashtagRequest)
    .set(patch)
    .where(eq(tiktokHashtagRequest.id, id))
    .returning()

  if (!updated) return NextResponse.json({ error: "Job not found" }, { status: 404 })

  return NextResponse.json({ success: true, job: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error: authError } = await requireApiKey(req)
  if (authError) return authError

  const { id } = await params

  const [deleted] = await db
    .delete(tiktokHashtagRequest)
    .where(eq(tiktokHashtagRequest.id, id))
    .returning()

  if (!deleted) return NextResponse.json({ error: "Job not found" }, { status: 404 })

  return NextResponse.json({ success: true })
}
