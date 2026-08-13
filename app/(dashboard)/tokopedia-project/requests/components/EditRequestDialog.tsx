"use client"

import { useEffect, useState } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

import type { TokopediaHashtagRequest } from "../datahooks/useTokopediaRequests"
import { useUpdateTokopediaRequest } from "../datahooks/useTokopediaRequests"

const formSchema = z.object({
  hashtag: z.string().min(1, "Required"),
  extra_fields: z.array(z.object({ key: z.string().min(1, "Key required"), value: z.string() })),
})

type FormValues = z.infer<typeof formSchema>

function toFormValues(request: TokopediaHashtagRequest): FormValues {
  const extra_fields = Object.entries(request.extras ?? {}).map(([key, value]) => ({
    key,
    value: String(value),
  }))

  return { hashtag: request.hashtag, extra_fields }
}

interface Props {
  request: TokopediaHashtagRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditRequestDialog({ request, open, onOpenChange }: Props) {
  const [showExtras, setShowExtras] = useState(false)
  const updateRequest = useUpdateTokopediaRequest()

  const {
    control,
    handleSubmit,
    reset,
    register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { hashtag: "", extra_fields: [] },
  })

  const { fields: extraFields, append: appendExtra, remove: removeExtra } = useFieldArray({
    control,
    name: "extra_fields",
  })

  useEffect(() => {
    if (request) {
      reset(toFormValues(request))
      setShowExtras(false)
    }
  }, [request, reset])

  async function onSubmit(values: FormValues) {
    if (!request) return

    const extras =
      values.extra_fields.length > 0
        ? Object.fromEntries(values.extra_fields.map((e) => [e.key, e.value]))
        : null

    await updateRequest.mutateAsync({
      id: request.id,
      hashtag: values.hashtag,
      extras,
    })

    onOpenChange(false)
  }

  function handleClose() {
    onOpenChange(false)
    reset()
    setShowExtras(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle>Edit Request</DialogTitle>
          <DialogDescription>Update the hashtag request.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 overflow-y-auto pr-1 pb-2"
        >
          <Field data-invalid={!!errors.hashtag}>
            <FieldLabel htmlFor="edit-hashtag">Hashtag (no # prefix)</FieldLabel>
            <Input id="edit-hashtag" placeholder="e.g. sepatulari" {...register("hashtag")} />
            {errors.hashtag && <FieldError>{errors.hashtag.message}</FieldError>}
          </Field>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowExtras((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {showExtras ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
              Additional Extras
              {extraFields.length > 0 && (
                <span className="text-xs text-primary">({extraFields.length})</span>
              )}
            </button>

            {showExtras && (
              <div className="space-y-3 pl-5">
                {extraFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <Controller
                      name={`extra_fields.${index}.key`}
                      control={control}
                      render={({ field: f, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="flex-1">
                          <Input {...f} placeholder="Key" />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name={`extra_fields.${index}.value`}
                      control={control}
                      render={({ field: f }) => (
                        <Input {...f} placeholder="Value" className="flex-1" />
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeExtra(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendExtra({ key: "", value: "" })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Field
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 shrink-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateRequest.isPending}>
              {updateRequest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
