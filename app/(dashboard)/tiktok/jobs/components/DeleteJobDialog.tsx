"use client"

import { useState, useEffect } from "react"
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

import type { TiktokJobRequest } from "../datahooks/useTiktokJobs"
import { useDeleteTiktokJob } from "../datahooks/useTiktokJobs"

interface Props {
  job: TiktokJobRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteJobDialog({ job, open, onOpenChange }: Props) {
  const [confirm, setConfirm] = useState("")
  const deleteJob = useDeleteTiktokJob()

  useEffect(() => {
    if (open) setConfirm("")
  }, [open])

  async function handleDelete() {
    if (!job) return
    await deleteJob.mutateAsync(job.id)
    onOpenChange(false)
  }

  const hashtag = job?.hashtag ?? ""
  const canDelete = confirm === hashtag

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Job</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Type{" "}
            <span className="font-mono font-semibold text-foreground">{hashtag}</span> to confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder={hashtag}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!canDelete || deleteJob.isPending}
              onClick={handleDelete}
            >
              {deleteJob.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
