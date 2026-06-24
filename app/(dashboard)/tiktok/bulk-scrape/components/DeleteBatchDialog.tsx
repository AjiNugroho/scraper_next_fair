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
import type { BulkBatch } from "../datahooks/useBulkScrape"
import { useDeleteBulkBatch } from "../datahooks/useBulkScrape"

export function DeleteBatchDialog({
  batch,
  open,
  onOpenChange,
}: {
  batch: BulkBatch | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [confirm, setConfirm] = useState("")
  const deleteBatch = useDeleteBulkBatch()

  const displayName = batch
    ? `${batch.uploadName} (Batch ${batch.batchNumber}/${batch.totalBatches})`
    : ""

  function handleClose() {
    onOpenChange(false)
    setConfirm("")
  }

  async function handleDelete() {
    if (!batch) return
    await deleteBatch.mutateAsync(batch.id)
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? undefined : handleClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Batch</DialogTitle>
          <DialogDescription>
            This will permanently delete the batch, all its items, and all scraped results. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Type <strong className="text-foreground">{displayName}</strong> to confirm.
          </p>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={displayName}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={confirm !== displayName || deleteBatch.isPending}
              onClick={handleDelete}
            >
              {deleteBatch.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Batch
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
