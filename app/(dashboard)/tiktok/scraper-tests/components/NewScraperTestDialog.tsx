"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FlaskConical, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { useCreateScraperTest } from "../datahooks/useScraperTests"

const formSchema = z.object({
  provider: z.enum(["phyllo", "brightdata"]),
  videoUrl: z.url({ message: "Must be a valid URL" }),
  clientWebhookUrl: z.url({ message: "Must be a valid URL" }),
  extras: z
    .string()
    .refine(
      (val) => {
        if (!val.trim()) return true
        try {
          const parsed = JSON.parse(val)
          return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
        } catch {
          return false
        }
      },
      { message: "Must be a JSON object, e.g. {\"campaign\": \"summer2026\"}" },
    ),
})

type FormValues = z.infer<typeof formSchema>

export function NewScraperTestDialog() {
  const [open, setOpen] = useState(false)
  const createTest = useCreateScraperTest()

  const {
    control,
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: "phyllo",
      videoUrl: "",
      clientWebhookUrl: "",
      extras: "",
    },
  })

  function handleClose() {
    setOpen(false)
    reset()
  }

  async function onSubmit(values: FormValues) {
    await createTest.mutateAsync({
      provider: values.provider,
      videoUrl: values.videoUrl,
      clientWebhookUrl: values.clientWebhookUrl,
      extras: values.extras.trim() ? JSON.parse(values.extras) : null,
    })
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button size="sm">
          <FlaskConical className="h-4 w-4" />
          New Test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle>Run Scraper Test</DialogTitle>
          <DialogDescription>
            Sends one video URL straight to the provider. When it calls back, this app relays
            the result to your webhook using the same payload shape as a real run.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 overflow-y-auto pr-1 pb-2"
        >
          <Controller
            name="provider"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="provider">Provider</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="provider" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phyllo">Phyllo</SelectItem>
                    <SelectItem value="brightdata">Bright Data</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Field data-invalid={!!errors.videoUrl}>
            <FieldLabel htmlFor="video-url">Video URL</FieldLabel>
            <Input
              id="video-url"
              placeholder="https://www.tiktok.com/@user/video/123456"
              {...register("videoUrl")}
            />
            {errors.videoUrl && <FieldError>{errors.videoUrl.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.clientWebhookUrl}>
            <FieldLabel htmlFor="client-webhook-url">Client Webhook URL</FieldLabel>
            <Input
              id="client-webhook-url"
              placeholder="https://example.com/webhook"
              {...register("clientWebhookUrl")}
            />
            <FieldDescription>
              Where the scraped result gets relayed once the provider responds.
            </FieldDescription>
            {errors.clientWebhookUrl && <FieldError>{errors.clientWebhookUrl.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.extras}>
            <FieldLabel htmlFor="extras">
              Extras <span className="font-normal text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Textarea
              id="extras"
              rows={4}
              placeholder={'{\n  "listen_group_id": 1\n}'}
              className="font-mono text-xs"
              {...register("extras")}
            />
            <FieldDescription>
              Merged into the relayed payload as <code>extras</code>, same as a real request.
            </FieldDescription>
            {errors.extras && <FieldError>{errors.extras.message}</FieldError>}
          </Field>

          <div className="flex justify-end gap-2 pt-2 shrink-0">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTest.isPending}>
              {createTest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Run Test
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
