import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type PhylloScrapeRequest = {
  id: string
  listenGroupId: number | null
  requestDataId: number | null
  hashtag: string
  webhookUrl: string | null
  extras: Record<string, unknown> | null
  createdAt: string
}

export type SubmitPhylloRequestInput = {
  webhook_url?: string
  extras?: Record<string, unknown>
  data: Array<{
    identifier: string
    date_start?: string
    date_end?: string
    data_size?: number
  }>
}

export interface ListPhylloRequestsOptions {
  limit?: number
  offset?: number
}

const REQUESTS_KEY = ["phyllo-requests"] as const

export function usePhylloRequests(options: ListPhylloRequestsOptions = {}) {
  const { limit = 20, offset = 0 } = options
  return useQuery({
    queryKey: [...REQUESTS_KEY, { limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      const res = await fetch(`/api/v1/internal/phyllo/requests?${params}`)
      if (!res.ok) throw new Error("Failed to fetch requests")
      return res.json() as Promise<{ requests: PhylloScrapeRequest[]; total: number }>
    },
  })
}

export type UpdatePhylloRequestInput = {
  id: string
  hashtag?: string
  webhook_url?: string | null
  extras?: Record<string, unknown> | null
}

export function useUpdatePhylloRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdatePhylloRequestInput) => {
      const res = await fetch(`/api/v1/internal/phyllo/requests/${id}`, {
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

export function useDeletePhylloRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/phyllo/requests/${id}`, { method: "DELETE" })
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

export function useDeletePhylloRequests() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch("/api/v1/internal/phyllo/requests", {
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

export function useSubmitPhylloRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SubmitPhylloRequestInput) => {
      const res = await fetch("/api/v1/internal/phyllo/requests", {
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
      queryClient.invalidateQueries({ queryKey: ["tiktok-hashtags"] })
      toast.success("Request submitted and workers rebalanced")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
