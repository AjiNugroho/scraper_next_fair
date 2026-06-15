import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { instagramTaggedRequest, webhookDeliveryLog } from "@/db/scraper-schema"
import { eq } from "drizzle-orm"
import type { InstagramPost_gd_lk5ns7kz21pck8jpis } from "@/types/intagram_posts_gd_lk5ns7kz21pck8jpis"
import { typeConverterV2, type WebhookPayload } from "@/lib/instagram"

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const requestId = searchParams.get("request_id")
  const accountName = searchParams.get("account_name")
  const clientWebhook = searchParams.get("client_webhook") || null
  const extrasParam = searchParams.get("extras")

  let extras: Record<string, unknown> = {}
  if (extrasParam) {
    try {
      extras = JSON.parse(extrasParam)
    } catch {
      console.error("[webhook] extras parse error, ignoring")
    }
  }

  let rawPosts: InstagramPost_gd_lk5ns7kz21pck8jpis[]
  try {
    rawPosts = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const validPosts = rawPosts.filter((item) => item?.url)
  const convertedPosts = validPosts.map(typeConverterV2)
  const totalCount = rawPosts.length
  const validCount = convertedPosts.length

  const payload: WebhookPayload = {
    account_name: accountName,
    date_scraped: new Date().toISOString(),
    posts: convertedPosts,
    extras,
  }

  // Forward to the client's webhook and capture the result for logging.
  let statusCode: number | null = null
  let responseBody: string | null = null
  let errorMessage: string | null = null

  if (clientWebhook) {
    try {
      const clientRes = await fetch(clientWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      statusCode = clientRes.status
      responseBody = await clientRes.text()

      if (!clientRes.ok) {
        errorMessage = `Webhook responded with status ${statusCode}`
        console.error(`[webhook] client webhook ${statusCode}:`, responseBody)
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Unknown error"
      console.error("[webhook] client webhook delivery failed:", err)
    }
  }

  // Log the delivery attempt regardless of outcome.
  await db.insert(webhookDeliveryLog).values({
    requestId: requestId ?? null,
    platform: "instagram",
    accountName: accountName ?? null,
    clientWebhook,
    totalCount,
    validCount,
    statusCode,
    responseBody,
    errorMessage,
  }).catch((err) => console.error("[webhook] log insert failed:", err))

  // Update the originating request status to done.
  if (requestId) {
    await db
      .update(instagramTaggedRequest)
      .set({ status: "done" })
      .where(eq(instagramTaggedRequest.id, requestId))
      .catch((err) => console.error("[webhook] db update failed:", err))
  }

  return NextResponse.json({
    success: true,
    message: "Data received",
    processed: validCount,
    total: totalCount,
  })
}
