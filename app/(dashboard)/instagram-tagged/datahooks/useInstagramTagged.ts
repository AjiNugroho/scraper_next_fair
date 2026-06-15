import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type RequestDataItem = {
  data_size: number
  identifier: string
  date_start?: string
  date_end?: string
}

export type InstagramTaggedRequestItem = {
  id: string
  status: string
  requestor: string
  webhookUrl: string | null
  extras: string | null
  data: string
  createdAt: string
  updatedAt: string
}

export type CreateRequestInput = {
  webhook_url?: string
  extras?: Record<string, unknown>
  data: RequestDataItem[]
}

const REQUESTS_KEY = ["instagram-tagged-requests"] as const

export interface ListRequestsOptions {
  limit?: number
  offset?: number
}

export function useInstagramTaggedRequests(options: ListRequestsOptions = {}) {
  const { limit = 10, offset = 0 } = options
  return useQuery({
    queryKey: [...REQUESTS_KEY, { limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      })
      const res = await fetch(`/api/v1/internal/instagram-tagged?${params}`)
      if (!res.ok) throw new Error("Failed to fetch requests")
      return res.json() as Promise<{ requests: InstagramTaggedRequestItem[]; total: number }>
    },
  })
}

export function useCreateInstagramTaggedRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CreateRequestInput) => {
      const res = await fetch("/api/v1/internal/instagram-tagged", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to create request")
      }
      return res.json() as Promise<InstagramTaggedRequestItem>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REQUESTS_KEY })
      toast.success("Request queued successfully")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
