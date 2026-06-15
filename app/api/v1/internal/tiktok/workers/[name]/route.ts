import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tiktokWorker } from "@/db/tiktok-schema"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { rebalance } from "@/lib/tiktok-rebalance"

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name } = await params

  const deleted = await db
    .delete(tiktokWorker)
    .where(eq(tiktokWorker.name, name))
    .returning()

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Worker not found" }, { status: 404 })
  }

  await rebalance()

  return NextResponse.json({ success: true })
}
