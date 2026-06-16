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

import type { TiktokJobRequest } from "../datahooks/useTiktokJobs"
import { useUpdateTiktokJob } from "../datahooks/useTiktokJobs"

const formSchema = z.object({
  hashtag: z.string().min(1, "Required"),
  webhook_url: z
    .string()
    .refine(
      (val) => {
        if (!val) return true
        try {
          new URL(val)
          return true
        } catch {
          return false
        }
      },
      { message: "Must be a valid URL" },
    )
    .optional(),
  listen_group_id: z.number().int().positive().optional(),
  request_data_id: z.number().int().positive().optional(),
  extra_fields: z.array(z.object({ key: z.string().min(1, "Key required"), value: z.string() })),
})

type FormValues = z.infer<typeof formSchema>

function toFormValues(job: TiktokJobRequest): FormValues {
  const reserved = new Set(["listen_group_id", "request_data_id"])
  const extra_fields = Object.entries(job.extras ?? {})
    .filter(([k]) => !reserved.has(k))
    .map(([key, value]) => ({ key, value: String(value) }))

  return {
    hashtag: job.hashtag,
    webhook_url: job.webhookUrl ?? "",
    listen_group_id: job.listenGroupId ?? undefined,
    request_data_id: job.requestDataId ?? undefined,
    extra_fields,
  }
}

interface Props {
  job: TiktokJobRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditJobDialog({ job, open, onOpenChange }: Props) {
  const [showExtras, setShowExtras] = useState(false)
  const updateJob = useUpdateTiktokJob()

  const {
    control,
    handleSubmit,
    reset,
    register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { hashtag: "", webhook_url: "", extra_fields: [] },
  })

  const { fields: extraFields, append: appendExtra, remove: removeExtra } = useFieldArray({
    control,
    name: "extra_fields",
  })

  useEffect(() => {
    if (job) {
      reset(toFormValues(job))
      setShowExtras(false)
    }
  }, [job, reset])

  async function onSubmit(values: FormValues) {
    if (!job) return

    const extrasFromFields =
      values.extra_fields.length > 0
        ? Object.fromEntries(values.extra_fields.map((e) => [e.key, e.value]))
        : {}

    const hasExtras =
      values.listen_group_id !== undefined ||
      values.request_data_id !== undefined ||
      values.extra_fields.length > 0

    const extras = hasExtras
      ? {
          ...(values.listen_group_id !== undefined
            ? { listen_group_id: values.listen_group_id }
            : {}),
          ...(values.request_data_id !== undefined
            ? { request_data_id: values.request_data_id }
            : {}),
          ...extrasFromFields,
        }
      : null

    await updateJob.mutateAsync({
      id: job.id,
      hashtag: values.hashtag,
      webhook_url: values.webhook_url || null,
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
          <DialogTitle>Edit Job</DialogTitle>
          <DialogDescription>Update the hashtag job request.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 overflow-y-auto pr-1 pb-2"
        >
          <Field data-invalid={!!errors.hashtag}>
            <FieldLabel htmlFor="edit-hashtag">Hashtag (no # prefix)</FieldLabel>
            <Input id="edit-hashtag" placeholder="e.g. savearth" {...register("hashtag")} />
            {errors.hashtag && <FieldError>{errors.hashtag.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.webhook_url}>
            <FieldLabel htmlFor="edit-webhook-url">
              Webhook URL <span className="font-normal text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Input
              id="edit-webhook-url"
              placeholder="https://example.com/webhook"
              type="url"
              {...register("webhook_url")}
            />
            {errors.webhook_url && <FieldError>{errors.webhook_url.message}</FieldError>}
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
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    name="listen_group_id"
                    control={control}
                    render={({ field: f, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="edit-listen-group-id">
                          Listen Group ID{" "}
                          <span className="font-normal text-muted-foreground">(opt)</span>
                        </FieldLabel>
                        <Input
                          {...f}
                          id="edit-listen-group-id"
                          type="number"
                          placeholder="e.g. 1"
                          value={Number.isFinite(f.value) ? f.value : ""}
                          onChange={(e) =>
                            f.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)
                          }
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <Controller
                    name="request_data_id"
                    control={control}
                    render={({ field: f, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="edit-request-data-id">
                          Request Data ID{" "}
                          <span className="font-normal text-muted-foreground">(opt)</span>
                        </FieldLabel>
                        <Input
                          {...f}
                          id="edit-request-data-id"
                          type="number"
                          placeholder="e.g. 42"
                          value={Number.isFinite(f.value) ? f.value : ""}
                          onChange={(e) =>
                            f.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)
                          }
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>

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
            <Button type="submit" disabled={updateJob.isPending}>
              {updateJob.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
