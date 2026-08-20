"use client"

import { useState } from "react"
import { Loader2, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { TokopediaPhylloBatch } from "../datahooks/useTokopediaPhylloBatches"
import { useDeleteTokopediaPhylloBatch } from "../datahooks/useTokopediaPhylloBatches"

interface DeleteBatchDialogProps {
  batch: TokopediaPhylloBatch
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteBatchDialog({ batch, open, onOpenChange }: DeleteBatchDialogProps) {
  const [confirmation, setConfirmation] = useState("")
  const deleteBatch = useDeleteTokopediaPhylloBatch()

  function handleOpenChange(value: boolean) {
    if (!value) setConfirmation("")
    onOpenChange(value)
  }

  async function handleDelete() {
    await deleteBatch.mutateAsync(batch.id, {
      onSuccess: () => handleOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-5 w-5" />
            Delete Batch
          </DialogTitle>
          <DialogDescription>
            This will remove the batch and all {batch.videoUrlsCount.toLocaleString()} of its
            dispatch items, including their retry history. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="delete-confirm">
              Type <span className="font-semibold text-foreground">{batch.batchDate}</span> to
              confirm
            </FieldLabel>
            <Input
              id="delete-confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={batch.batchDate}
              autoComplete="off"
            />
            <FieldDescription>Deletion cannot be undone.</FieldDescription>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={confirmation !== batch.batchDate || deleteBatch.isPending}
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
