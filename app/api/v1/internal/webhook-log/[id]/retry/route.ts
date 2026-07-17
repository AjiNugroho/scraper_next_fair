import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { webhookDeliveryLog } from "@/db/scraper-schema"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [log] = await db
    .select()
    .from(webhookDeliveryLog)
    .where(eq(webhookDeliveryLog.id, id))
    .limit(1)
  if (!log) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (!log.clientWebhook) {
    return NextResponse.json({ error: "No client webhook to deliver to" }, { status: 400 })
  }
  if (log.payload === null) {
    return NextResponse.json(
      { error: "No stored payload for this delivery — nothing to retry" },
      { status: 400 },
    )
  }

  let statusCode: number | null = null
  let responseBody: string | null = null
  let errorMessage: string | null = null

  try {
    const clientRes = await fetch(log.clientWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(log.payload),
    })
    statusCode = clientRes.status
    responseBody = await clientRes.text()
    if (!clientRes.ok) {
      errorMessage = `Webhook responded with status ${statusCode}`
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error"
  }

  const succeeded = !errorMessage

  const [updated] = await db
    .update(webhookDeliveryLog)
    .set({
      statusCode,
      responseBody,
      errorMessage,
      retryCount: log.retryCount + 1,
      payload: succeeded ? null : log.payload,
    })
    .where(eq(webhookDeliveryLog.id, id))
    .returning()

  return NextResponse.json({ success: succeeded, log: updated })
}
