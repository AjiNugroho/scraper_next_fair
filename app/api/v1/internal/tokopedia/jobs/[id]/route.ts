import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tokopediaHashtagRequest, tokopediaJobHashtag } from "@/db/tokopedia-schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { z } from "zod"

// webhook_url is intentionally not editable here — it always reflects
// TOKOPEDIA_WEBHOOK_URL from the environment, set at submission time.
const updateSchema = z.object({
  hashtag: z.string().min(1).optional(),
  extras: z.record(z.string(), z.unknown()).optional().nullable(),
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

  const { hashtag, extras } = parsed.data
  const updates: Partial<typeof tokopediaHashtagRequest.$inferInsert> = {}

  if (hashtag !== undefined) updates.hashtag = hashtag
  if (extras !== undefined) updates.extras = extras ?? null

  try {
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ hashtag: tokopediaHashtagRequest.hashtag })
        .from(tokopediaHashtagRequest)
        .where(eq(tokopediaHashtagRequest.id, id))
        .limit(1)

      if (!existing) return null

      const [updated] = await tx
        .update(tokopediaHashtagRequest)
        .set(updates)
        .where(eq(tokopediaHashtagRequest.id, id))
        .returning()

      // The request row is just a submission log — the hashtag actually queued
      // for scraping (and assigned to a worker) lives in tokopediaJobHashtag,
      // linked only by matching text. Rename it too, or the worker keeps
      // scraping the old hashtag forever.
      if (hashtag !== undefined && hashtag !== existing.hashtag) {
        await tx
          .update(tokopediaJobHashtag)
          .set({ hashtag })
          .where(eq(tokopediaJobHashtag.hashtag, existing.hashtag))
      }

      return updated
    })

    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof Error && "code" in err && (err as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: `"${hashtag}" is already queued under a different request` },
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

  const rows = await db
    .delete(tokopediaHashtagRequest)
    .where(eq(tokopediaHashtagRequest.id, id))
    .returning({ id: tokopediaHashtagRequest.id })

  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true })
}
