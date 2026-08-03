const PHYLLO_API_URL = "https://api.fair-prod-scrapper.fair-indonesia.com/tiktok/video"

export async function scrapeVideoByUrl(url: string, callbackId: string, webhookUrl: string): Promise<void> {
  const apiKey = process.env.PHYLLO_API_KEY
  if (!apiKey) throw new Error("PHYLLO_API_KEY is not set")

  const res = await fetch(PHYLLO_API_URL, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, callback_id: callbackId, webhook_url: webhookUrl }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Phyllo scraper trigger failed: ${res.status} ${body}`)
  }
}
