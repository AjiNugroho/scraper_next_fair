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

import type { TokopediaJobHashtag } from "../datahooks/useTokopediaHashtags"
import { useDeleteTokopediaHashtag } from "../datahooks/useTokopediaHashtags"

interface Props {
  hashtag: TokopediaJobHashtag | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteHashtagDialog({ hashtag, open, onOpenChange }: Props) {
  const [confirm, setConfirm] = useState("")
  const deleteHashtag = useDeleteTokopediaHashtag()

  useEffect(() => {
    if (open) setConfirm("")
  }, [open])

  async function handleDelete() {
    if (!hashtag) return
    await deleteHashtag.mutateAsync(hashtag.id)
    onOpenChange(false)
  }

  const hashtagText = hashtag?.hashtag ?? ""
  const canDelete = confirm === hashtagText

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Hashtag</DialogTitle>
          <DialogDescription>
            This action cannot be undone and removes it from the queue{" "}
            {hashtag?.workerName ? `and unassigns it from ${hashtag.workerName}` : ""}. Type{" "}
            <span className="font-mono font-semibold text-foreground">{hashtagText}</span> to
            confirm.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder={hashtagText}
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
              disabled={!canDelete || deleteHashtag.isPending}
              onClick={handleDelete}
            >
              {deleteHashtag.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
