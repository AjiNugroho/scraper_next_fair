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
import type { TiktokHashtag } from "../datahooks/useTiktokHashtags"
import { useDeleteTiktokHashtag } from "../datahooks/useTiktokHashtags"

interface DeleteHashtagDialogProps {
  hashtag: TiktokHashtag
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteHashtagDialog({ hashtag, open, onOpenChange }: DeleteHashtagDialogProps) {
  const [confirmation, setConfirmation] = useState("")
  const deleteHashtag = useDeleteTiktokHashtag()

  function handleOpenChange(value: boolean) {
    if (!value) setConfirmation("")
    onOpenChange(value)
  }

  async function handleDelete() {
    await deleteHashtag.mutateAsync(hashtag.id, {
      onSuccess: () => handleOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-5 w-5" />
            Remove Hashtag
          </DialogTitle>
          <DialogDescription>
            This will remove <span className="font-medium">#{hashtag.hashtag}</span> from the pool
            and trigger rebalancing across all workers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="hashtag-confirm">
              Type <span className="font-semibold text-foreground">{hashtag.hashtag}</span> to
              confirm
            </FieldLabel>
            <Input
              id="hashtag-confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={hashtag.hashtag}
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
              disabled={confirmation !== hashtag.hashtag || deleteHashtag.isPending}
              onClick={handleDelete}
            >
              {deleteHashtag.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Remove Hashtag
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
