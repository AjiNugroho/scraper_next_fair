import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { instagramTaggedRequest } from "@/db/scraper-schema"
import { desc, count, and, gte, lte } from "drizzle-orm"
import { auth } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 100)
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0"), 0)
  const dateFrom = searchParams.get("date_from")
  const dateTo = searchParams.get("date_to")

  const conditions = []
  if (dateFrom) conditions.push(gte(instagramTaggedRequest.createdAt, new Date(dateFrom)))
  if (dateTo) conditions.push(lte(instagramTaggedRequest.createdAt, new Date(`${dateTo}T23:59:59.999Z`)))
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(instagramTaggedRequest)
      .where(where)
      .orderBy(desc(instagramTaggedRequest.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(instagramTaggedRequest).where(where),
  ])

  return NextResponse.json({ requests: rows, total })
}
