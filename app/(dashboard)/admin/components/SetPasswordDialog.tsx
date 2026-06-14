"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/components/ui/password-input"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import type { AdminUser } from "../datahooks/useUsers"
import { useSetPassword } from "../datahooks/useUsers"

const schema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm the password"),
  })
  .refine((val) => val.newPassword === val.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type FormValues = z.infer<typeof schema>

interface SetPasswordDialogProps {
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SetPasswordDialog({ user, open, onOpenChange }: SetPasswordDialogProps) {
  const setPassword = useSetPassword()

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  })

  function handleOpenChange(value: boolean) {
    if (!value) reset()
    onOpenChange(value)
  }

  async function onSubmit(values: FormValues) {
    await setPassword.mutateAsync(
      { userId: user.id, newPassword: values.newPassword },
      { onSuccess: () => { handleOpenChange(false) } },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Password</DialogTitle>
          <DialogDescription>Set a new password for {user.email}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="newPassword"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>New Password</FieldLabel>
                  <PasswordInput {...field} id={field.name} placeholder="Min. 8 characters" />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="confirmPassword"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Confirm Password</FieldLabel>
                  <PasswordInput {...field} id={field.name} placeholder="Repeat password" />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={setPassword.isPending}>
              {setPassword.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
