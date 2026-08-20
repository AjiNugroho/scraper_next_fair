import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tokopediaPhylloBatchItem } from "@/db/tokopedia-schema"
import { webhookDeliveryLog } from "@/db/scraper-schema"
import { eq } from "drizzle-orm"
import { buildPhylloClientPayload } from "@/lib/tiktok-data-formatter"

// Phyllo calls this back with the raw scrape result for one video URL we
// dispatched from lib/tokopedia-phyllo-batch.ts (pointed here via
// INBOUND_WEBHOOK_URL, not at the client). We match it to its batch item by
// callback_id, format it into the client contract — same shape/formatter the
// TikTok Phyllo pipeline uses, since both hit the same Phyllo TikTok-video API —
// and relay it to the client webhook snapshotted on that item at dispatch time.
export async function POST(req: NextRequest) {
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const body = rawBody as {
    callback_id?: string
    job_id?: string
    data?: unknown[]
    date_scrape?: string
  }
  const callbackId = body.callback_id ?? null
  const rawData = Array.isArray(body.data) ? body.data : []
  const totalCount = rawData.length

  let item: typeof tokopediaPhylloBatchItem.$inferSelect | null = null

  if (callbackId) {
    const [found] = await db
      .select()
      .from(tokopediaPhylloBatchItem)
      .where(eq(tokopediaPhylloBatchItem.callbackId, callbackId))
      .limit(1)
    item = found ?? null

    if (item) {
      await db
        .update(tokopediaPhylloBatchItem)
        .set({ providerJobId: body.job_id ?? null })
        .where(eq(tokopediaPhylloBatchItem.id, item.id))
    } else {
      console.error(`[webhook/tokopedia/phyllo] no item found for callback_id ${callbackId}`)
    }
  }

  const outgoingPayload = buildPhylloClientPayload({
    identifier: item?.hashtag ?? null,
    data: rawData,
    extras: {},
    dateScraped: body.date_scrape ?? null,
  })

  const clientWebhook = item?.webhookUrl ?? null

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
        console.error(`[webhook/tokopedia/phyllo] client webhook ${statusCode}:`, responseBody)
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Unknown error"
      console.error("[webhook/tokopedia/phyllo] client webhook delivery failed:", err)
    }
  } else {
    errorMessage = "No client webhook on record for this item"
    console.error(`[webhook/tokopedia/phyllo] ${errorMessage} (callback_id ${callbackId})`)
  }

  await db
    .insert(webhookDeliveryLog)
    .values({
      requestId: item?.batchId ?? null,
      platform: "tokopedia_phyllo",
      accountName: item?.hashtag ?? null,
      clientWebhook,
      totalCount,
      validCount: outgoingPayload.posts.length,
      statusCode,
      responseBody,
      errorMessage,
      payload: clientWebhook && errorMessage ? outgoingPayload : null,
    })
    .catch((err) => console.error("[webhook/tokopedia/phyllo] log insert failed:", err))

  return NextResponse.json({ success: true, received: totalCount })
}
