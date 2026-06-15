import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tiktokJobHashtag } from "@/db/tiktok-schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { rebalance } from "@/lib/tiktok-rebalance"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const deleted = await db
    .delete(tiktokJobHashtag)
    .where(eq(tiktokJobHashtag.id, id))
    .returning()

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Hashtag not found" }, { status: 404 })
  }

  await rebalance()

  return NextResponse.json({ success: true })
}
