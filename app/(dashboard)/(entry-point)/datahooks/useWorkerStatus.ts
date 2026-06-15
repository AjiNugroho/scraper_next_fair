"use client"

import { useQuery } from "@tanstack/react-query"

export type QueueStatus = {
  name: string
  consumers: number | null
  messages: number | null
  error?: string
}

export type WorkerStatusResponse = {
  queues: {
    request: QueueStatus
    response: QueueStatus
  }
}

const ONE_HOUR = 60 * 60 * 1000

export function useWorkerStatus() {
  return useQuery<WorkerStatusResponse>({
    queryKey: ["instagram-worker-status"],
    queryFn: async () => {
      const res = await fetch("/api/v1/internal/instagram/worker-status")
      if (!res.ok) throw new Error("Failed to fetch worker status")
      return res.json()
    },
    staleTime: ONE_HOUR,
    refetchInterval: ONE_HOUR,
    retry: 2,
  })
}
