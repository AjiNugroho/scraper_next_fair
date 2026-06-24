import { NextRequest, NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokBulkBatch } from "@/db/tiktok-schema"
import { eq } from "drizzle-orm"
import { startBatch } from "@/lib/tiktok-bulk-processor"

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

  if (batch.status === "running") {
    return NextResponse.json({ error: "Batch is already running" }, { status: 409 })
  }
  if (batch.status === "done") {
    return NextResponse.json({ error: "Batch already fully dispatched" }, { status: 409 })
  }

  after(() =>
    startBatch(id).catch((err) => console.error("[bulk-batches/start] processor failed:", err)),
  )

  return NextResponse.json({ success: true })
}
