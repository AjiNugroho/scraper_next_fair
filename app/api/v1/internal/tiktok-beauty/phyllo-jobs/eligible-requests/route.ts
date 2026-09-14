import { NextRequest, NextResponse } from "next/server"
import { asc, desc, isNotNull } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokHashtagRequest } from "@/db/tiktok-schema"

// Requests that can receive Phyllo results (have a webhook), listed individually so
// requests sharing a hashtag can be selected independently.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const requests = await db
    .select({
      id: tiktokHashtagRequest.id,
      hashtag: tiktokHashtagRequest.hashtag,
      listenGroupId: tiktokHashtagRequest.listenGroupId,
      requestDataId: tiktokHashtagRequest.requestDataId,
      webhookUrl: tiktokHashtagRequest.webhookUrl,
      createdAt: tiktokHashtagRequest.createdAt,
    })
    .from(tiktokHashtagRequest)
    .where(isNotNull(tiktokHashtagRequest.webhookUrl))
    .orderBy(asc(tiktokHashtagRequest.hashtag), desc(tiktokHashtagRequest.createdAt))

  return NextResponse.json({ requests })
}
