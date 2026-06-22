import { NextRequest, NextResponse } from "next/server"
import { db } from "@/db/drizzle"
import { tiktokBulkJob, tiktokBulkJobItem, tiktokBulkVideoResult } from "@/db/tiktok-schema"
import { eq, sql } from "drizzle-orm"
import { z } from "zod"

const statsSchema = z.object({
  plays: z.number().default(0),
  likes: z.number().default(0),
  comments: z.number().default(0),
  shares: z.number().default(0),
  saves: z.number().default(0),
  reposts: z.number().default(0),
})

const videoDataSchema = z.object({
  video_id: z.string().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
  created_at: z.string().optional(),
  duration_s: z.number().optional(),
  location: z.string().optional(),
  is_ad: z.boolean().optional(),
  is_ecom: z.boolean().optional(),
  stats: statsSchema.optional(),
  hashtags: z.array(z.string()).optional(),
  suggested_words: z.array(z.string()).optional(),
  music: z.record(z.string(), z.unknown()).optional(),
  author: z.record(z.string(), z.unknown()).optional(),
  product: z.record(z.string(), z.unknown()).nullable().optional(),
})

const payloadSchema = z.object({
  request_id: z.string(),
  status: z.string(),
  data: videoDataSchema.optional(),
  error: z.string().optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = payloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 })
  }

  const { request_id, status, data, error } = parsed.data

  const [item] = await db
    .select()
    .from(tiktokBulkJobItem)
    .where(eq(tiktokBulkJobItem.id, request_id))
    .limit(1)

  if (!item) {
    return NextResponse.json({ success: false, error: "Unknown request_id" }, { status: 404 })
  }

  if (status === "success" && data) {
    const stats = data.stats

    await Promise.all([
      db
        .update(tiktokBulkJobItem)
        .set({ status: "success", updatedAt: new Date() })
        .where(eq(tiktokBulkJobItem.id, item.id)),

      db.insert(tiktokBulkVideoResult).values({
        itemId: item.id,
        videoId: data.video_id,
        url: data.url,
        description: data.description,
        videoCreatedAt: data.created_at,
        durationS: data.duration_s,
        location: data.location,
        isAd: data.is_ad,
        isEcom: data.is_ecom,
        statsPlays: stats?.plays,
        statsLikes: stats?.likes,
        statsComments: stats?.comments,
        statsShares: stats?.shares,
        statsSaves: stats?.saves,
        statsReposts: stats?.reposts,
        hashtags: data.hashtags ?? [],
        suggestedWords: data.suggested_words ?? [],
        music: data.music as Record<string, unknown>,
        author: data.author as Record<string, unknown>,
        product: data.product ?? null,
      }),

      db
        .update(tiktokBulkJob)
        .set({ successCount: sql`${tiktokBulkJob.successCount} + 1` })
        .where(eq(tiktokBulkJob.id, item.bulkJobId)),
    ])
  } else {
    const errorMsg = error ?? `Scraper returned status: ${status}`

    await Promise.all([
      db
        .update(tiktokBulkJobItem)
        .set({ status: "failed", error: errorMsg, updatedAt: new Date() })
        .where(eq(tiktokBulkJobItem.id, item.id)),

      db
        .update(tiktokBulkJob)
        .set({ failedCount: sql`${tiktokBulkJob.failedCount} + 1` })
        .where(eq(tiktokBulkJob.id, item.bulkJobId)),
    ])
  }

  return NextResponse.json({ success: true })
}
