import { NextRequest, NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokBulkJob, tiktokBulkJobItem } from "@/db/tiktok-schema"
import { eq, and, sql } from "drizzle-orm"
import { retryFailedItems, processBulkJob } from "@/lib/tiktok-bulk-processor"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [job] = await db.select().from(tiktokBulkJob).where(eq(tiktokBulkJob.id, id)).limit(1)
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (job.status === "running") {
    return NextResponse.json({ error: "Job is still running" }, { status: 409 })
  }

  await retryFailedItems(id)

  // Recalculate counts after reset
  const [{ failedCount }] = await db
    .select({ failedCount: sql<number>`count(*)::int` })
    .from(tiktokBulkJobItem)
    .where(and(eq(tiktokBulkJobItem.bulkJobId, id), eq(tiktokBulkJobItem.status, "failed")))

  await db
    .update(tiktokBulkJob)
    .set({ failedCount, status: "pending" })
    .where(eq(tiktokBulkJob.id, id))

  after(() => processBulkJob(id).catch((err) => console.error("[bulk-jobs/retry] processor failed:", err)))

  return NextResponse.json({ success: true })
}
