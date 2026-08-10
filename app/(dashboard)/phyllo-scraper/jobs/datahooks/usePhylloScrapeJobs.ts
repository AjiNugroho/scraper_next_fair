"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type PhylloScrapeJobRun = {
  id: string
  startedAt: string
  completedAt: string | null
  itemsSent: number
  videoUrlsCount: number
  status: string
  filterHashtags: string[] | null
  filterFrom: string | null
  filterTo: string | null
}

export type PhylloScrapeJobRunItem = {
  id: string
  hashtag: string
  url: string
  status: "pending" | "sent" | "failed"
  attempts: number
  error: string | null
  sentAt: string | null
  updatedAt: string
}

type PhylloScrapeJobsResponse = {
  runs: PhylloScrapeJobRun[]
  total: number
  limit: number
  offset: number
}

const RUNS_KEY = ["phyllo-jobs"] as const

export function usePhylloScrapeJobs(page: number, pageSize = 20) {
  const offset = page * pageSize
  return useQuery<PhylloScrapeJobsResponse>({
    queryKey: [...RUNS_KEY, page],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/phyllo/jobs?limit=${pageSize}&offset=${offset}`)
      if (!res.ok) throw new Error("Failed to fetch phyllo scrape jobs")
      return res.json()
    },
    refetchInterval: (query) => {
      const runs = query.state.data?.runs ?? []
      const hasActive = runs.some((r) => r.status === "running")
      return hasActive ? 4_000 : false
    },
  })
}

export function usePhylloScrapeJobRun(
  id: string | null,
  options: { status?: string; limit?: number; offset?: number } = {},
) {
  const { status, limit = 50, offset = 0 } = options
  return useQuery({
    queryKey: [...RUNS_KEY, id, "items", { status, limit, offset }],
    enabled: !!id,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (status) params.set("status", status)
      const res = await fetch(`/api/v1/internal/phyllo/jobs/${id}?${params}`)
      if (!res.ok) throw new Error("Failed to fetch job run")
      return res.json() as Promise<{ run: PhylloScrapeJobRun; items: PhylloScrapeJobRunItem[]; total: number }>
    },
    refetchInterval: (query) => {
      const run = query.state.data?.run
      if (!run) return false
      return run.status === "running" ? 4_000 : false
    },
  })
}

export type PhylloScrapeJobTriggerFilters = {
  hashtags: string[] | null
  from: string | null
  to: string | null
}

export type PhylloScrapeJobPreview = {
  from: string
  to: string
  hashtagsCount: number
  videoUrlsCount: number
}

export function usePhylloEligibleHashtags() {
  return useQuery<{ hashtags: string[] }>({
    queryKey: [...RUNS_KEY, "hashtags"],
    queryFn: async () => {
      const res = await fetch("/api/v1/internal/phyllo/requests/hashtags")
      if (!res.ok) throw new Error("Failed to fetch hashtags")
      return res.json()
    },
  })
}

export function usePreviewPhylloScrapeJob() {
  return useMutation({
    mutationFn: async (filters: PhylloScrapeJobTriggerFilters) => {
      const res = await fetch("/api/v1/internal/phyllo/trigger/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Preview failed")
      }
      return res.json() as Promise<PhylloScrapeJobPreview>
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

export function useTriggerPhylloScrapeJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (filters: PhylloScrapeJobTriggerFilters) => {
      const res = await fetch("/api/v1/internal/phyllo/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Trigger failed")
      }
      return res.json() as Promise<{ success: boolean }>
    },
    onSuccess: () => {
      toast.success("Job started — this page will update as items are dispatched")
      queryClient.invalidateQueries({ queryKey: RUNS_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

export function useRetryPhylloScrapeJobRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/phyllo/jobs/${id}/retry`, { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Retry failed")
      }
      return res.json() as Promise<{ success: boolean }>
    },
    onSuccess: () => {
      toast.success("Retrying failed items — this page will update as they complete")
      queryClient.invalidateQueries({ queryKey: RUNS_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}
