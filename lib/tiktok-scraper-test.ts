import { randomUUID } from "crypto"
import { db } from "@/db/drizzle"
import { tiktokScraperTestRun } from "@/db/tiktok-schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { scrapeVideoByUrl } from "@/lib/phyllo-scraper"
import { scrapeVideosByUrl } from "@/lib/brightdata"

const WEBHOOK_BASE = process.env.BETTER_AUTH_URL ?? ""

export const SCRAPER_TEST_PROVIDERS = ["phyllo", "brightdata"] as const
export type ScraperTestProvider = (typeof SCRAPER_TEST_PROVIDERS)[number]

export type ScraperTestRun = typeof tiktokScraperTestRun.$inferSelect

export const scraperTestInputSchema = z.object({
  provider: z.enum(SCRAPER_TEST_PROVIDERS),
  videoUrl: z.url({ message: "Must be a valid URL" }),
  clientWebhookUrl: z.url({ message: "Must be a valid URL" }),
  extras: z.record(z.string(), z.unknown()).nullable().optional(),
})

export type ScraperTestInput = z.infer<typeof scraperTestInputSchema>

function buildProviderWebhookUrl(provider: ScraperTestProvider, callbackId: string): string {
  return provider === "phyllo"
    ? `${WEBHOOK_BASE}/api/webhooks/tiktok/test/phyllo`
    : `${WEBHOOK_BASE}/api/webhooks/tiktok/test/brightdata?test_id=${callbackId}`
}

/**
 * Creates a test run and fires the single URL at the chosen provider, telling it to
 * call back into this app's test webhook. The provider callback is what completes
 * the run — see `forwardScraperTestResult`.
 */
export async function createScraperTestRun(input: ScraperTestInput): Promise<ScraperTestRun> {
  const callbackId = randomUUID()
  const providerWebhookUrl = buildProviderWebhookUrl(input.provider, callbackId)

  const [run] = await db
    .insert(tiktokScraperTestRun)
    .values({
      provider: input.provider,
      videoUrl: input.videoUrl,
      clientWebhookUrl: input.clientWebhookUrl,
      extras: input.extras ?? null,
      callbackId,
      providerWebhookUrl,
    })
    .returning()

  try {
    if (input.provider === "phyllo") {
      await scrapeVideoByUrl(input.videoUrl, callbackId, providerWebhookUrl)
    } else {
      await scrapeVideosByUrl([input.videoUrl], providerWebhookUrl)
    }

    const [sent] = await db
      .update(tiktokScraperTestRun)
      .set({ status: "sent", sentAt: new Date(), dispatchError: null })
      .where(eq(tiktokScraperTestRun.id, run.id))
      .returning()

    return sent
  } catch (err) {
    const dispatchError = err instanceof Error ? err.message : "Unknown dispatch error"
    console.error(`[tiktok-scraper-test] failed to dispatch run ${run.id}:`, err)

    const [failed] = await db
      .update(tiktokScraperTestRun)
      .set({ status: "dispatch_failed", dispatchError })
      .where(eq(tiktokScraperTestRun.id, run.id))
      .returning()

    return failed
  }
}

/**
 * Handles a provider callback for a test run: records the raw payload, then relays
 * it to the tester-supplied client webhook using the exact shape the production
 * webhook route for that provider sends, and stores the client's response.
 *
 * `buildPayload` lets each provider produce its own envelope — Bright Data relays
 * `{ data, extras }`, Phyllo relays the converted `{ identifier, date_scraped,
 * posts, extras }` payload. Returns null when no test run matches the callback id.
 */
export async function forwardScraperTestResult(
  callbackId: string,
  { data, providerPayload, providerJobId, buildPayload }: {
    data: unknown
    providerPayload: unknown
    providerJobId?: string | null
    buildPayload?: (extras: Record<string, unknown>) => unknown
  },
): Promise<ScraperTestRun | null> {
  const [run] = await db
    .select()
    .from(tiktokScraperTestRun)
    .where(eq(tiktokScraperTestRun.callbackId, callbackId))
    .limit(1)

  if (!run) return null

  const extras = (run.extras as Record<string, unknown>) ?? {}
  const forwardedPayload = buildPayload ? buildPayload(extras) : { data, extras }

  let clientStatusCode: number | null = null
  let clientResponseBody: string | null = null
  let clientError: string | null = null

  try {
    const clientRes = await fetch(run.clientWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forwardedPayload),
    })
    clientStatusCode = clientRes.status
    clientResponseBody = await clientRes.text()
    if (!clientRes.ok) {
      clientError = `Webhook responded with status ${clientStatusCode}`
      console.error(`[tiktok-scraper-test] client webhook ${clientStatusCode}:`, clientResponseBody)
    }
  } catch (err) {
    clientError = err instanceof Error ? err.message : "Unknown error"
    console.error("[tiktok-scraper-test] client webhook delivery failed:", err)
  }

  const now = new Date()
  const [updated] = await db
    .update(tiktokScraperTestRun)
    .set({
      status: clientError ? "delivery_failed" : "delivered",
      providerPayload,
      providerJobId: providerJobId ?? run.providerJobId,
      forwardedPayload,
      clientStatusCode,
      clientResponseBody,
      clientError,
      receivedAt: run.receivedAt ?? now,
      deliveredAt: now,
    })
    .where(eq(tiktokScraperTestRun.id, run.id))
    .returning()

  return updated
}
