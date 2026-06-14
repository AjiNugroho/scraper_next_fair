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
import type { AdminUser } from "../datahooks/useUsers"
import { useDeleteUser } from "../datahooks/useUsers"

interface DeleteUserDialogProps {
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteUserDialog({ user, open, onOpenChange }: DeleteUserDialogProps) {
  const [confirmation, setConfirmation] = useState("")
  const deleteUser = useDeleteUser()

  function handleOpenChange(value: boolean) {
    if (!value) setConfirmation("")
    onOpenChange(value)
  }

  async function handleDelete() {
    await deleteUser.mutateAsync(user.id, {
      onSuccess: () => handleOpenChange(false),
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-5 w-5" />
            Delete User
          </DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone. All data associated with this user will
            be deleted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field>
            <FieldLabel htmlFor="delete-confirm">
              Type <span className="font-semibold text-foreground">{user.email}</span> to confirm
            </FieldLabel>
            <Input
              id="delete-confirm"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={user.email}
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
              disabled={confirmation !== user.email || deleteUser.isPending}
              onClick={handleDelete}
            >
              {deleteUser.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete User
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
