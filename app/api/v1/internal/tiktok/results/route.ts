import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tiktokHashtagVideoResult } from "@/db/tiktok-schema"
import { auth } from "@/lib/auth"
import { ilike, inArray, and, count, desc, eq } from "drizzle-orm"
import { z } from "zod"

async function requireSession(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  return { error: null }
}

export async function GET(req: NextRequest) {
  const { error } = await requireSession(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") ?? ""
  const hashtag = searchParams.get("hashtag") ?? ""
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 100)
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0"), 0)

  const filters = []
  if (search) filters.push(ilike(tiktokHashtagVideoResult.videoUrl, `%${search}%`))
  if (hashtag) filters.push(eq(tiktokHashtagVideoResult.hashtag, hashtag))
  const where = filters.length > 0 ? and(...filters) : undefined

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(tiktokHashtagVideoResult)
      .where(where)
      .orderBy(desc(tiktokHashtagVideoResult.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tiktokHashtagVideoResult).where(where),
  ])

  return NextResponse.json({ results: rows, total, limit, offset })
}

const deleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

export async function DELETE(req: NextRequest) {
  const { error } = await requireSession(req)
  if (error) return error

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  await db
    .delete(tiktokHashtagVideoResult)
    .where(inArray(tiktokHashtagVideoResult.id, parsed.data.ids))

  return NextResponse.json({ success: true })
}
