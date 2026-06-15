import { useQuery } from "@tanstack/react-query"

export type RequestLogItem = {
  id: string
  status: string
  requestor: string
  webhookUrl: string | null
  extras: string | null
  data: string
  createdAt: string
  updatedAt: string
}

export interface UseRequestLogOptions {
  limit?: number
  offset?: number
  dateFrom?: string
  dateTo?: string
}

const REQUEST_LOG_KEY = ["request-log"] as const

export function useRequestLog(options: UseRequestLogOptions = {}) {
  const { limit = 10, offset = 0, dateFrom, dateTo } = options
  return useQuery({
    queryKey: [...REQUEST_LOG_KEY, { limit, offset, dateFrom, dateTo }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (dateFrom) params.set("date_from", dateFrom)
      if (dateTo) params.set("date_to", dateTo)
      const res = await fetch(`/api/v1/internal/request-log?${params}`)
      if (!res.ok) throw new Error("Failed to fetch request log")
      return res.json() as Promise<{ requests: RequestLogItem[]; total: number }>
    },
  })
}
