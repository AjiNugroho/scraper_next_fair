"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Loader2, UploadCloud, FileText, X } from "lucide-react"

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
import { useUploadBulkJob } from "../datahooks/useBulkScrape"

const formSchema = z.object({
  name: z.string().min(1, "Job name is required"),
})
type FormValues = z.infer<typeof formSchema>

export function UploadJobDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadBulkJob()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setFileError(null)
    if (selected && !selected.name.endsWith(".csv")) {
      setFileError("File must be a CSV")
      setFile(null)
      return
    }
    setFile(selected)
  }

  function handleClose() {
    setOpen(false)
    reset()
    setFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function onSubmit(values: FormValues) {
    if (!file) {
      setFileError("Please select a CSV file")
      return
    }
    await upload.mutateAsync({ name: values.name, file })
    handleClose()
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Upload CSV
      </Button>

      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Bulk Scrape Job</DialogTitle>
            <DialogDescription>
              Upload a CSV file with a single &quot;url&quot; column. Each URL will be scraped one
              by one with a 5-second delay between requests.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="job-name">Job Name</FieldLabel>
              <Input id="job-name" placeholder="e.g. Wardah Beauty Campaign" {...register("name")} />
              {errors.name && <FieldError>{errors.name.message}</FieldError>}
            </Field>

            <Field data-invalid={!!fileError}>
              <FieldLabel>CSV File</FieldLabel>
              <div
                className="relative flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {file ? (
                  <>
                    <FileText className="h-8 w-8 text-primary" />
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      type="button"
                      className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ""
                      }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to select a CSV file
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Must have a &quot;url&quot; column header
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              {fileError && <FieldError>{fileError}</FieldError>}
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={upload.isPending}>
                {upload.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Upload & Start
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
