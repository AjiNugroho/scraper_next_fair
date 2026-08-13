"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"

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

import type { TokopediaJobHashtag } from "../datahooks/useTokopediaHashtags"
import { useUpdateTokopediaHashtag } from "../datahooks/useTokopediaHashtags"

const formSchema = z.object({
  hashtag: z.string().min(1, "Required"),
})

type FormValues = z.infer<typeof formSchema>

interface Props {
  hashtag: TokopediaJobHashtag | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditHashtagDialog({ hashtag, open, onOpenChange }: Props) {
  const updateHashtag = useUpdateTokopediaHashtag()

  const {
    handleSubmit,
    reset,
    register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { hashtag: "" },
  })

  useEffect(() => {
    if (hashtag) reset({ hashtag: hashtag.hashtag })
  }, [hashtag, reset])

  async function onSubmit(values: FormValues) {
    if (!hashtag) return
    await updateHashtag.mutateAsync({ id: hashtag.id, hashtag: values.hashtag })
    onOpenChange(false)
  }

  function handleClose() {
    onOpenChange(false)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleClose())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Hashtag</DialogTitle>
          <DialogDescription>
            Renames the queued hashtag. The worker it&apos;s assigned to keeps the assignment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Field data-invalid={!!errors.hashtag}>
            <FieldLabel htmlFor="edit-job-hashtag">Hashtag (no # prefix)</FieldLabel>
            <Input id="edit-job-hashtag" placeholder="e.g. sepatulari" {...register("hashtag")} />
            {errors.hashtag && <FieldError>{errors.hashtag.message}</FieldError>}
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateHashtag.isPending}>
              {updateHashtag.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
