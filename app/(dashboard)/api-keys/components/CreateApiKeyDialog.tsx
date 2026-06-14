"use client"

import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Loader2, Copy, Check, TriangleAlert } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateApiKey } from "../datahooks/useApiKeys"

const EXPIRY_PRESETS = [
  { label: "Never", value: "never" },
  { label: "7 days", value: String(7 * 24 * 60 * 60) },
  { label: "30 days", value: String(30 * 24 * 60 * 60) },
  { label: "90 days", value: String(90 * 24 * 60 * 60) },
  { label: "1 year", value: String(365 * 24 * 60 * 60) },
]

const schema = z.object({
  name: z.string().optional(),
  expiresIn: z.string(),
  prefix: z.string().max(16, "Prefix must be 16 characters or less").optional(),
})

type FormValues = z.infer<typeof schema>

export function CreateApiKeyDialog() {
  const [open, setOpen] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const createApiKey = useCreateApiKey()

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", expiresIn: "never", prefix: "" },
  })

  async function onSubmit(values: FormValues) {
    const expiresIn = values.expiresIn === "never" ? null : Number(values.expiresIn)
    const result = await createApiKey.mutateAsync({
      name: values.name || undefined,
      expiresIn,
      prefix: values.prefix || undefined,
    })
    setCreatedKey(result.key)
  }

  function handleCopy() {
    if (!createdKey) return
    navigator.clipboard.writeText(createdKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    setOpen(false)
    setCreatedKey(null)
    setCopied(false)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          New API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>API Key Created</DialogTitle>
              <DialogDescription>
                Copy your API key now. It will not be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-3">
                <code className="flex-1 text-xs break-all font-mono">{createdKey}</code>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <span>This key won&apos;t be shown again. Store it securely.</span>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleClose}>Done</Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>New API Key</DialogTitle>
              <DialogDescription>Generate a new API key for programmatic access.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
              <FieldGroup className="gap-4">
                <Controller
                  name="name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Name <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
                      <Input {...field} id={field.name} placeholder="e.g. Production scraper" />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="prefix"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>Prefix <span className="text-muted-foreground font-normal">(optional)</span></FieldLabel>
                      <Input {...field} id={field.name} placeholder="e.g. prod" />
                      <FieldDescription>Prepended to the key for easy identification.</FieldDescription>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="expiresIn"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Expiration</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPIRY_PRESETS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </FieldGroup>
              <div className="flex justify-end gap-2 mt-6">
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="submit" disabled={createApiKey.isPending}>
                  {createApiKey.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Generate Key
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
