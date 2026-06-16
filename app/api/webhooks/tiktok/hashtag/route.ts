import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tiktokHashtagRequest } from "@/db/tiktok-schema"
import { webhookDeliveryLog } from "@/db/scraper-schema"
import { eq } from "drizzle-orm"

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const requestId = searchParams.get("request_id")

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const totalCount = Array.isArray(rawBody) ? rawBody.length : 0

  let clientWebhook: string | null = null
  let extras: Record<string, unknown> = {}

  if (requestId) {
    const [request] = await db
      .select()
      .from(tiktokHashtagRequest)
      .where(eq(tiktokHashtagRequest.id, requestId))
      .limit(1)

    if (request) {
      clientWebhook = request.webhookUrl ?? null
      extras = (request.extras as Record<string, unknown>) ?? {}
    }
  }

  let statusCode: number | null = null
  let responseBody: string | null = null
  let errorMessage: string | null = null

  if (clientWebhook) {
    try {
      const clientRes = await fetch(clientWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: rawBody, extras }),
      })
      statusCode = clientRes.status
      responseBody = await clientRes.text()
      if (!clientRes.ok) {
        errorMessage = `Webhook responded with status ${statusCode}`
        console.error(`[webhook/tiktok/hashtag] client webhook ${statusCode}:`, responseBody)
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Unknown error"
      console.error("[webhook/tiktok/hashtag] client webhook delivery failed:", err)
    }
  }

  await db
    .insert(webhookDeliveryLog)
    .values({
      requestId: requestId ?? null,
      platform: "tiktok",
      accountName: null,
      clientWebhook,
      totalCount,
      validCount: totalCount,
      statusCode,
      responseBody,
      errorMessage,
    })
    .catch((err) => console.error("[webhook/tiktok/hashtag] log insert failed:", err))

  return NextResponse.json({ success: true, received: totalCount })
}
