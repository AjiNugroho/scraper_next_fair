import { NextRequest, NextResponse, after } from "next/server"
import { db } from "@/db/drizzle"
import { tokopediaHashtagVideoResult } from "@/db/tokopedia-schema"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { dispatchVideoUrlsToPhyllo } from "@/lib/tokopedia-phyllo-batch"

const bodySchema = z.object({
  worker_name: z.string().min(1),
  hashtag: z.string().min(1),
  video_urls: z.array(z.string().url()),
})

async function requireApiKey(req: NextRequest) {
  const key = req.headers.get("x-api-key")
  if (!key) {
    return { error: NextResponse.json({ error: "Missing API key" }, { status: 401 }) }
  }
  const result = await auth.api.verifyApiKey({ body: { key } })
  if (!result.valid) {
    return {
      error: NextResponse.json(
        { error: result.error?.message ?? "Invalid API key" },
        { status: 401 },
      ),
    }
  }
  return { error: null }
}

// Called by a mobile scraper worker to hand back the video URLs it collected
// while scraping one of its assigned hashtags.
export async function POST(req: NextRequest) {
  const { error: authError } = await requireApiKey(req)
  if (authError) return authError

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const { worker_name, hashtag, video_urls } = parsed.data

  if (video_urls.length === 0) {
    return NextResponse.json({ success: true, saved: 0 }, { status: 201 })
  }

  const inserted = await db
    .insert(tokopediaHashtagVideoResult)
    .values(video_urls.map((url) => ({ workerName: worker_name, hashtag, videoUrl: url })))
    .returning({ id: tokopediaHashtagVideoResult.id })

  // Tokopedia-only extra step (TikTok stops at storing the result): fan the
  // collected URLs out to Phyllo one by one, straight to the client's static
  // webhook. Runs after the response is sent so the worker isn't kept waiting
  // on a batch of Phyllo round-trips.
  after(() =>
    dispatchVideoUrlsToPhyllo({ workerName: worker_name, hashtag, videoUrls: video_urls }).catch(
      (err) => console.error("[tokopedia-results] phyllo dispatch failed:", err),
    ),
  )

  return NextResponse.json({ success: true, saved: inserted.length }, { status: 201 })
}
