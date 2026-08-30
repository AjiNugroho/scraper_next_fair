import { NextRequest, NextResponse, after } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokBulkBatch, tiktokBulkBatchItem } from "@/db/tiktok-schema"
import { eq, and, inArray, count } from "drizzle-orm"
import { retryItems, type RetryableStatus } from "@/lib/tiktok-bulk-processor"

const bodySchema = z.object({
  statuses: z.array(z.enum(["failed", "running"])).min(1),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "statuses must include 'failed' and/or 'running'" }, { status: 400 })
  }
  const statuses: RetryableStatus[] = parsed.data.statuses

  const [batch] = await db
    .select()
    .from(tiktokBulkBatch)
    .where(eq(tiktokBulkBatch.id, id))
    .limit(1)
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Fresh lookup against the item rows themselves — never trust the batch's
  // running counters (dispatched/successCount/failedCount) for this, they can
  // drift from the true per-item status.
  const [{ eligible }] = await db
    .select({ eligible: count() })
    .from(tiktokBulkBatchItem)
    .where(and(eq(tiktokBulkBatchItem.batchId, id), inArray(tiktokBulkBatchItem.status, statuses)))
  if (eligible === 0) {
    return NextResponse.json({ error: "Nothing to retry for the selected status(es)" }, { status: 400 })
  }

  after(() =>
    retryItems(id, statuses).catch((err) => console.error("[bulk-batches/retry] processor failed:", err)),
  )

  return NextResponse.json({ success: true, queued: eligible })
}
