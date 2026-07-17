import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type WebhookLogItem = {
  id: string
  requestId: string | null
  platform: string
  accountName: string | null
  clientWebhook: string | null
  totalCount: number
  validCount: number
  statusCode: number | null
  responseBody: string | null
  errorMessage: string | null
  retryCount: number
  retryable: boolean
  createdAt: string
  updatedAt: string
}

export interface UseWebhookLogOptions {
  limit?: number
  offset?: number
  dateFrom?: string
  dateTo?: string
}

const WEBHOOK_LOG_KEY = ["webhook-log"] as const

export function useWebhookLog(options: UseWebhookLogOptions = {}) {
  const { limit = 10, offset = 0, dateFrom, dateTo } = options
  return useQuery({
    queryKey: [...WEBHOOK_LOG_KEY, { limit, offset, dateFrom, dateTo }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (dateFrom) params.set("date_from", dateFrom)
      if (dateTo) params.set("date_to", dateTo)
      const res = await fetch(`/api/v1/internal/webhook-log?${params}`)
      if (!res.ok) throw new Error("Failed to fetch webhook log")
      return res.json() as Promise<{ logs: WebhookLogItem[]; total: number }>
    },
  })
}

export function useRetryWebhookDelivery() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/internal/webhook-log/${id}/retry`, { method: "POST" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? "Retry failed")
      return body as { success: boolean; log: WebhookLogItem }
    },
    onSuccess: (result) => {
      if (result.success) toast.success("Retry succeeded")
      else toast.error(`Retry failed: ${result.log.errorMessage ?? "Unknown error"}`)
      queryClient.invalidateQueries({ queryKey: WEBHOOK_LOG_KEY })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}
