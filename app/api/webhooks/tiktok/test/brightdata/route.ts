import { NextRequest, NextResponse } from "next/server"
import { forwardScraperTestResult } from "@/lib/tiktok-scraper-test"

/**
 * Test-mode twin of /api/webhooks/tiktok/hashtag — Bright Data posts the dataset
 * rows as a bare array and carries the correlation id on the endpoint URL.
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const testId = searchParams.get("test_id")

  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 })
  }

  if (!testId) {
    return NextResponse.json({ success: false, error: "Missing test_id" }, { status: 400 })
  }

  const run = await forwardScraperTestResult(testId, {
    data: rawBody,
    providerPayload: rawBody,
  })

  if (!run) {
    console.error(`[webhook/tiktok/test/brightdata] no test run found for test_id ${testId}`)
    return NextResponse.json({ success: false, error: "Unknown test_id" }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    received: Array.isArray(rawBody) ? rawBody.length : 0,
  })
}
