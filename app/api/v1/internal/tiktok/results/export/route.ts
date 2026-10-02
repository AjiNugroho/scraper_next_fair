import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tiktokHashtagVideoResult } from "@/db/tiktok-schema"
import { auth } from "@/lib/auth"
import { and, asc, gte, inArray, lte } from "drizzle-orm"
import { z } from "zod"

const querySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
  hashtags: z.array(z.string().min(1)),
})

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const parsed = querySchema.safeParse({
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    hashtags: searchParams.getAll("hashtag"),
  })
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { from, to, hashtags } = parsed.data
  if (from > to) {
    return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 })
  }

  // No hashtag params → all hashtags.
  const filters = [
    gte(tiktokHashtagVideoResult.createdAt, from),
    lte(tiktokHashtagVideoResult.createdAt, to),
  ]
  if (hashtags.length > 0) filters.push(inArray(tiktokHashtagVideoResult.hashtag, hashtags))

  const rows = await db
    .select({
      hashtag: tiktokHashtagVideoResult.hashtag,
      workerName: tiktokHashtagVideoResult.workerName,
      videoUrl: tiktokHashtagVideoResult.videoUrl,
      createdAt: tiktokHashtagVideoResult.createdAt,
    })
    .from(tiktokHashtagVideoResult)
    .where(and(...filters))
    .orderBy(asc(tiktokHashtagVideoResult.hashtag), asc(tiktokHashtagVideoResult.createdAt))

  const lines = [
    "hashtag,worker,video_url,collected_at",
    ...rows.map((r) =>
      [r.hashtag, r.workerName, r.videoUrl, r.createdAt.toISOString()].map(csvCell).join(","),
    ),
  ]

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="beauty-videos.csv"',
      "X-Row-Count": String(rows.length),
    },
  })
}
