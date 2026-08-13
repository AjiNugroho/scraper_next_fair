import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type TokopediaWorker = {
  id: string
  name: string
  createdAt: string
  hashtagCount: number
}

const WORKERS_KEY = ["tokopedia-workers"] as const

export function useTokopediaWorkers() {
  return useQuery({
    queryKey: WORKERS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/v1/internal/tokopedia/workers")
      if (!res.ok) throw new Error("Failed to fetch workers")
      return res.json() as Promise<{ workers: TokopediaWorker[] }>
    },
  })
}

export function useCreateTokopediaWorker() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/v1/internal/tokopedia/workers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to create worker")
      }
      return res.json() as Promise<{ worker: TokopediaWorker }>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORKERS_KEY })
      toast.success("Worker created successfully")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteTokopediaWorker() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch(`/api/v1/internal/tokopedia/workers/${encodeURIComponent(name)}`, {
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
