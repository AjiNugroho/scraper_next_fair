"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type TiktokVideoResult = {
  id: string
  workerName: string
  hashtag: string
  videoUrl: string
  createdAt: string
}

export interface ListResultsOptions {
  search?: string
  hashtag?: string
  limit?: number
  offset?: number
}

const RESULTS_KEY = ["tiktok-results"] as const

export function useTiktokResults(options: ListResultsOptions = {}) {
  const { search = "", hashtag = "", limit = 20, offset = 0 } = options
  return useQuery({
    queryKey: [...RESULTS_KEY, { search, hashtag, limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        ...(search && { search }),
        ...(hashtag && { hashtag }),
      })
      const res = await fetch(`/api/v1/internal/tiktok/results?${params}`)
      if (!res.ok) throw new Error("Failed to fetch results")
      return res.json() as Promise<{ results: TiktokVideoResult[]; total: number }>
    },
  })
}

export function useDeleteTiktokResult() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/tiktok/results/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete result")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESULTS_KEY })
      toast.success("Video URL deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteTiktokResults() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/v1/internal/tiktok/results", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error("Failed to delete results")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RESULTS_KEY })
      toast.success("Selected URLs deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
