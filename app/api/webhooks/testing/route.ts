import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = await req.text()
  }

  console.log("[webhook:testing]", JSON.stringify(body, null, 2))

  return NextResponse.json({ received: true })
}
