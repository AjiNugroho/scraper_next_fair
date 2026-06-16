"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

type ScrapeJobRun = {
  id: string
  startedAt: string
  completedAt: string | null
  batchesSent: number
  videoUrlsCount: number
  status: string
}

type ScrapeJobsResponse = {
  runs: ScrapeJobRun[]
  total: number
  limit: number
  offset: number
}

export function useScrapeJobs(page: number, pageSize = 20) {
  const offset = page * pageSize
  return useQuery<ScrapeJobsResponse>({
    queryKey: ["tiktok-scrape-jobs", page],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/tiktok/scrape-jobs?limit=${pageSize}&offset=${offset}`)
      if (!res.ok) throw new Error("Failed to fetch scrape jobs")
      return res.json()
    }
  })
}

export function useTriggerScrapeJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/v1/internal/tiktok/trigger-video-scrape", { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Trigger failed")
      }
      return res.json() as Promise<{ success: boolean; batchesSent: number; videoUrlsCount: number }>
    },
    onSuccess: (data) => {
      toast.success(`Job complete — ${data.batchesSent} batch(es), ${data.videoUrlsCount} URL(s) sent`)
      queryClient.invalidateQueries({ queryKey: ["tiktok-scrape-jobs"] })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}
