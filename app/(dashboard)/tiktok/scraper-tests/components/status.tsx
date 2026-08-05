"use client"

import type { ScraperTestProvider, ScraperTestStatus } from "../datahooks/useScraperTests"

export const PROVIDER_LABELS: Record<ScraperTestProvider, string> = {
  phyllo: "Phyllo",
  brightdata: "Bright Data",
}

const STATUS_LABELS: Record<ScraperTestStatus, string> = {
  pending: "pending",
  sent: "waiting for provider",
  dispatch_failed: "provider rejected",
  delivered: "delivered",
  delivery_failed: "delivery failed",
}

const STATUS_STYLES: Record<ScraperTestStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  sent: "bg-primary/10 text-primary",
  dispatch_failed: "bg-destructive/10 text-destructive",
  delivered: "bg-green-500/10 text-green-600",
  delivery_failed: "bg-destructive/10 text-destructive",
}

export function StatusBadge({ status }: { status: ScraperTestStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
