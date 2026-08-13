import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type TokopediaJobHashtag = {
  id: string
  hashtag: string
  createdAt: string
  workerName: string | null
  workerId: string | null
}

export interface ListTokopediaHashtagsOptions {
  limit?: number
  offset?: number
}

const HASHTAGS_KEY = ["tokopedia-hashtags"] as const

export function useTokopediaHashtags(options: ListTokopediaHashtagsOptions = {}) {
  const { limit = 20, offset = 0 } = options
  return useQuery({
    queryKey: [...HASHTAGS_KEY, { limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      const res = await fetch(`/api/v1/internal/tokopedia/hashtags?${params}`)
      if (!res.ok) throw new Error("Failed to fetch hashtags")
      return res.json() as Promise<{ hashtags: TokopediaJobHashtag[]; total: number }>
    },
  })
}

function invalidateRelated(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: HASHTAGS_KEY })
  queryClient.invalidateQueries({ queryKey: ["tokopedia-workers"] })
  queryClient.invalidateQueries({ queryKey: ["tokopedia-worker-hashtags"] })
}

export function useUpdateTokopediaHashtag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, hashtag }: { id: string; hashtag: string }) => {
      const res = await fetch(`/api/v1/internal/tokopedia/hashtags/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashtag }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to update hashtag")
      }
      return res.json() as Promise<TokopediaJobHashtag>
    },
    onSuccess: () => {
      invalidateRelated(queryClient)
      toast.success("Hashtag updated")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteTokopediaHashtag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/tokopedia/hashtags/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to delete hashtag")
      }
      return res.json()
    },
    onSuccess: () => {
      invalidateRelated(queryClient)
      toast.success("Hashtag deleted")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
