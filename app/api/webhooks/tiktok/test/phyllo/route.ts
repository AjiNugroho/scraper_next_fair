import { NextRequest, NextResponse } from "next/server"
import { forwardScraperTestResult } from "@/lib/tiktok-scraper-test"

/**
 * Test-mode twin of /api/webhooks/tiktok/phyllo — same payload contract, but the
 * client webhook comes from the test run instead of a hashtag request, and nothing
 * is written to the production webhook delivery log.
 */
export async function POST(req: NextRequest) {
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  const body = rawBody as { callback_id?: string; job_id?: string; data?: unknown[] }
  const callbackId = body.callback_id ?? null
  const data = Array.isArray(body.data) ? body.data : []

  if (!callbackId) {
    return NextResponse.json({ success: false, error: "Missing callback_id" }, { status: 400 })
  }

  const run = await forwardScraperTestResult(callbackId, {
    data,
    providerPayload: rawBody,
    providerJobId: body.job_id ?? null,
  })

  if (!run) {
    console.error(`[webhook/tiktok/test/phyllo] no test run found for callback_id ${callbackId}`)
    return NextResponse.json({ success: false, error: "Unknown callback_id" }, { status: 404 })
  }

  return NextResponse.json({ success: true, received: data.length })
}
