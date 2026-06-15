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
import type { TiktokWorker } from "../datahooks/useTiktokWorkers"
import { useDeleteTiktokWorker } from "../datahooks/useTiktokWorkers"

interface DeleteWorkerDialogProps {
  worker: TiktokWorker
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteWorkerDialog({ worker, open, onOpenChange }: DeleteWorkerDialogProps) {
  const [confirmation, setConfirmation] = useState("")
  const deleteWorker = useDeleteTiktokWorker()

  function handleOpenChange(value: boolean) {
    if (!value) setConfirmation("")
    onOpenChange(value)
  }

  async function handleDelete() {
    await deleteWorker.mutateAsync(worker.name, {
      onSuccess: () => handleOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-5 w-5" />
            Delete Worker
          </DialogTitle>
          <DialogDescription>
            This will remove the worker and trigger rebalancing. Assigned hashtags will be
            redistributed to remaining workers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="delete-confirm">
              Type <span className="font-semibold text-foreground">{worker.name}</span> to confirm
            </FieldLabel>
            <Input
              id="delete-confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={worker.name}
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
              disabled={confirmation !== worker.name || deleteWorker.isPending}
              onClick={handleDelete}
            >
              {deleteWorker.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Worker
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
