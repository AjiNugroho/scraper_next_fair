const DATASET_ID = "gd_lu702nij2f790tmv9h"

export async function scrapeVideosByUrl(urls: string[], webhookUrl: string): Promise<void> {
  const token = process.env.BRIGHTDATA_TOKEN
  if (!token) throw new Error("BRIGHTDATA_TOKEN is not set")

  const params = new URLSearchParams({
    dataset_id: DATASET_ID,
    endpoint: webhookUrl,
    notify: "false",
    format: "json",
    uncompressed_webhook: "true",
    force_deliver: "false",
    include_errors: "true",
  })

  const res = await fetch(`https://api.brightdata.com/datasets/v3/trigger?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: urls.map((url) => ({ url, country: "ID" })),
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Bright Data trigger failed: ${res.status} ${body}`)
  }
}
