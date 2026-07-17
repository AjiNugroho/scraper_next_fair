import { NextRequest, NextResponse } from "next/server"
import { asc, isNotNull } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokHashtagRequest } from "@/db/tiktok-schema"

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await db
    .selectDistinct({ hashtag: tiktokHashtagRequest.hashtag })
    .from(tiktokHashtagRequest)
    .where(isNotNull(tiktokHashtagRequest.webhookUrl))
    .orderBy(asc(tiktokHashtagRequest.hashtag))

  return NextResponse.json({ hashtags: rows.map((r) => r.hashtag) })
}
