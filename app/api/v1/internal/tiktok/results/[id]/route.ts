import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tiktokHashtagVideoResult } from "@/db/tiktok-schema"
import { auth } from "@/lib/auth"
import { eq } from "drizzle-orm"

async function requireSession(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  return { error: null }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireSession(req)
  if (error) return error

  const { id } = await params

  const [deleted] = await db
    .delete(tiktokHashtagVideoResult)
    .where(eq(tiktokHashtagVideoResult.id, id))
    .returning()

  if (!deleted) return NextResponse.json({ error: "Result not found" }, { status: 404 })

  return NextResponse.json({ success: true })
}
