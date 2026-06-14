"use client"

import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AdminUser } from "../datahooks/useUsers"
import { useUpdateUser } from "../datahooks/useUsers"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["user", "admin"]),
})

type FormValues = z.infer<typeof schema>

interface EditUserDialogProps {
  user: AdminUser
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const updateUser = useUpdateUser()

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: (user.role as "user" | "admin") ?? "user",
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: user.name,
        email: user.email,
        role: (user.role as "user" | "admin") ?? "user",
      })
    }
  }, [open, user, reset])

  async function onSubmit(values: FormValues) {
    await updateUser.mutateAsync(
      { userId: user.id, data: values },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>Update user information for {user.email}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup className="gap-4">
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input {...field} id={field.name} placeholder="Full name" />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="email"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                  <Input {...field} id={field.name} type="email" placeholder="user@example.com" />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="role"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Role</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
