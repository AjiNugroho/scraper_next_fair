import { NextRequest, NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokBulkJob, tiktokBulkJobItem } from "@/db/tiktok-schema"
import { desc, count } from "drizzle-orm"
import { processBulkJob } from "@/lib/tiktok-bulk-processor"

function parseCsvUrls(csvText: string): string[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
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
    db.select().from(tiktokBulkJob).orderBy(desc(tiktokBulkJob.createdAt)).limit(limit).offset(offset),
    db.select({ total: count() }).from(tiktokBulkJob),
  ])

  return NextResponse.json({ jobs: rows, total, limit, offset })
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
    return NextResponse.json({ error: "Missing job name" }, { status: 400 })
  }
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing CSV file" }, { status: 400 })
  }

  const csvText = await file.text()
  const urls = parseCsvUrls(csvText)

  if (urls.length === 0) {
    return NextResponse.json({ error: "No valid URLs found in CSV" }, { status: 400 })
  }

  const [job] = await db
    .insert(tiktokBulkJob)
    .values({ name: name.trim(), totalUrls: urls.length, status: "pending" })
    .returning()

  const itemRows = urls.map((url) => ({ bulkJobId: job.id, url }))

  // Insert in chunks to avoid hitting parameter limits
  const CHUNK = 500
  for (let i = 0; i < itemRows.length; i += CHUNK) {
    await db.insert(tiktokBulkJobItem).values(itemRows.slice(i, i + CHUNK))
  }

  after(() => processBulkJob(job.id).catch((err) => console.error("[bulk-jobs] processor failed:", err)))

  return NextResponse.json({ job }, { status: 201 })
}
