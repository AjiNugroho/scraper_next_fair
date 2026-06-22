"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { BulkJob } from "../datahooks/useBulkScrape"
import { useDeleteBulkJob } from "../datahooks/useBulkScrape"

export function DeleteBulkJobDialog({
  job,
  open,
  onOpenChange,
}: {
  job: BulkJob | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [confirm, setConfirm] = useState("")
  const deleteJob = useDeleteBulkJob()

  function handleClose() {
    onOpenChange(false)
    setConfirm("")
  }

  async function handleDelete() {
    if (!job) return
    await deleteJob.mutateAsync(job.id)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? undefined : handleClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Bulk Job</DialogTitle>
          <DialogDescription>
            This will permanently delete the job, all its items, and all scraped results. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Type <strong className="text-foreground">{job?.name}</strong> to confirm.
          </p>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={job?.name ?? ""}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirm !== job?.name || deleteJob.isPending}
              onClick={handleDelete}
            >
              {deleteJob.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Job
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
