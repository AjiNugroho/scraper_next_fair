import { useQuery } from "@tanstack/react-query"

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
  createdAt: string
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
