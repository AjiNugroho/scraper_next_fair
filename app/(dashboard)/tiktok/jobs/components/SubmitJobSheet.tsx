"use client"

import { useState } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { useSubmitTiktokJob } from "../datahooks/useTiktokJobs"

const dataItemSchema = z.object({
  identifier: z.string().min(1, "Required"),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
  data_size: z.number().int().positive().optional(),
})

const formSchema = z.object({
  webhook_url: z
    .string()
    .refine(
      (val) => {
        if (!val) return true
        try { new URL(val); return true } catch { return false }
      },
      { message: "Must be a valid URL" },
    )
    .optional(),
  listen_group_id: z.number().int().positive().optional(),
  request_data_id: z.number().int().positive().optional(),
  extra_fields: z.array(z.object({ key: z.string().min(1, "Key required"), value: z.string() })),
  data: z
    .array(dataItemSchema)
    .min(1, "At least one hashtag required")
    .max(50, "Maximum 50 items"),
})

type FormValues = z.infer<typeof formSchema>

const defaultDataItem = { identifier: "", date_start: "", date_end: "" }

export function SubmitJobSheet() {
  const [open, setOpen] = useState(false)
  const [showExtras, setShowExtras] = useState(false)
  const submitJob = useSubmitTiktokJob()

  const {
    control,
    handleSubmit,
    reset,
    register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      webhook_url: "",
      listen_group_id: undefined,
      request_data_id: undefined,
      extra_fields: [],
      data: [{ ...defaultDataItem }],
    },
  })

  const { fields: dataFields, append: appendData, remove: removeData } = useFieldArray({
    control,
    name: "data",
  })

  const { fields: extraFields, append: appendExtra, remove: removeExtra } = useFieldArray({
    control,
    name: "extra_fields",
  })

  async function onSubmit(values: FormValues) {
    const extrasFromFields =
      values.extra_fields.length > 0
        ? Object.fromEntries(values.extra_fields.map((e) => [e.key, e.value]))
        : {}

    const extras =
      values.listen_group_id !== undefined ||
      values.request_data_id !== undefined ||
      values.extra_fields.length > 0
        ? {
            ...(values.listen_group_id !== undefined ? { listen_group_id: values.listen_group_id } : {}),
            ...(values.request_data_id !== undefined ? { request_data_id: values.request_data_id } : {}),
            ...extrasFromFields,
          }
        : undefined

    await submitJob.mutateAsync({
      webhook_url: values.webhook_url || undefined,
      extras,
      data: values.data.map((item) => ({
        identifier: item.identifier,
        date_start: item.date_start || undefined,
        date_end: item.date_end || undefined,
        data_size: item.data_size,
      })),
    })

    handleClose()
  }

  function handleClose() {
    setOpen(false)
    reset()
    setShowExtras(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Submit Job
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle>Submit TikTok Job Batch</DialogTitle>
          <DialogDescription>
            Register hashtags for scraping. Workers will be rebalanced automatically. Up to 50
            hashtags per batch.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 overflow-y-auto pr-1 pb-2"
        >
          {/* Webhook URL */}
          <Field data-invalid={!!errors.webhook_url}>
            <FieldLabel htmlFor="webhook-url">
              Webhook URL <span className="font-normal text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Input
              id="webhook-url"
              placeholder="https://example.com/webhook"
              type="url"
              {...register("webhook_url")}
            />
            {errors.webhook_url && <FieldError>{errors.webhook_url.message}</FieldError>}
          </Field>

          {/* Hashtags */}
          <FieldGroup>
            <div className="flex items-center justify-between">
              <FieldLabel>
                Hashtags{" "}
                <span className="font-normal text-muted-foreground">({dataFields.length}/50)</span>
              </FieldLabel>
              {dataFields.length < 50 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendData({ ...defaultDataItem })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Hashtag
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
              {dataFields.map((field, index) => (
                <div key={field.id} className="rounded-md border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Hashtag {index + 1}
                    </span>
                    {dataFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeData(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <Controller
                    name={`data.${index}.identifier`}
                    control={control}
                    render={({ field: f, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor={f.name}>Hashtag (no # prefix)</FieldLabel>
                        <Input {...f} id={f.name} placeholder="e.g. savearth" />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <Controller
                      name={`data.${index}.data_size`}
                      control={control}
                      render={({ field: f, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor={f.name}>
                            Data Size{" "}
                            <span className="font-normal text-muted-foreground">(opt)</span>
                          </FieldLabel>
                          <Input
                            {...f}
                            id={f.name}
                            type="number"
                            min={1}
                            value={Number.isFinite(f.value) ? f.value : ""}
                            onChange={(e) =>
                              f.onChange(
                                e.target.value === "" ? undefined : e.target.valueAsNumber,
                              )
                            }
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name={`data.${index}.date_start`}
                      control={control}
                      render={({ field: f }) => (
                        <Field>
                          <FieldLabel htmlFor={f.name}>
                            Date Start{" "}
                            <span className="font-normal text-muted-foreground">(opt)</span>
                          </FieldLabel>
                          <Input {...f} id={f.name} type="date" />
                        </Field>
                      )}
                    />
                    <Controller
                      name={`data.${index}.date_end`}
                      control={control}
                      render={({ field: f }) => (
                        <Field>
                          <FieldLabel htmlFor={f.name}>
                            Date End{" "}
                            <span className="font-normal text-muted-foreground">(opt)</span>
                          </FieldLabel>
                          <Input {...f} id={f.name} type="date" />
                        </Field>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            {errors.data?.root?.message && (
              <FieldError>{errors.data.root.message}</FieldError>
            )}
          </FieldGroup>

          {/* Extra fields */}
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
                        <FieldLabel htmlFor="listen-group-id">
                          Listen Group ID{" "}
                          <span className="font-normal text-muted-foreground">(opt)</span>
                        </FieldLabel>
                        <Input
                          {...f}
                          id="listen-group-id"
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
                        <FieldLabel htmlFor="request-data-id">
                          Request Data ID{" "}
                          <span className="font-normal text-muted-foreground">(opt)</span>
                        </FieldLabel>
                        <Input
                          {...f}
                          id="request-data-id"
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
            <Button type="submit" disabled={submitJob.isPending}>
              {submitJob.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Batch
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
