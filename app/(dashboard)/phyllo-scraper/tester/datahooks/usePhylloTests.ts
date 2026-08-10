"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  IN_FLIGHT_STATUSES,
  type ScraperTestRun,
  type ScraperTestRunSummary,
} from "@/components/scraper-test/types"

export type { ScraperTestRun, ScraperTestRunSummary }

type PhylloTestsResponse = {
  runs: ScraperTestRunSummary[]
  total: number
  limit: number
  offset: number
}

export type CreatePhylloTestInput = {
  videoUrl: string
  clientWebhookUrl: string
  extras?: Record<string, unknown> | null
}

const TESTS_KEY = ["phyllo-tests"] as const

export function usePhylloTests(page: number, pageSize = 20) {
  const offset = page * pageSize
  return useQuery<PhylloTestsResponse>({
    queryKey: [...TESTS_KEY, page],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/phyllo/tests?limit=${pageSize}&offset=${offset}`)
      if (!res.ok) throw new Error("Failed to fetch Phyllo tests")
      return res.json()
    },
    refetchInterval: (query) => {
      const runs = query.state.data?.runs ?? []
      return runs.some((r) => IN_FLIGHT_STATUSES.includes(r.status)) ? 4_000 : false
    },
  })
}

export function usePhylloTest(id: string | null) {
  return useQuery({
    queryKey: [...TESTS_KEY, id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/phyllo/tests/${id}`)
      if (!res.ok) throw new Error("Failed to fetch Phyllo test")
      return res.json() as Promise<{ run: ScraperTestRun }>
    },
    refetchInterval: (query) => {
      const run = query.state.data?.run
      if (!run) return false
      return IN_FLIGHT_STATUSES.includes(run.status) ? 4_000 : false
    },
  })
}

export function useCreatePhylloTest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreatePhylloTestInput) => {
      const res = await fetch("/api/v1/internal/phyllo/tests", {
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
        toast.error(run.dispatchError ?? "Phyllo rejected the request")
      } else {
        toast.success("Test sent — waiting for Phyllo to call back")
      }
      queryClient.invalidateQueries({ queryKey: TESTS_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}
