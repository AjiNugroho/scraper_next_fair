import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tiktokPhylloScrapeJobRunItem } from "@/db/tiktok-schema"
import { phylloScrapeRequest } from "@/db/phyllo-schema"
import { webhookDeliveryLog } from "@/db/scraper-schema"
import { eq } from "drizzle-orm"
import { formatPhylloVideos } from "@/lib/tiktok-data-formatter"

export async function POST(req: NextRequest) {
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const body = rawBody as { callback_id?: string; job_id?: string; data?: unknown[] }
  const callbackId = body.callback_id ?? null
  const rawData = Array.isArray(body.data) ? body.data : []
  // Reshaped into the Bright Data dataset type so clients get one payload shape
  const data = formatPhylloVideos(rawData)
  const totalCount = rawData.length

  let clientWebhook: string | null = null
  let extras: Record<string, unknown> = {}
  let requestId: string | null = null

  if (callbackId) {
    const [item] = await db
      .select()
      .from(tiktokPhylloScrapeJobRunItem)
      .where(eq(tiktokPhylloScrapeJobRunItem.callbackId, callbackId))
      .limit(1)

    if (item) {
      requestId = item.requestId

      await db
        .update(tiktokPhylloScrapeJobRunItem)
        .set({ providerJobId: body.job_id ?? null })
        .where(eq(tiktokPhylloScrapeJobRunItem.id, item.id))

      const [request] = await db
        .select()
        .from(phylloScrapeRequest)
        .where(eq(phylloScrapeRequest.id, item.requestId))
        .limit(1)

      if (request) {
        clientWebhook = request.webhookUrl ?? null
        extras = (request.extras as Record<string, unknown>) ?? {}
      }
    } else {
      console.error(`[webhook/tiktok/phyllo] no item found for callback_id ${callbackId}`)
    }
  }

  const outgoingPayload = { data, extras }

  let statusCode: number | null = null
  let responseBody: string | null = null
  let errorMessage: string | null = null

  if (clientWebhook) {
    try {
      const clientRes = await fetch(clientWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(outgoingPayload),
      })
      statusCode = clientRes.status
      responseBody = await clientRes.text()
      if (!clientRes.ok) {
        errorMessage = `Webhook responded with status ${statusCode}`
        console.error(`[webhook/tiktok/phyllo] client webhook ${statusCode}:`, responseBody)
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Unknown error"
      console.error("[webhook/tiktok/phyllo] client webhook delivery failed:", err)
    }
  }

  await db
    .insert(webhookDeliveryLog)
    .values({
      requestId,
      platform: "tiktok_phyllo",
      accountName: null,
      clientWebhook,
      totalCount,
      validCount: data.length,
      statusCode,
      responseBody,
      errorMessage,
      payload: clientWebhook && errorMessage ? outgoingPayload : null,
    })
    .catch((err) => console.error("[webhook/tiktok/phyllo] log insert failed:", err))

  return NextResponse.json({ success: true, received: totalCount })
}
