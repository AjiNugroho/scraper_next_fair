"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { Download, FileWarning, Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useSubmitTiktokJob } from "../datahooks/useTiktokJobs"
import type { SubmitJobInput } from "../datahooks/useTiktokJobs"

const TEMPLATE_HEADER =
  "hashtag,date_start,date_end,data_size,webhookUrl,listenGroupId,requestDataId,extras"
const TEMPLATE_EXAMPLE_ROW =
  'savearth,2024-01-01,2024-01-31,100,https://example.com/webhook,1,42,"{""source"":""campaign-a""}"'

const MAX_ITEMS_PER_BATCH = 50

type CsvDataItem = SubmitJobInput["data"][number]

type ParsedRow = CsvDataItem & {
  webhookUrl?: string
  extras?: Record<string, unknown>
}

type SubmitBatch = {
  webhook_url?: string
  extras?: Record<string, unknown>
  data: CsvDataItem[]
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""))
}

function parseRows(rows: string[][]): { data: ParsedRow[]; errors: string[] } {
  if (rows.length === 0) {
    return { data: [], errors: ["File is empty"] }
  }

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const hashtagIdx = header.indexOf("hashtag") !== -1 ? header.indexOf("hashtag") : header.indexOf("identifier")
  if (hashtagIdx === -1) {
    return { data: [], errors: ['Missing required column "hashtag"'] }
  }
  const dateStartIdx = header.indexOf("date_start")
  const dateEndIdx = header.indexOf("date_end")
  const dataSizeIdx = header.indexOf("data_size")
  const webhookIdx = header.indexOf("webhookurl")
  const listenGroupIdx = header.indexOf("listengroupid")
  const requestDataIdx = header.indexOf("requestdataid")
  const extrasIdx = header.indexOf("extras")

  const errors: string[] = []
  const data: ParsedRow[] = []

  rows.slice(1).forEach((cols, i) => {
    const rowNumber = i + 2
    const hashtag = cols[hashtagIdx]?.trim()
    if (!hashtag) {
      errors.push(`Row ${rowNumber}: missing hashtag, skipped`)
      return
    }

    let data_size: number | undefined
    const dataSizeRaw = dataSizeIdx >= 0 ? cols[dataSizeIdx]?.trim() : ""
    if (dataSizeRaw) {
      const parsedSize = Number(dataSizeRaw)
      if (Number.isFinite(parsedSize) && parsedSize > 0) {
        data_size = parsedSize
      } else {
        errors.push(`Row ${rowNumber}: invalid data_size "${dataSizeRaw}", ignored`)
      }
    }

    let listenGroupId: number | undefined
    const listenGroupRaw = listenGroupIdx >= 0 ? cols[listenGroupIdx]?.trim() : ""
    if (listenGroupRaw) {
      const parsedId = Number(listenGroupRaw)
      if (Number.isFinite(parsedId)) {
        listenGroupId = parsedId
      } else {
        errors.push(`Row ${rowNumber}: invalid listenGroupId "${listenGroupRaw}", ignored`)
      }
    }

    let requestDataId: number | undefined
    const requestDataRaw = requestDataIdx >= 0 ? cols[requestDataIdx]?.trim() : ""
    if (requestDataRaw) {
      const parsedId = Number(requestDataRaw)
      if (Number.isFinite(parsedId)) {
        requestDataId = parsedId
      } else {
        errors.push(`Row ${rowNumber}: invalid requestDataId "${requestDataRaw}", ignored`)
      }
    }

    let extraFields: Record<string, unknown> | undefined
    const extrasRaw = extrasIdx >= 0 ? cols[extrasIdx]?.trim() : ""
    if (extrasRaw) {
      try {
        const parsedExtras: unknown = JSON.parse(extrasRaw)
        if (parsedExtras && typeof parsedExtras === "object" && !Array.isArray(parsedExtras)) {
          extraFields = parsedExtras as Record<string, unknown>
        } else {
          errors.push(`Row ${rowNumber}: extras must be a JSON object, ignored`)
        }
      } catch {
        errors.push(`Row ${rowNumber}: invalid extras JSON, ignored`)
      }
    }

    const extras: Record<string, unknown> | undefined =
      listenGroupId !== undefined || requestDataId !== undefined || extraFields
        ? {
            ...extraFields,
            ...(listenGroupId !== undefined ? { listen_group_id: listenGroupId } : {}),
            ...(requestDataId !== undefined ? { request_data_id: requestDataId } : {}),
          }
        : undefined

    data.push({
      identifier: hashtag,
      date_start: dateStartIdx >= 0 ? cols[dateStartIdx]?.trim() || undefined : undefined,
      date_end: dateEndIdx >= 0 ? cols[dateEndIdx]?.trim() || undefined : undefined,
      data_size,
      webhookUrl: webhookIdx >= 0 ? cols[webhookIdx]?.trim() || undefined : undefined,
      extras,
    })
  })

  if (data.length === 0 && errors.length === 0) {
    errors.push("No valid rows found")
  }

  return { data, errors }
}

