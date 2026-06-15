"use client"

import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import type { TiktokWorker } from "../datahooks/useTiktokWorkers"

interface WorkerHashtagsDialogProps {
  worker: TiktokWorker | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type HashtagRow = {
  id: string
  hashtag: string
  createdAt: string
  workerName: string | null
  workerId: string | null
}

export function WorkerHashtagsDialog({ worker, open, onOpenChange }: WorkerHashtagsDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["tiktok-worker-hashtags", worker?.id],
    enabled: open && !!worker,
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/internal/tiktok/hashtags?worker_id=${encodeURIComponent(worker!.id)}&limit=200`,
      )
      if (!res.ok) throw new Error("Failed to fetch hashtags")
      return res.json() as Promise<{ hashtags: HashtagRow[]; total: number }>
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assigned Hashtags — {worker?.name}</DialogTitle>
          <DialogDescription>
            {worker?.hashtagCount ?? 0} hashtag{worker?.hashtagCount !== 1 ? "s" : ""} currently
            assigned to this worker.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : data?.hashtags.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hashtags assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto pr-1">
            {data?.hashtags.map((h) => (
              <Badge key={h.id} variant="outline">
                #{h.hashtag}
              </Badge>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
