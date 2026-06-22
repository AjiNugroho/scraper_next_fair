import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokBulkJob, tiktokBulkJobItem } from "@/db/tiktok-schema"
import { eq, and, count } from "drizzle-orm"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") // filter items by status
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200)
  const offset = Number(searchParams.get("offset") ?? 0)

  const [job] = await db.select().from(tiktokBulkJob).where(eq(tiktokBulkJob.id, id)).limit(1)
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const itemsWhere = status
    ? and(eq(tiktokBulkJobItem.bulkJobId, id), eq(tiktokBulkJobItem.status, status))
    : eq(tiktokBulkJobItem.bulkJobId, id)

  const [items, [{ total }]] = await Promise.all([
    db.select().from(tiktokBulkJobItem).where(itemsWhere).limit(limit).offset(offset),
    db.select({ total: count() }).from(tiktokBulkJobItem).where(itemsWhere),
  ])

  return NextResponse.json({ job, items, total, limit, offset })
}
