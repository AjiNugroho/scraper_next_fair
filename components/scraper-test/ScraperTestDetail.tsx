"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Check, Copy, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StatusBadge, PROVIDER_LABELS } from "./status"
import type { ScraperTestRun } from "./types"

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString()
}

function JsonBlock({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false)
  const text = JSON.stringify(value, null, 2)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-7 w-7"
        onClick={copy}
        aria-label="Copy JSON"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
      <pre className="rounded-md border bg-muted/40 p-3 pr-11 text-xs overflow-x-auto max-h-96">
        {text}
      </pre>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 py-1.5">
      <span className="text-xs text-muted-foreground sm:w-40 shrink-0">{label}</span>
      <div className="text-sm break-all">{children}</div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground rounded-md border border-dashed p-3">{children}</p>
  )
}

interface Props {
  run: ScraperTestRun | undefined
  isLoading: boolean
  isError: boolean
  backHref: string
  backLabel: string
}

/**
 * Presentational detail view for one scraper test run. Data fetching stays with the
 * page that renders it, so both the TikTok and Phyllo testers can share this.
 */
export function ScraperTestDetail({ run, isLoading, isError, backHref, backLabel }: Props) {
  return (
    <Card className="bg-background border-none shadow-none ring-0 space-y-6">
      <div className="flex flex-col gap-3">
        <Link
          href={backHref}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>

        {run && (
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold">{PROVIDER_LABELS[run.provider]} test</h1>
            <StatusBadge status={run.status} />
          </div>
        )}
      </div>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : isError || !run ? (
        <p className="text-sm text-destructive">Failed to load this test run.</p>
      ) : (
        <>
          <Section title="Request" description="What was sent to the provider.">
            <div className="rounded-md border p-4 divide-y">
              <Row label="Video URL">
                <a
                  href={run.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {run.videoUrl}
                </a>
              </Row>
              <Row label="Client Webhook">{run.clientWebhookUrl}</Row>
              <Row label="Provider Callback">
                <span className="font-mono text-xs">{run.providerWebhookUrl}</span>
              </Row>
              <Row label="Callback ID">
                <span className="font-mono text-xs">{run.callbackId}</span>
              </Row>
              <Row label="Provider Job ID">
                {run.providerJobId ? (
                  <span className="font-mono text-xs">{run.providerJobId}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Row>
              <Row label="Started">{formatDate(run.createdAt)}</Row>
              <Row label="Sent to provider">{formatDate(run.sentAt)}</Row>
              <Row label="Callback received">{formatDate(run.receivedAt)}</Row>
              <Row label="Relayed to client">{formatDate(run.deliveredAt)}</Row>
            </div>
            {run.dispatchError && <p className="text-sm text-destructive">{run.dispatchError}</p>}
          </Section>

          <Section
            title="Provider Payload"
            description="Raw body the provider posted back to this app."
          >
            {run.providerPayload === null || run.providerPayload === undefined ? (
              <Empty>
                {run.status === "dispatch_failed"
                  ? "The provider never accepted the request, so no callback is expected."
                  : "Waiting for the provider to call back…"}
              </Empty>
            ) : (
              <JsonBlock value={run.providerPayload} />
            )}
          </Section>

          <Section
            title="Payload Sent to Client"
            description="Exactly what this app POSTed to the client webhook."
          >
            {run.forwardedPayload === null || run.forwardedPayload === undefined ? (
              <Empty>Nothing relayed yet.</Empty>
            ) : (
              <JsonBlock value={run.forwardedPayload} />
            )}
          </Section>

          <Section title="Client Response" description="How the client webhook replied.">
            {run.clientStatusCode === null && !run.clientError ? (
              <Empty>No response recorded yet.</Empty>
            ) : (
              <div className="rounded-md border p-4 divide-y">
                <Row label="Status Code">
                  {run.clientStatusCode ?? <span className="text-muted-foreground">—</span>}
                </Row>
                <Row label="Error">
                  {run.clientError ? (
                    <span className="text-destructive">{run.clientError}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Row>
                <Row label="Body">
                  {run.clientResponseBody ? (
                    <pre className="text-xs whitespace-pre-wrap max-h-60 overflow-y-auto">
                      {run.clientResponseBody}
                    </pre>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </Row>
              </div>
            )}
          </Section>
        </>
      )}
    </Card>
  )
}
