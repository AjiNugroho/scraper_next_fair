import { keepPreviousData, useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type TiktokHashtag = {
  id: string
  hashtag: string
  createdAt: string
  workerName: string | null
  workerId: string | null
}

export interface ListHashtagsOptions {
  limit?: number
  offset?: number
  search?: string
}

const HASHTAGS_KEY = ["tiktok-hashtags"] as const

export function useTiktokHashtags(options: ListHashtagsOptions = {}) {
  const { limit = 50, offset = 0, search } = options
  return useQuery({
    queryKey: [...HASHTAGS_KEY, { limit, offset, search }],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (search) params.set("search", search)
      const res = await fetch(`/api/v1/internal/tiktok/hashtags?${params}`)
      if (!res.ok) throw new Error("Failed to fetch hashtags")
      return res.json() as Promise<{ hashtags: TiktokHashtag[]; total: number }>
    },
  })
}

export function useCreateTiktokHashtag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (hashtag: string) => {
      const res = await fetch("/api/v1/internal/tiktok/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashtag }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to add hashtag")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HASHTAGS_KEY })
      toast.success("Hashtag added and rebalanced")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteTiktokHashtag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/tiktok/hashtags/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to delete hashtag")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HASHTAGS_KEY })
      toast.success("Hashtag removed and rebalanced")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteTiktokHashtags() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/v1/internal/tiktok/hashtags", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to delete hashtags")
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HASHTAGS_KEY })
      toast.success("Selected hashtags removed and rebalanced")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
