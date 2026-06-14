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
import type { ApiKeyItem } from "../datahooks/useApiKeys"
import { useUpdateApiKey } from "../datahooks/useApiKeys"

const schema = z.object({
  name: z.string().min(1, "Name is required"),
})

type FormValues = z.infer<typeof schema>

interface EditApiKeyDialogProps {
  apiKey: ApiKeyItem
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditApiKeyDialog({ apiKey, open, onOpenChange }: EditApiKeyDialogProps) {
  const updateApiKey = useUpdateApiKey()

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: apiKey.name ?? "" },
  })

  useEffect(() => {
    if (open) reset({ name: apiKey.name ?? "" })
  }, [open, apiKey.name, reset])

  async function onSubmit(values: FormValues) {
    await updateApiKey.mutateAsync(
      { keyId: apiKey.id, name: values.name },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Rename API Key</DialogTitle>
          <DialogDescription>
            Update the name of this API key.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input {...field} id={field.name} placeholder="Key name" autoFocus />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateApiKey.isPending}>
              {updateApiKey.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
