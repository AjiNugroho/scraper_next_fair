import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { z } from "zod"

const bodySchema = z.object({
  url: z.url(),
})

async function requireApiKey(req: NextRequest) {
  const key = req.headers.get("x-api-key")
  if (!key) {
    return { error: NextResponse.json({ error: "Missing API key" }, { status: 401 }) }
  }
  const result = await auth.api.verifyApiKey({ body: { key } })
  if (!result.valid) {
    return { error: NextResponse.json({ error: result.error?.message ?? "Invalid API key" }, { status: 401 }) }
  }
  return { error: null }
}

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

  try {
    const response = await fetch(parsed.data.url, {
      method: "GET",
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        "Referer": "https://www.tiktok.com/",
      },
    })

    const location = response.headers.get("location")
    if (!location) {
      return NextResponse.json({ error: "No redirect found" }, { status: 400 })
    }

    return NextResponse.json({ url: location.split("?")[0] })
  } catch {
    return NextResponse.json(
      { error: "Failed to expand URL. It may be invalid, malicious, or unresolvable." },
      { status: 400 },
    )
  }
}
