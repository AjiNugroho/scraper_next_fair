"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type BeautyDispatchRun = {
  id: string
  startedAt: string
  completedAt: string | null
  itemsSent: number
  videoUrlsCount: number
  status: string
  filterRequestIds: string[] | null
  hashtags: string[] | null
  requestsCount: number
  filterFrom: string | null
  filterTo: string | null
}

export type BeautyDispatchRunItem = {
  id: string
  requestId: string
  listenGroupId: number | null
  requestDataId: number | null
  hashtag: string
  url: string
  status: "pending" | "sent" | "failed"
  attempts: number
  error: string | null
  sentAt: string | null
  updatedAt: string
}

export type BeautyEligibleRequest = {
  id: string
  hashtag: string
  listenGroupId: number | null
  requestDataId: number | null
  webhookUrl: string
  createdAt: string
}

export type BeautyDispatchTriggerFilters = {
  requestIds: string[] | null
  from: string | null
  to: string | null
}

export type BeautyDispatchPreview = {
  from: string
  to: string
  requestsCount: number
  hashtagsCount: number
  videoUrlsCount: number
}

const API_BASE = "/api/v1/internal/tiktok-beauty/phyllo-jobs"
const RUNS_KEY = ["tiktok-beauty-phyllo-jobs"] as const

async function throwResponseError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}))
  const error = (body as { error?: unknown }).error
  throw new Error(typeof error === "string" ? error : fallback)
}

export function useBeautyDispatchRuns(page: number, pageSize = 20) {
  const offset = page * pageSize
  return useQuery<{ runs: BeautyDispatchRun[]; total: number; limit: number; offset: number }>({
    queryKey: [...RUNS_KEY, page],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}?limit=${pageSize}&offset=${offset}`)
      if (!res.ok) throw new Error("Failed to fetch dispatch runs")
      return res.json()
    },
    refetchInterval: (query) => {
      const runs = query.state.data?.runs ?? []
      return runs.some((r) => r.status === "running") ? 4_000 : false
    },
  })
}

export function useBeautyDispatchRun(
  id: string | null,
  options: { status?: string; limit?: number; offset?: number } = {},
) {
  const { status, limit = 50, offset = 0 } = options
  return useQuery({
    queryKey: [...RUNS_KEY, id, "items", { status, limit, offset }],
    enabled: !!id,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (status) params.set("status", status)
      const res = await fetch(`${API_BASE}/${id}?${params}`)
      if (!res.ok) throw new Error("Failed to fetch dispatch run")
      return res.json() as Promise<{
        run: BeautyDispatchRun
        items: BeautyDispatchRunItem[]
        total: number
      }>
    },
    refetchInterval: (query) => (query.state.data?.run.status === "running" ? 4_000 : false),
  })
}

export function useBeautyEligibleRequests(enabled: boolean) {
  return useQuery<{ requests: BeautyEligibleRequest[] }>({
    queryKey: [...RUNS_KEY, "eligible-requests"],
    enabled,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/eligible-requests`)
      if (!res.ok) throw new Error("Failed to fetch requests")
      return res.json()
    },
  })
}

export function usePreviewBeautyDispatch() {
  return useMutation({
    mutationFn: async (filters: BeautyDispatchTriggerFilters) => {
      const res = await fetch(`${API_BASE}/trigger/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      })
      if (!res.ok) await throwResponseError(res, "Preview failed")
      return res.json() as Promise<BeautyDispatchPreview>
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useTriggerBeautyDispatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (filters: BeautyDispatchTriggerFilters) => {
      const res = await fetch(`${API_BASE}/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      })
      if (!res.ok) await throwResponseError(res, "Trigger failed")
      return res.json() as Promise<{ success: boolean }>
    },
    onSuccess: () => {
      toast.success("Job started — this page will update as items are dispatched")
      queryClient.invalidateQueries({ queryKey: RUNS_KEY })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRetryBeautyDispatchRun() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/${id}/retry`, { method: "POST" })
      if (!res.ok) await throwResponseError(res, "Retry failed")
      return res.json() as Promise<{ success: boolean }>
    },
    onSuccess: () => {
      toast.success("Retrying failed items — this page will update as they complete")
      queryClient.invalidateQueries({ queryKey: RUNS_KEY })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
