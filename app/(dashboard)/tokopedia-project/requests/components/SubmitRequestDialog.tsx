"use client"

import { useState } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError, FieldGroup, FieldDescription } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { useSubmitTokopediaRequest } from "../datahooks/useTokopediaRequests"

const formSchema = z.object({
  extra_fields: z.array(z.object({ key: z.string().min(1, "Key required"), value: z.string() })),
  data: z
    .array(z.object({ hashtag: z.string().min(1, "Required") }))
    .min(1, "At least one hashtag required")
    .max(50, "Maximum 50 items"),
})

type FormValues = z.infer<typeof formSchema>

const defaultDataItem = { hashtag: "" }

// Fixed by the client contract (see lib/tiktok-data-formatter.ts) — always offered as a
// starting point in the extras list, but left blank and optional.
const DEFAULT_EXTRA_KEYS = ["account_name", "listen_group_id", "request_data_id"] as const

function getDefaultExtraFields() {
  return DEFAULT_EXTRA_KEYS.map((key) => ({ key, value: "" }))
}

export function SubmitRequestDialog() {
  const [open, setOpen] = useState(false)
  const [showExtras, setShowExtras] = useState(false)
  const submitRequest = useSubmitTokopediaRequest()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      extra_fields: getDefaultExtraFields(),
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
    const filledExtras = values.extra_fields.filter((e) => e.value.trim() !== "")
    const extras =
      filledExtras.length > 0
        ? Object.fromEntries(filledExtras.map((e) => [e.key, e.value]))
        : undefined

    await submitRequest.mutateAsync({
      extras,
      data: values.data.map((item) => ({ hashtag: item.hashtag })),
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
          Submit Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle>Submit Gopay Scrape Request</DialogTitle>
          <DialogDescription>
            Register hashtags for the Gopay project. Mobile workers are rebalanced
            automatically. Results are delivered to the webhook configured on the server — up to
            50 hashtags per batch.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 overflow-y-auto pr-1 pb-2"
        >
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

            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {dataFields.map((field, index) => (
                <Controller
                  key={field.id}
                  name={`data.${index}.hashtag`}
                  control={control}
                  render={({ field: f, fieldState }) => (
                    <div className="flex items-start gap-2">
                      <Field data-invalid={fieldState.invalid} className="flex-1">
                        <Input {...f} placeholder="e.g. sepatulari (no # prefix)" />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                      {dataFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => removeData(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                />
              ))}
            </div>

            {errors.data?.root?.message && <FieldError>{errors.data.root.message}</FieldError>}
          </FieldGroup>

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

          <FieldDescription>
            Webhook URL is fixed via server configuration and applied automatically — it is not
            set per request.
          </FieldDescription>

          <div className="flex justify-end gap-2 pt-2 shrink-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitRequest.isPending}>
              {submitRequest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Batch
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
