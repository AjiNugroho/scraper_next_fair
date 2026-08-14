"use client"

import { Loader2, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useRetryAllTokopediaPhylloBatch } from "../../datahooks/useTokopediaPhylloBatches"

interface RetryAllDialogProps {
  batchId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RetryAllDialog({ batchId, open, onOpenChange }: RetryAllDialogProps) {
  const retryAll = useRetryAllTokopediaPhylloBatch()

  async function handleConfirm() {
    await retryAll.mutateAsync(batchId, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-5 w-5" />
            Retry All Items
          </DialogTitle>
          <DialogDescription>
            This resubmits every item in this batch to Phyllo, including ones already marked as
            sent — not just the failed ones. Already-sent items will be dispatched again.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={retryAll.isPending}
            onClick={handleConfirm}
          >
            {retryAll.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Retry All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
