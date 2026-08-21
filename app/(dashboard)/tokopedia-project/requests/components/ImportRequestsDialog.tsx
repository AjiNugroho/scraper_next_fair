"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Upload, Download, Loader2, FileText } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Same fixed keys offered by default in SubmitRequestDialog.tsx / EditRequestDialog.tsx —
// kept in sync with the client contract in lib/tiktok-data-formatter.ts.
const EXTRA_COLUMNS = ["account_name", "listen_group_id", "request_data_id"] as const
const TEMPLATE_COLUMNS = ["hashtag", ...EXTRA_COLUMNS] as const

const MAX_ROWS = 1000
// Mirrors the server's per-submission cap (app/api/v1/internal/tokopedia/jobs/route.ts).
const BATCH_SIZE = 50

type ParsedRow = {
  hashtag: string
  account_name: string
  listen_group_id: string
  request_data_id: string
}

function downloadCsvTemplate() {
  const csv = [TEMPLATE_COLUMNS.join(","), "sepatulari,example-account,123,456"].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "gopay-requests-template.csv"
  a.click()
  URL.revokeObjectURL(url)
}

// Minimal RFC4180-ish line parser — handles quoted fields with embedded commas/quotes,
// which is as much CSV complexity as this form ever needs to round-trip.
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let field = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
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
      fields.push(field)
      field = ""
    } else {
      field += char
    }
  }
  fields.push(field)
  return fields
}

function parseCsv(text: string): { rows: ParsedRow[]; error: string | null } {
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim() !== "")
  if (lines.length === 0) return { rows: [], error: "The file is empty." }

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const hashtagIdx = header.indexOf("hashtag")
  if (hashtagIdx === -1) {
    return { rows: [], error: 'Missing required "hashtag" column in the CSV header.' }
  }
  const extraIdx = Object.fromEntries(EXTRA_COLUMNS.map((col) => [col, header.indexOf(col)])) as Record<
    (typeof EXTRA_COLUMNS)[number],
    number
  >

  const dataLines = lines.slice(1)
  if (dataLines.length > MAX_ROWS) {
    return {
      rows: [],
      error: `Too many rows (${dataLines.length}). Split into files of ${MAX_ROWS} or fewer.`,
    }
  }

  const rows = dataLines.map((line) => {
    const cols = parseCsvLine(line)
    return {
      hashtag: (cols[hashtagIdx] ?? "").trim().replace(/^#/, ""),
      account_name: (cols[extraIdx.account_name] ?? "").trim(),
      listen_group_id: (cols[extraIdx.listen_group_id] ?? "").trim(),
      request_data_id: (cols[extraIdx.request_data_id] ?? "").trim(),
    }
  })

  return { rows, error: null }
}

function rowExtras(row: ParsedRow): Record<string, string> {
  const extras: Record<string, string> = {}
  if (row.account_name) extras.account_name = row.account_name
  if (row.listen_group_id) extras.listen_group_id = row.listen_group_id
  if (row.request_data_id) extras.request_data_id = row.request_data_id
  return extras
}

export function ImportRequestsDialog() {
  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const validRows = rows.filter((r) => r.hashtag !== "")
  const invalidCount = rows.length - validRows.length

  function reset() {
    setFileName(null)
    setRows([])
    setParseError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleClose() {
    setOpen(false)
    reset()
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const text = await file.text()
    const { rows: parsed, error } = parseCsv(text)
    setParseError(error)
    setRows(error ? [] : parsed)
  }

  async function handleImport() {
    if (validRows.length === 0) return
    setIsSubmitting(true)

    // The server applies one `extras` object per submission (see the jobs route), so rows
    // sharing identical extras are grouped into the same batch, then chunked to its 50-item cap.
    const groups = new Map<string, { extras: Record<string, string>; hashtags: string[] }>()
    for (const row of validRows) {
      const extras = rowExtras(row)
      const key = JSON.stringify(extras)
      const group = groups.get(key) ?? { extras, hashtags: [] }
      group.hashtags.push(row.hashtag)
      groups.set(key, group)
    }

    const batches: { extras: Record<string, string>; hashtags: string[] }[] = []
    for (const group of groups.values()) {
      for (let i = 0; i < group.hashtags.length; i += BATCH_SIZE) {
        batches.push({ extras: group.extras, hashtags: group.hashtags.slice(i, i + BATCH_SIZE) })
      }
    }

    // Submitted sequentially — each POST triggers a worker rebalance, and running those
    // concurrently would race on the same rebalance tables.
    let submitted = 0
    const failedHashtags: string[] = []
    for (const batch of batches) {
      try {
        const res = await fetch("/api/v1/internal/tokopedia/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            extras: Object.keys(batch.extras).length > 0 ? batch.extras : undefined,
            data: batch.hashtags.map((hashtag) => ({ hashtag })),
          }),
        })
        if (!res.ok) throw new Error()
        submitted += batch.hashtags.length
      } catch {
        failedHashtags.push(...batch.hashtags)
      }
    }

    setIsSubmitting(false)
    queryClient.invalidateQueries({ queryKey: ["tokopedia-requests"] })
    queryClient.invalidateQueries({ queryKey: ["tokopedia-workers"] })

    if (failedHashtags.length === 0) {
      toast.success(`Imported ${submitted} request${submitted !== 1 ? "s" : ""} and rebalanced workers`)
      handleClose()
    } else {
      toast.error(
        `Imported ${submitted}, failed ${failedHashtags.length}: ${failedHashtags.slice(0, 5).join(", ")}${
          failedHashtags.length > 5 ? "…" : ""
        }`,
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle>Import Requests from CSV</DialogTitle>
          <DialogDescription>
            Bulk-submit hashtags with optional account_name, listen_group_id, and
            request_data_id extras. Download the template below for the expected columns.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto pr-1 pb-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={downloadCsvTemplate}
          >
            <Download className="h-3.5 w-3.5" />
            Download Template
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
            id="import-requests-csv-input"
          />
          <label
            htmlFor="import-requests-csv-input"
            className="flex items-center justify-center gap-2 rounded-md border border-dashed h-24 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors cursor-pointer"
          >
            <FileText className="h-4 w-4" />
            {fileName ?? "Click to choose a CSV file"}
          </label>

          {parseError && <p className="text-sm text-destructive">{parseError}</p>}

          {rows.length > 0 && !parseError && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {validRows.length} valid row{validRows.length !== 1 ? "s" : ""}
                {invalidCount > 0 && (
                  <span className="text-destructive">
                    {" "}
                    · {invalidCount} skipped (missing hashtag)
                  </span>
                )}
              </p>
              <div className="rounded-md border max-h-56 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hashtag</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Listen Group ID</TableHead>
                      <TableHead>Request Data ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 50).map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">
                          {row.hashtag ? (
                            `#${row.hashtag}`
                          ) : (
                            <span className="text-destructive">missing</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.account_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.listen_group_id || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.request_data_id || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {rows.length > 50 && (
                <p className="text-xs text-muted-foreground">Showing first 50 of {rows.length} rows.</p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 shrink-0">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" disabled={validRows.length === 0 || isSubmitting} onClick={handleImport}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Import {validRows.length > 0 ? `${validRows.length} ` : ""}Request
            {validRows.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
