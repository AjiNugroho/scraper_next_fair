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
import type { ApiKeyItem } from "../datahooks/useApiKeys"
import { useDeleteApiKey } from "../datahooks/useApiKeys"

interface DeleteApiKeyDialogProps {
  apiKey: ApiKeyItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteApiKeyDialog({ apiKey, open, onOpenChange }: DeleteApiKeyDialogProps) {
  const [confirmation, setConfirmation] = useState("")
  const deleteApiKey = useDeleteApiKey()

  const displayName = apiKey.name ?? apiKey.start ?? apiKey.id
  const confirmTarget = apiKey.name ?? apiKey.start ?? apiKey.id

  function handleOpenChange(value: boolean) {
    if (!value) setConfirmation("")
    onOpenChange(value)
  }

  async function handleDelete() {
    await deleteApiKey.mutateAsync(apiKey.id, {
      onSuccess: () => handleOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-5 w-5" />
            Delete API Key
          </DialogTitle>
          <DialogDescription>
            This will permanently revoke <span className="font-medium text-foreground">{displayName}</span>. Any services using this key will stop working immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="delete-confirm">
              Type <span className="font-semibold text-foreground">{confirmTarget}</span> to confirm
            </FieldLabel>
            <Input
              id="delete-confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={confirmTarget}
              autoComplete="off"
            />
            <FieldDescription>This action cannot be undone.</FieldDescription>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={confirmation !== confirmTarget || deleteApiKey.isPending}
              onClick={handleDelete}
            >
              {deleteApiKey.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Revoke Key
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
