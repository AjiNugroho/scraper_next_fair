"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type ScrapeJobRun = {
  id: string
  startedAt: string
  completedAt: string | null
  batchesSent: number
  videoUrlsCount: number
  status: string
  filterHashtags: string[] | null
  filterFrom: string | null
  filterTo: string | null
}

export type ScrapeJobRunBatch = {
  id: string
  hashtag: string
  urlCount: number
  status: "pending" | "sent" | "failed"
  attempts: number
  error: string | null
  sentAt: string | null
  updatedAt: string
}

type ScrapeJobsResponse = {
  runs: ScrapeJobRun[]
  total: number
  limit: number
  offset: number
}

const RUNS_KEY = ["tiktok-scrape-jobs"] as const

export function useScrapeJobs(page: number, pageSize = 20) {
  const offset = page * pageSize
  return useQuery<ScrapeJobsResponse>({
    queryKey: [...RUNS_KEY, page],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/tiktok/scrape-jobs?limit=${pageSize}&offset=${offset}`)
      if (!res.ok) throw new Error("Failed to fetch scrape jobs")
      return res.json()
    },
    refetchInterval: (query) => {
      const runs = query.state.data?.runs ?? []
      const hasActive = runs.some((r) => r.status === "running")
      return hasActive ? 4_000 : false
    },
  })
}

export function useScrapeJobRun(
  id: string | null,
  options: { status?: string; limit?: number; offset?: number } = {},
) {
  const { status, limit = 50, offset = 0 } = options
  return useQuery({
    queryKey: [...RUNS_KEY, id, "batches", { status, limit, offset }],
    enabled: !!id,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (status) params.set("status", status)
      const res = await fetch(`/api/v1/internal/tiktok/scrape-jobs/${id}?${params}`)
      if (!res.ok) throw new Error("Failed to fetch job run")
      return res.json() as Promise<{ run: ScrapeJobRun; batches: ScrapeJobRunBatch[]; total: number }>
    },
    refetchInterval: (query) => {
      const run = query.state.data?.run
      if (!run) return false
      return run.status === "running" ? 4_000 : false
    },
  })
}

export type ScrapeJobTriggerFilters = {
  hashtags: string[] | null
  from: string | null
  to: string | null
}

export type ScrapeJobPreview = {
  from: string
  to: string
  hashtagsCount: number
  videoUrlsCount: number
  estimatedBatches: number
}

export function useEligibleHashtags() {
  return useQuery<{ hashtags: string[] }>({
    queryKey: [...RUNS_KEY, "hashtags"],
    queryFn: async () => {
      const res = await fetch("/api/v1/internal/tiktok/trigger-video-scrape/hashtags")
      if (!res.ok) throw new Error("Failed to fetch hashtags")
      return res.json()
    },
  })
}

export function usePreviewScrapeJob() {
  return useMutation({
    mutationFn: async (filters: ScrapeJobTriggerFilters) => {
      const res = await fetch("/api/v1/internal/tiktok/trigger-video-scrape/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Preview failed")
      }
      return res.json() as Promise<ScrapeJobPreview>
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

export function useTriggerScrapeJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (filters: ScrapeJobTriggerFilters) => {
      const res = await fetch("/api/v1/internal/tiktok/trigger-video-scrape", {
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
      toast.success("Job started — this page will update as batches are dispatched")
      queryClient.invalidateQueries({ queryKey: RUNS_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

export function useRetryScrapeJobRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/tiktok/scrape-jobs/${id}/retry`, { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Retry failed")
      }
      return res.json() as Promise<{ success: boolean }>
    },
    onSuccess: () => {
      toast.success("Retrying failed batches — this page will update as they complete")
      queryClient.invalidateQueries({ queryKey: RUNS_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}
