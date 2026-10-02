"use client"

import { useMutation } from "@tanstack/react-query"
import { format } from "date-fns"
import { toast } from "sonner"

export interface DownloadBeautyVideosOptions {
  from: Date
  to: Date
  /** Empty → all hashtags. */
  hashtags: string[]
}

export function useDownloadBeautyVideos() {
  return useMutation({
    mutationFn: async ({ from, to, hashtags }: DownloadBeautyVideosOptions) => {
      const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() })
      for (const h of hashtags) params.append("hashtag", h)

      const res = await fetch(`/api/v1/internal/tiktok/results/export?${params}`)
      if (!res.ok) throw new Error("Failed to download videos")

      const rowCount = Number(res.headers.get("X-Row-Count") ?? 0)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `beauty-videos_${format(from, "yyyy-MM-dd")}_${format(to, "yyyy-MM-dd")}.csv`
      a.click()
      URL.revokeObjectURL(url)
      return rowCount
    },
    onSuccess: (rowCount) => toast.success(`Downloaded ${rowCount.toLocaleString()} videos`),
    onError: (err: Error) => toast.error(err.message),
  })
}
