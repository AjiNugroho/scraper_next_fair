import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type BulkJob = {
  id: string
  name: string
  status: "pending" | "running" | "done" | "failed"
  totalUrls: number
  processed: number
  successCount: number
  failedCount: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

export type BulkJobItem = {
  id: string
  bulkJobId: string
  url: string
  status: "pending" | "running" | "success" | "failed"
  retryCount: number
  error: string | null
  createdAt: string
  updatedAt: string
}

const BULK_JOBS_KEY = ["tiktok-bulk-jobs"] as const

export function useBulkJobs(options: { limit?: number; offset?: number } = {}) {
  const { limit = 20, offset = 0 } = options
  return useQuery({
    queryKey: [...BULK_JOBS_KEY, { limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      const res = await fetch(`/api/v1/internal/tiktok/bulk-jobs?${params}`)
      if (!res.ok) throw new Error("Failed to fetch bulk jobs")
      return res.json() as Promise<{ jobs: BulkJob[]; total: number }>
    },
    refetchInterval: (query) => {
      const jobs = query.state.data?.jobs ?? []
      const hasActive = jobs.some((j) => j.status === "running" || j.status === "pending")
      return hasActive ? 5_000 : false
    },
  })
}

export function useBulkJobAllItems(id: string | null) {
  return useQuery({
    queryKey: [...BULK_JOBS_KEY, id, "all-items"],
    enabled: !!id,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100000", offset: "0" })
      const res = await fetch(`/api/v1/internal/tiktok/bulk-jobs/${id}?${params}`)
      if (!res.ok) throw new Error("Failed to fetch job items")
      return res.json() as Promise<{ job: BulkJob; items: BulkJobItem[]; total: number }>
    },
    refetchInterval: (query) => {
      const job = query.state.data?.job
      if (!job) return false
      return job.status === "running" || job.status === "pending" ? 5_000 : false
    },
  })
}

export function useUploadBulkJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, file }: { name: string; file: File }) => {
      const form = new FormData()
      form.append("name", name)
      form.append("file", file)
      const res = await fetch("/api/v1/internal/tiktok/bulk-jobs", { method: "POST", body: form })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to upload job")
      }
      return res.json() as Promise<{ job: BulkJob }>
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: BULK_JOBS_KEY })
      toast.success(`Job "${data.job.name}" created with ${data.job.totalUrls.toLocaleString()} URLs`)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteBulkJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/tiktok/bulk-jobs/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to delete job")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BULK_JOBS_KEY })
      toast.success("Bulk job deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRetryBulkJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/tiktok/bulk-jobs/${id}/retry`, { method: "POST" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to retry job")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BULK_JOBS_KEY })
      toast.success("Failed items re-queued for retry")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
