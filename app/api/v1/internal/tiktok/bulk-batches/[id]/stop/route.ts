import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokBulkBatch } from "@/db/tiktok-schema"
import { eq } from "drizzle-orm"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [batch] = await db
    .select()
    .from(tiktokBulkBatch)
    .where(eq(tiktokBulkBatch.id, id))
    .limit(1)
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (batch.status !== "running") {
    return NextResponse.json({ error: "Batch is not running" }, { status: 409 })
  }

  await db
    .update(tiktokBulkBatch)
    .set({ status: "stopped" })
    .where(eq(tiktokBulkBatch.id, id))

  return NextResponse.json({ success: true })
}
