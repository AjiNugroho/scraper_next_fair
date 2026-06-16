import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tiktokHashtagRequest } from "@/db/tiktok-schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { z } from "zod"

const updateSchema = z.object({
  hashtag: z.string().min(1).optional(),
  webhook_url: z.string().optional().nullable(),
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

  const { hashtag, webhook_url, extras } = parsed.data
  const updates: Partial<typeof tiktokHashtagRequest.$inferInsert> = {}

  if (hashtag !== undefined) updates.hashtag = hashtag
  if (webhook_url !== undefined) updates.webhookUrl = webhook_url ?? null
  if (extras !== undefined) {
    updates.extras = extras ?? null
    updates.listenGroupId =
      extras && typeof extras.listen_group_id === "number" ? extras.listen_group_id : null
    updates.requestDataId =
      extras && typeof extras.request_data_id === "number" ? extras.request_data_id : null
  }

  const rows = await db
    .update(tiktokHashtagRequest)
    .set(updates)
    .where(eq(tiktokHashtagRequest.id, id))
    .returning()

  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(rows[0])
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const rows = await db
    .delete(tiktokHashtagRequest)
    .where(eq(tiktokHashtagRequest.id, id))
    .returning({ id: tiktokHashtagRequest.id })

  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ success: true })
}
