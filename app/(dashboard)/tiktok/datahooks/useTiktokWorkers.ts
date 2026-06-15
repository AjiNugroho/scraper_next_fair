import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type TiktokWorker = {
  id: string
  name: string
  createdAt: string
  hashtagCount: number
}

const WORKERS_KEY = ["tiktok-workers"] as const

export function useTiktokWorkers() {
  return useQuery({
    queryKey: WORKERS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/v1/internal/tiktok/workers")
      if (!res.ok) throw new Error("Failed to fetch workers")
      return res.json() as Promise<{ workers: TiktokWorker[] }>
    },
  })
}

export function useCreateTiktokWorker() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/v1/internal/tiktok/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to create worker")
      }
      return res.json() as Promise<{ worker: TiktokWorker }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKERS_KEY })
      toast.success("Worker created successfully")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteTiktokWorker() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/v1/internal/tiktok/workers/${encodeURIComponent(name)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to delete worker")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKERS_KEY })
      toast.success("Worker deleted")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
