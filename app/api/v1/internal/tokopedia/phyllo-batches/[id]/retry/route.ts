import { NextRequest, NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tokopediaPhylloBatch } from "@/db/tokopedia-schema"
import { eq } from "drizzle-orm"
import { retryFailedPhylloBatchItems } from "@/lib/tokopedia-phyllo-batch"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [batch] = await db
    .select()
    .from(tokopediaPhylloBatch)
    .where(eq(tokopediaPhylloBatch.id, id))
    .limit(1)
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (batch.status === "running") {
    return NextResponse.json({ error: "Batch is already running" }, { status: 409 })
  }

  after(() =>
    retryFailedPhylloBatchItems(id).catch((err) =>
      console.error("[tokopedia/phyllo-batches/retry] failed:", err),
    ),
  )

  return NextResponse.json({ success: true })
}
