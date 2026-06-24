import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokBulkBatch, tiktokBulkBatchItem } from "@/db/tiktok-schema"
import { desc, count } from "drizzle-orm"

const BATCH_SIZE = 5_000

function parseCsvUrls(csvText: string): string[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  const header = lines[0].toLowerCase()
  const startIndex = header === "url" ? 1 : 0

  return lines.slice(startIndex).filter((l) => l.startsWith("http"))
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100)
  const offset = Number(searchParams.get("offset") ?? 0)

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(tiktokBulkBatch)
      .orderBy(desc(tiktokBulkBatch.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(tiktokBulkBatch),
  ])

  return NextResponse.json({ batches: rows, total, limit, offset })
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const name = formData.get("name")
  const file = formData.get("file")

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Missing upload name" }, { status: 400 })
  }
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing CSV file" }, { status: 400 })
  }

  const csvText = await file.text()
  const urls = parseCsvUrls(csvText)

  if (urls.length === 0) {
    return NextResponse.json({ error: "No valid URLs found in CSV" }, { status: 400 })
  }

  // Split URLs into batches of BATCH_SIZE
  const chunks: string[][] = []
  for (let i = 0; i < urls.length; i += BATCH_SIZE) {
    chunks.push(urls.slice(i, i + BATCH_SIZE))
  }

  const totalBatches = chunks.length
  const uploadName = name.trim()

  // Insert all batch header rows
  const batchRecords = await db
    .insert(tiktokBulkBatch)
    .values(
      chunks.map((chunk, idx) => ({
        uploadName,
        batchNumber: idx + 1,
        totalBatches,
        totalUrls: chunk.length,
        status: "pending" as const,
      })),
    )
    .returning()

  // Insert items for each batch in chunks of 500 to avoid parameter limits
  const ITEM_CHUNK = 500
  for (let b = 0; b < batchRecords.length; b++) {
    const batch = batchRecords[b]
    const itemRows = chunks[b].map((url) => ({ batchId: batch.id, url }))
    for (let i = 0; i < itemRows.length; i += ITEM_CHUNK) {
      await db.insert(tiktokBulkBatchItem).values(itemRows.slice(i, i + ITEM_CHUNK))
    }
  }

  return NextResponse.json({ batches: batchRecords, totalUrls: urls.length }, { status: 201 })
}
