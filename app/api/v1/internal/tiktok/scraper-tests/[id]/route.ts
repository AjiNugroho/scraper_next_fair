import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/db/drizzle"
import { tiktokScraperTestRun } from "@/db/tiktok-schema"
import { eq } from "drizzle-orm"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const [run] = await db
    .select()
    .from(tiktokScraperTestRun)
    .where(eq(tiktokScraperTestRun.id, id))
    .limit(1)

  if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ run })
}
