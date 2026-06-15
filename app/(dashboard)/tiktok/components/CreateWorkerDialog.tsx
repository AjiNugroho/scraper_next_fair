"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { useCreateTiktokWorker } from "../datahooks/useTiktokWorkers"

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
})

type FormValues = z.infer<typeof formSchema>

export function CreateWorkerDialog() {
  const [open, setOpen] = useState(false)
  const createWorker = useCreateTiktokWorker()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) })

  async function onSubmit(values: FormValues) {
    await createWorker.mutateAsync(values.name)
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
          Add Worker
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Worker</DialogTitle>
          <DialogDescription>Register a new mobile scraper device.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="worker-name">Worker Name</FieldLabel>
            <Input
              id="worker-name"
              placeholder="e.g. worker-01"
              autoComplete="off"
              {...register("name")}
            />
            {errors.name && <FieldError>{errors.name.message}</FieldError>}
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createWorker.isPending}>
              {createWorker.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add Worker
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
