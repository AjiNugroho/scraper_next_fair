"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { FlaskConical, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { useCreatePhylloTest } from "../datahooks/usePhylloTests"

const formSchema = z.object({
  videoUrl: z.url({ message: "Must be a valid URL" }),
  clientWebhookUrl: z.url({ message: "Must be a valid URL" }),
  extras: z.string().refine(
    (val) => {
      if (!val.trim()) return true
      try {
        const parsed = JSON.parse(val)
        return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      } catch {
        return false
      }
    },
    { message: 'Must be a JSON object, e.g. {"campaign": "summer2026"}' },
  ),
})

type FormValues = z.infer<typeof formSchema>

export function NewPhylloTestDialog() {
  const [open, setOpen] = useState(false)
  const createTest = useCreatePhylloTest()

  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
          <DialogTitle>Run Phyllo Test</DialogTitle>
          <DialogDescription>
            Sends one video URL straight to Phyllo. When it calls back, this app formats the result
            into the Bright Data payload shape and relays it to your webhook — exactly as a real run
            would.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 overflow-y-auto pr-1 pb-2"
        >
          <Field data-invalid={!!errors.videoUrl}>
            <FieldLabel htmlFor="phyllo-test-video-url">Video URL</FieldLabel>
            <Input
              id="phyllo-test-video-url"
              placeholder="https://www.tiktok.com/@user/video/123456"
              {...register("videoUrl")}
            />
            {errors.videoUrl && <FieldError>{errors.videoUrl.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.clientWebhookUrl}>
            <FieldLabel htmlFor="phyllo-test-client-webhook-url">Client Webhook URL</FieldLabel>
            <Input
              id="phyllo-test-client-webhook-url"
              placeholder="https://example.com/webhook"
              {...register("clientWebhookUrl")}
            />
            <FieldDescription>
              Where the scraped result gets relayed once Phyllo responds.
            </FieldDescription>
            {errors.clientWebhookUrl && <FieldError>{errors.clientWebhookUrl.message}</FieldError>}
          </Field>

          <Field data-invalid={!!errors.extras}>
            <FieldLabel htmlFor="phyllo-test-extras">
              Extras <span className="font-normal text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Textarea
              id="phyllo-test-extras"
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
