"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

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

type ScraperTestsResponse = {
  runs: ScraperTestRunSummary[]
  total: number
  limit: number
  offset: number
}

export type CreateScraperTestInput = {
  provider: ScraperTestProvider
  videoUrl: string
  clientWebhookUrl: string
  extras?: Record<string, unknown> | null
}

const TESTS_KEY = ["tiktok-scraper-tests"] as const

// A run is still in flight until the provider calls back and we relay to the client.
const IN_FLIGHT: ScraperTestStatus[] = ["pending", "sent"]

export function useScraperTests(page: number, pageSize = 20) {
  const offset = page * pageSize
  return useQuery<ScraperTestsResponse>({
    queryKey: [...TESTS_KEY, page],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/tiktok/scraper-tests?limit=${pageSize}&offset=${offset}`)
      if (!res.ok) throw new Error("Failed to fetch scraper tests")
      return res.json()
    },
    refetchInterval: (query) => {
      const runs = query.state.data?.runs ?? []
      return runs.some((r) => IN_FLIGHT.includes(r.status)) ? 4_000 : false
    },
  })
}

export function useScraperTest(id: string | null) {
  return useQuery({
    queryKey: [...TESTS_KEY, id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/tiktok/scraper-tests/${id}`)
      if (!res.ok) throw new Error("Failed to fetch scraper test")
      return res.json() as Promise<{ run: ScraperTestRun }>
    },
    refetchInterval: (query) => {
      const run = query.state.data?.run
      if (!run) return false
      return IN_FLIGHT.includes(run.status) ? 4_000 : false
    },
  })
}

export function useCreateScraperTest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateScraperTestInput) => {
      const res = await fetch("/api/v1/internal/tiktok/scraper-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(typeof body.error === "string" ? body.error : "Failed to start test")
      }
      return res.json() as Promise<{ run: ScraperTestRun }>
    },
    onSuccess: ({ run }) => {
      if (run.status === "dispatch_failed") {
        toast.error(run.dispatchError ?? "Provider rejected the request")
      } else {
        toast.success("Test sent — waiting for the provider to call back")
      }
      queryClient.invalidateQueries({ queryKey: TESTS_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}
