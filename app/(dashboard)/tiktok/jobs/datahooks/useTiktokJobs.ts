import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type TiktokJobRequest = {
  id: string
  listenGroupId: number | null
  requestDataId: number | null
  hashtag: string
  webhookUrl: string | null
  extras: Record<string, unknown> | null
  createdAt: string
}

export type SubmitJobInput = {
  webhook_url?: string
  extras?: Record<string, unknown>
  data: Array<{
    identifier: string
    date_start?: string
    date_end?: string
    data_size?: number
  }>
}

export interface ListJobsOptions {
  limit?: number
  offset?: number
}

const JOBS_KEY = ["tiktok-jobs"] as const

export function useTiktokJobs(options: ListJobsOptions = {}) {
  const { limit = 20, offset = 0 } = options
  return useQuery({
    queryKey: [...JOBS_KEY, { limit, offset }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      const res = await fetch(`/api/v1/internal/tiktok/jobs?${params}`)
      if (!res.ok) throw new Error("Failed to fetch jobs")
      return res.json() as Promise<{ requests: TiktokJobRequest[]; total: number }>
    },
  })
}

export function useSubmitTiktokJob() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SubmitJobInput) => {
      const res = await fetch("/api/v1/internal/tiktok/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Failed to submit job")
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOBS_KEY })
      queryClient.invalidateQueries({ queryKey: ["tiktok-hashtags"] })
      toast.success("Job submitted and rebalanced")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
