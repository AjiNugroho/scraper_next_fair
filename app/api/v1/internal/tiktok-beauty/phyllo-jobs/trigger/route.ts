import { NextRequest, NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import {
  beautyPhylloJobFilterSchema,
  parseBeautyPhylloJobFilters,
  runBeautyPhylloJob,
} from "@/lib/tiktok-beauty-phyllo-job"

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    // No body is fine — falls back to the fully-default run
  }

  const parsed = beautyPhylloJobFilterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const filters = parseBeautyPhylloJobFilters(parsed.data)

  after(() =>
    runBeautyPhylloJob(filters).catch((err) =>
      console.error("[tiktok-beauty/phyllo-jobs/trigger] job failed:", err),
    ),
  )

  return NextResponse.json({ success: true })
}
