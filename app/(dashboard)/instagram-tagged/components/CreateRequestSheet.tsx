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
import { useCreateInstagramTaggedRequest } from "../datahooks/useInstagramTagged"

const dataItemSchema = z.object({
  data_size: z.number().min(1, "Must be at least 1"),
  identifier: z.string().min(1, "Required"),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
})

const formSchema = z.object({
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
  data: z
    .array(dataItemSchema)
    .min(1, "At least one item required")
    .max(50, "Maximum 50 items"),
  extras: z.array(z.object({ key: z.string().min(1, "Key required"), value: z.string() })),
})

type FormValues = {
  webhook_url?: string
  data: Array<{
    data_size: number
    identifier: string
    date_start?: string
    date_end?: string
  }>
  extras: Array<{ key: string; value: string }>
}

const defaultDataItem = { data_size: 1, identifier: "", date_start: "", date_end: "" }

export function CreateRequestSheet() {
  const [open, setOpen] = useState(false)
  const [showExtras, setShowExtras] = useState(false)
  const createRequest = useCreateInstagramTaggedRequest()

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      webhook_url: "",
      data: [{ ...defaultDataItem }],
      extras: [],
    },
  })

  const {
    fields: dataFields,
    append: appendData,
    remove: removeData,
  } = useFieldArray({ control, name: "data" })

  const {
    fields: extrasFields,
    append: appendExtra,
    remove: removeExtra,
  } = useFieldArray({ control, name: "extras" })

  async function onSubmit(values: FormValues) {
    const extrasRecord =
      values.extras.length > 0
        ? Object.fromEntries(values.extras.map((e) => [e.key, e.value]))
        : undefined

    await createRequest.mutateAsync({
      webhook_url: values.webhook_url || undefined,
      extras: extrasRecord,
      data: values.data.map((item) => ({
        data_size: item.data_size,
        identifier: item.identifier,
        date_start: item.date_start || undefined,
        date_end: item.date_end || undefined,
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
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle>New Instagram Tagged Request</DialogTitle>
          <DialogDescription>
            Queue a scraping request for Instagram tagged content. Up to 50 items per request.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 overflow-y-auto pr-1 pb-2"
        >
          {/* Webhook URL */}
          <Controller
            name="webhook_url"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Webhook URL{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  placeholder="https://example.com/webhook"
                  type="url"
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Data Items */}
          <FieldGroup>
            <div className="flex items-center justify-between">
              <FieldLabel>
                Data Items{" "}
                <span className="font-normal text-muted-foreground">
                  ({dataFields.length}/50)
                </span>
              </FieldLabel>
              {dataFields.length < 50 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendData({ ...defaultDataItem })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Item
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
              {dataFields.map((field, index) => (
                <div key={field.id} className="rounded-md border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Item {index + 1}
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
                        <FieldLabel htmlFor={f.name}>Identifier</FieldLabel>
                        <Input {...f} id={f.name} placeholder="e.g. username or hashtag" />
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
                          <FieldLabel htmlFor={f.name}>Data Size</FieldLabel>
                          <Input
                            {...f}
                            value={Number.isFinite(f.value) ? f.value : ""}
                            id={f.name}
                            type="number"
                            min={1}
                            onChange={(e) => f.onChange(e.target.valueAsNumber)}
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

          {/* Extras */}
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
              Extras
              {extrasFields.length > 0 && (
                <span className="text-xs text-primary">({extrasFields.length})</span>
              )}
            </button>

            {showExtras && (
              <div className="space-y-2 pl-5">
                {extrasFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <Controller
                      name={`extras.${index}.key`}
                      control={control}
                      render={({ field: f, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="flex-1">
                          <Input {...f} placeholder="Key" />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                    <Controller
                      name={`extras.${index}.value`}
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
            <Button type="submit" disabled={createRequest.isPending}>
              {createRequest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Queue Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
