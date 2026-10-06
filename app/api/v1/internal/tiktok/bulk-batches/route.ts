import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokBulkBatch, tiktokBulkBatchItem } from "@/db/tiktok-schema"
import { desc, count } from "drizzle-orm"

const BATCH_SIZE = 5_000

type UploadRow = { url: string; hashtag: string | null }

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""))
}

// Accepts either a bare list of URLs, or a CSV with a "url" (or "video_url")
// column and an optional "hashtag" column — so the Results export can be
// uploaded as-is. Identical url+hashtag rows are collapsed, because that export
// repeats a video for every time a worker collected it.
function parseUploadRows(csvText: string): UploadRow[] {
  const rows = parseCsv(csvText.replace(/^﻿/, ""))
  if (rows.length === 0) return []

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const headerUrlIdx = header.includes("url") ? header.indexOf("url") : header.indexOf("video_url")
  const hasHeader = headerUrlIdx !== -1
  const urlIdx = hasHeader ? headerUrlIdx : 0
  const hashtagIdx = hasHeader ? header.indexOf("hashtag") : -1

  const seen = new Set<string>()
  const result: UploadRow[] = []
  for (const cols of hasHeader ? rows.slice(1) : rows) {
    const url = cols[urlIdx]?.trim() ?? ""
    if (!url.startsWith("http")) continue
    const hashtag = (hashtagIdx !== -1 && cols[hashtagIdx]?.trim()) || null

    const key = `${url}\n${hashtag ?? ""}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ url, hashtag })
  }
  return result
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
  const urls = parseUploadRows(csvText)

  if (urls.length === 0) {
    return NextResponse.json({ error: "No valid URLs found in CSV" }, { status: 400 })
  }

  // Split URLs into batches of BATCH_SIZE
  const chunks: UploadRow[][] = []
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
    const itemRows = chunks[b].map(({ url, hashtag }) => ({ batchId: batch.id, url, hashtag }))
    for (let i = 0; i < itemRows.length; i += ITEM_CHUNK) {
      await db.insert(tiktokBulkBatchItem).values(itemRows.slice(i, i + ITEM_CHUNK))
    }
  }

  return NextResponse.json({ batches: batchRecords, totalUrls: urls.length }, { status: 201 })
}
