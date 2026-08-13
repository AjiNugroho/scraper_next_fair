import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type TokopediaHashtagRequest = {
  id: string
  hashtag: string
  webhookUrl: string
  extras: Record<string, unknown> | null
  createdAt: string
}

export type SubmitTokopediaRequestInput = {
  extras?: Record<string, unknown>
  data: Array<{ hashtag: string }>
}

export interface ListTokopediaRequestsOptions {
  limit?: number
  offset?: number
}

const REQUESTS_KEY = ["tokopedia-requests"] as const

export function useTokopediaRequests(options: ListTokopediaRequestsOptions = {}) {
  const { limit = 20, offset = 0 } = options
  return useQuery({
    queryKey: [...REQUESTS_KEY, { limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      const res = await fetch(`/api/v1/internal/tokopedia/jobs?${params}`)
      if (!res.ok) throw new Error("Failed to fetch requests")
      return res.json() as Promise<{ requests: TokopediaHashtagRequest[]; total: number }>
    },
  })
}

export type UpdateTokopediaRequestInput = {
  id: string
  hashtag?: string
  extras?: Record<string, unknown> | null
}

export function useUpdateTokopediaRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateTokopediaRequestInput) => {
      const res = await fetch(`/api/v1/internal/tokopedia/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to update request")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REQUESTS_KEY })
      toast.success("Request updated")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteTokopediaRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/tokopedia/jobs/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to delete request")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REQUESTS_KEY })
      toast.success("Request deleted")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteTokopediaRequests() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/v1/internal/tokopedia/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to delete requests")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REQUESTS_KEY })
      toast.success("Selected requests deleted")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useSubmitTokopediaRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SubmitTokopediaRequestInput) => {
      const res = await fetch("/api/v1/internal/tokopedia/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to submit request")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REQUESTS_KEY })
      queryClient.invalidateQueries({ queryKey: ["tokopedia-workers"] })
      toast.success("Request submitted and workers rebalanced")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
