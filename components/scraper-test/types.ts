export type ScraperTestProvider = "phyllo" | "brightdata"

export type ScraperTestStatus =
  | "pending"
  | "sent"
  | "dispatch_failed"
  | "delivered"
  | "delivery_failed"

export type ScraperTestRunSummary = {
  id: string
  provider: ScraperTestProvider
  videoUrl: string
  clientWebhookUrl: string
  status: ScraperTestStatus
  clientStatusCode: number | null
  createdAt: string
  sentAt: string | null
  deliveredAt: string | null
}

export type ScraperTestRun = ScraperTestRunSummary & {
  extras: Record<string, unknown> | null
  callbackId: string
  providerWebhookUrl: string
  dispatchError: string | null
  providerJobId: string | null
  providerPayload: unknown
  forwardedPayload: unknown
  clientResponseBody: string | null
  clientError: string | null
  receivedAt: string | null
  updatedAt: string
}

/** A run is still in flight until the provider calls back and we relay to the client. */
export const IN_FLIGHT_STATUSES: ScraperTestStatus[] = ["pending", "sent"]
