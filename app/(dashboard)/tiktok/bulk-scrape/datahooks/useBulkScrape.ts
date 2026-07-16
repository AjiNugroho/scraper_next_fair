import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type BulkBatch = {
  id: string
  uploadName: string
  batchNumber: number
  totalBatches: number
  status: "pending" | "running" | "stopped" | "done"
  totalUrls: number
  dispatched: number
  successCount: number
  failedCount: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export type BulkBatchItem = {
  id: string
  batchId: string
  url: string
  status: "pending" | "running" | "success" | "failed"
  retryCount: number
  error: string | null
  createdAt: string
  updatedAt: string
  statsPlays: number | null
  statsLikes: number | null
  statsComments: number | null
  statsShares: number | null
  statsSaves: number | null
  statsReposts: number | null
  isTiktokShop: boolean
  productDetail: Record<string, unknown> | null
}

const BATCHES_KEY = ["tiktok-bulk-batches"] as const

export function useBulkBatches(options: { limit?: number; offset?: number } = {}) {
  const { limit = 20, offset = 0 } = options
  return useQuery({
    queryKey: [...BATCHES_KEY, { limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      const res = await fetch(`/api/v1/internal/tiktok/bulk-batches?${params}`)
      if (!res.ok) throw new Error("Failed to fetch batches")
      return res.json() as Promise<{ batches: BulkBatch[]; total: number }>
    },
    refetchInterval: (query) => {
      const batches = query.state.data?.batches ?? []
      const hasActive = batches.some((b) => b.status === "running")
      return hasActive ? 4_000 : false
    },
  })
}

export function useBulkBatchItems(
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
      const res = await fetch(`/api/v1/internal/tiktok/bulk-batches/${id}?${params}`)
      if (!res.ok) throw new Error("Failed to fetch batch items")
      return res.json() as Promise<{ batch: BulkBatch; items: BulkBatchItem[]; total: number }>
    },
    refetchInterval: (query) => {
      const batch = query.state.data?.batch
      if (!batch) return false
      return batch.status === "running" ? 4_000 : false
    },
  })
}

export function useUploadBulkBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, file }: { name: string; file: File }) => {
      const form = new FormData()
      form.append("name", name)
      form.append("file", file)
      const res = await fetch("/api/v1/internal/tiktok/bulk-batches", {
        method: "POST",
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to upload")
      }
      return res.json() as Promise<{ batches: BulkBatch[]; totalUrls: number }>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: BATCHES_KEY })
      toast.success(
        `${data.totalUrls.toLocaleString()} URLs saved as ${data.batches.length} batch${data.batches.length !== 1 ? "es" : ""}`,
      )
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useStartBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/tiktok/bulk-batches/${id}/start`, {
        method: "POST",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to start batch")
      }
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BATCHES_KEY }),
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useStopBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/tiktok/bulk-batches/${id}/stop`, {
        method: "POST",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to stop batch")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BATCHES_KEY })
      toast.success("Batch stopped — already dispatched items will still complete via webhook")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteBulkBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/tiktok/bulk-batches/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to delete batch")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BATCHES_KEY })
      toast.success("Batch deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
