import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tokopediaJobHashtag } from "@/db/tokopedia-schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { z } from "zod"

// This edits the live job queue (tokopedia_job_hashtag), not the submission
// log (tokopedia_hashtag_request) — the two are linked only by matching text
// at submission time, so renaming here intentionally does not rewrite the
// original request's audit row.
const updateSchema = z.object({
  hashtag: z.string().min(1),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  try {
    const rows = await db
      .update(tokopediaJobHashtag)
      .set({ hashtag: parsed.data.hashtag })
      .where(eq(tokopediaJobHashtag.id, id))
      .returning()

    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json(rows[0])
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: `"${parsed.data.hashtag}" is already queued under a different hashtag` },
        { status: 409 },
      )
    }
    throw err
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Deleting cascades to tokopedia_worker_hashtag_task, so this also frees up
  // whatever worker had it assigned. Remaining assignments are left as-is —
  // no need to rebalance since every other task keeps its existing worker.
  const rows = await db
    .delete(tokopediaJobHashtag)
    .where(eq(tokopediaJobHashtag.id, id))
    .returning({ id: tokopediaJobHashtag.id })

  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true })
}
