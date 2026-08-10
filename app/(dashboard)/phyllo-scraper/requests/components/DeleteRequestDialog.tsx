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

import type { PhylloScrapeRequest } from "../datahooks/usePhylloRequests"
import { useDeletePhylloRequest } from "../datahooks/usePhylloRequests"

interface Props {
  request: PhylloScrapeRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteRequestDialog({ request, open, onOpenChange }: Props) {
  const [confirm, setConfirm] = useState("")
  const deleteRequest = useDeletePhylloRequest()

  // Cleared on close rather than on open, so the next open always starts empty.
  function handleOpenChange(next: boolean) {
    if (!next) setConfirm("")
    onOpenChange(next)
  }

  async function handleDelete() {
    if (!request) return
    await deleteRequest.mutateAsync(request.id)
    handleOpenChange(false)
  }

  const hashtag = request?.hashtag ?? ""
  const canDelete = confirm === hashtag

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Request</DialogTitle>
          <DialogDescription>
            This action cannot be undone, and it also removes any Phyllo job history for this
            request. Type{" "}
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
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!canDelete || deleteRequest.isPending}
              onClick={handleDelete}
            >
              {deleteRequest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
