import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  beautyPhylloJobFilterSchema,
  parseBeautyPhylloJobFilters,
  previewBeautyPhylloJob,
} from "@/lib/tiktok-beauty-phyllo-job"

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    // No body is fine — falls back to the fully-default preview
  }

  const parsed = beautyPhylloJobFilterSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 })
  }

  const preview = await previewBeautyPhylloJob(parseBeautyPhylloJobFilters(parsed.data))

  return NextResponse.json(preview)
}
