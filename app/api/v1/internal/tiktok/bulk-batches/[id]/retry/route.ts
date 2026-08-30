import { NextRequest, NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokBulkBatch, tiktokBulkBatchItem } from "@/db/tiktok-schema"
import { eq, and, or, count } from "drizzle-orm"
import { retryFailedAndStuck } from "@/lib/tiktok-bulk-processor"

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

  const [{ eligible }] = await db
    .select({ eligible: count() })
    .from(tiktokBulkBatchItem)
    .where(
      and(
        eq(tiktokBulkBatchItem.batchId, id),
        or(eq(tiktokBulkBatchItem.status, "failed"), eq(tiktokBulkBatchItem.status, "running")),
      ),
    )
  if (eligible === 0) {
    return NextResponse.json({ error: "Nothing to retry" }, { status: 400 })
  }

  after(() =>
    retryFailedAndStuck(id).catch((err) => console.error("[bulk-batches/retry] processor failed:", err)),
  )

  return NextResponse.json({ success: true, queued: eligible })
}
