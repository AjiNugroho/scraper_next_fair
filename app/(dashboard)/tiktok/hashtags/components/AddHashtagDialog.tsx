"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { useCreateTiktokHashtag } from "../datahooks/useTiktokHashtags"

const formSchema = z.object({
  hashtag: z
    .string()
    .min(1, "Hashtag is required")
    .refine((v) => !v.startsWith("#"), { message: "Do not include the # prefix" }),
})

type FormValues = z.infer<typeof formSchema>

export function AddHashtagDialog() {
  const [open, setOpen] = useState(false)
  const createHashtag = useCreateTiktokHashtag()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) })

  async function onSubmit(values: FormValues) {
    await createHashtag.mutateAsync(values.hashtag)
    setOpen(false)
    reset()
  }

  function handleOpenChange(value: boolean) {
    if (!value) reset()
    setOpen(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add Hashtag
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Hashtag</DialogTitle>
          <DialogDescription>
            Add a hashtag to the global pool. Workers will be rebalanced automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field data-invalid={!!errors.hashtag}>
            <FieldLabel htmlFor="hashtag-input">Hashtag</FieldLabel>
            <Input
              id="hashtag-input"
              placeholder="e.g. savearth"
              autoComplete="off"
              {...register("hashtag")}
            />
            <FieldDescription>Enter without the # prefix.</FieldDescription>
            {errors.hashtag && <FieldError>{errors.hashtag.message}</FieldError>}
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createHashtag.isPending}>
              {createHashtag.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Hashtag
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
