"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type TokopediaPhylloBatch = {
  id: string
  batchDate: string
  status: string
  itemsSent: number
  videoUrlsCount: number
  createdAt: string
  updatedAt: string
}

export type TokopediaPhylloBatchItem = {
  id: string
  workerName: string
  hashtag: string
  videoUrl: string
  status: "pending" | "sent" | "failed"
  attempts: number
  error: string | null
  sentAt: string | null
  updatedAt: string
}

type BatchesResponse = {
  batches: TokopediaPhylloBatch[]
  total: number
  limit: number
  offset: number
}

const BATCHES_KEY = ["tokopedia-phyllo-batches"] as const

export function useTokopediaPhylloBatches(page: number, pageSize = 20) {
  const offset = page * pageSize
  return useQuery<BatchesResponse>({
    queryKey: [...BATCHES_KEY, page],
    queryFn: async () => {
      const res = await fetch(`/api/v1/internal/tokopedia/phyllo-batches?limit=${pageSize}&offset=${offset}`)
      if (!res.ok) throw new Error("Failed to fetch batches")
      return res.json()
    },
    refetchInterval: (query) => {
      const batches = query.state.data?.batches ?? []
      const hasActive = batches.some((b) => b.status === "running")
      return hasActive ? 4_000 : false
    },
  })
}

export function useTokopediaPhylloBatch(
  id: string | null,
  options: { status?: string; limit?: number; offset?: number } = {},
) {
  const { status, limit = 50, offset = 0 } = options
  return useQuery({
    queryKey: [...BATCHES_KEY, id, "items", { status, limit, offset }],
    enabled: !!id,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (status) params.set("status", status)
      const res = await fetch(`/api/v1/internal/tokopedia/phyllo-batches/${id}?${params}`)
      if (!res.ok) throw new Error("Failed to fetch batch")
      return res.json() as Promise<{
        batch: TokopediaPhylloBatch
        items: TokopediaPhylloBatchItem[]
        total: number
      }>
    },
    refetchInterval: (query) => {
      const batch = query.state.data?.batch
      if (!batch) return false
      return batch.status === "running" ? 4_000 : false
    },
  })
}

export function useRetryTokopediaPhylloBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/tokopedia/phyllo-batches/${id}/retry`, { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Retry failed")
      }
      return res.json() as Promise<{ success: boolean }>
    },
    onSuccess: () => {
      toast.success("Retrying failed items — this page will update as they complete")
      queryClient.invalidateQueries({ queryKey: BATCHES_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

export function useDeleteTokopediaPhylloBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/tokopedia/phyllo-batches/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Failed to delete batch")
      }
      return res.json() as Promise<{ success: boolean }>
    },
    onSuccess: () => {
      toast.success("Batch deleted")
      queryClient.invalidateQueries({ queryKey: BATCHES_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

export function useRetryAllTokopediaPhylloBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/tokopedia/phyllo-batches/${id}/retry-all`, {
        method: "POST",
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Retry all failed")
      }
      return res.json() as Promise<{ success: boolean }>
    },
    onSuccess: () => {
      toast.success("Resubmitting all items — this page will update as they complete")
      queryClient.invalidateQueries({ queryKey: BATCHES_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}