function groupIntoBatches(rows: ParsedRow[]): SubmitBatch[] {
  const groups = new Map<string, SubmitBatch>()

  for (const row of rows) {
    const key = JSON.stringify({ webhook_url: row.webhookUrl ?? null, extras: row.extras ?? null })
    const existing = groups.get(key)
    const item: CsvDataItem = {
      identifier: row.identifier,
      date_start: row.date_start,
      date_end: row.date_end,
      data_size: row.data_size,
    }
    if (existing) {
      existing.data.push(item)
    } else {
      groups.set(key, { webhook_url: row.webhookUrl, extras: row.extras, data: [item] })
    }
  }

  const batches: SubmitBatch[] = []
  for (const group of groups.values()) {
    for (let i = 0; i < group.data.length; i += MAX_ITEMS_PER_BATCH) {
      batches.push({
        webhook_url: group.webhook_url,
        extras: group.extras,
        data: group.data.slice(i, i + MAX_ITEMS_PER_BATCH),
      })
    }
  }
  return batches
}

export function ImportCsvDialog() {
  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const submitJob = useSubmitTiktokJob()

  const isSubmitting = progress !== null

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const text = await file.text()
    const { data, errors } = parseRows(parseCsv(text))
    setParsed(data)
    setParseErrors(errors)
  }

  async function handleImport() {
    if (parsed.length === 0) return
    const batches = groupIntoBatches(parsed)
    setProgress({ done: 0, total: batches.length })
    for (const batch of batches) {
      await submitJob.mutateAsync(batch)
      setProgress((prev) => (prev ? { done: prev.done + 1, total: prev.total } : prev))
    }
    handleClose()
  }

  function handleClose() {
    setOpen(false)
    setFileName(null)
    setParsed([])
    setParseErrors([])
    setProgress(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleDownloadTemplate() {
    const csv = `${TEMPLATE_HEADER}\n${TEMPLATE_EXAMPLE_ROW}\n`
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "tiktok-jobs-template.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle>Import Jobs from CSV</DialogTitle>
          <DialogDescription>
            CSV must include a &quot;hashtag&quot; column. Optional columns: date_start, date_end,
            data_size, webhookUrl, listenGroupId, requestDataId, extras (JSON object). Each unique
            combination of webhookUrl/listenGroupId/requestDataId/extras is submitted as its own
            batch.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto pr-1 pb-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start text-muted-foreground hover:text-foreground"
            onClick={handleDownloadTemplate}
          >
            <Download className="h-3.5 w-3.5" />
            Download CSV template
          </Button>

          <Field>
            <FieldLabel htmlFor="csv-file">CSV File</FieldLabel>
            <Input
              id="csv-file"
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={isSubmitting}
            />
          </Field>

          {parseErrors.length > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1">
              {parseErrors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                  <FileWarning className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          )}

          {parsed.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">
                Preview ({parsed.length} row{parsed.length === 1 ? "" : "s"} from {fileName})
              </span>
              <div className="rounded-md border max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hashtag</TableHead>
                      <TableHead>Webhook</TableHead>
                      <TableHead>Extras</TableHead>
                      <TableHead>Date Start</TableHead>
                      <TableHead>Date End</TableHead>
                      <TableHead>Data Size</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsed.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-medium">#{row.identifier}</TableCell>
                        <TableCell
                          className="text-sm text-muted-foreground max-w-40 truncate"
                          title={row.webhookUrl}
                        >
                          {row.webhookUrl ?? "—"}
                        </TableCell>
                        <TableCell
                          className="text-sm text-muted-foreground max-w-40 truncate"
                          title={row.extras ? JSON.stringify(row.extras) : undefined}
                        >
                          {row.extras ? JSON.stringify(row.extras) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.date_start ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.date_end ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.data_size ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 shrink-0">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleImport} disabled={parsed.length === 0 || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting
              ? `Importing batch ${progress.done + 1}/${progress.total}...`
              : `Import${parsed.length > 0 ? ` (${parsed.length})` : ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
