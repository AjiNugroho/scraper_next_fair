"use client"

import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Loader2, Eye, Trash2, Play, Square, Download } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { BulkBatch, BulkBatchItem } from "../datahooks/useBulkScrape"
import { useBulkBatches, useStartBatch, useStopBatch } from "../datahooks/useBulkScrape"
import { UploadBatchDialog } from "./UploadBatchDialog"
import { DeleteBatchDialog } from "./DeleteBatchDialog"

const PAGE_SIZE = 20

const BATCH_STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-primary/10 text-primary",
  stopped: "bg-yellow-500/10 text-yellow-600",
  done: "bg-green-500/10 text-green-600",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BATCH_STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status}
    </span>
  )
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2 min-w-35">
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {value.toLocaleString()} / {total.toLocaleString()}
      </span>
    </div>
  )
}

function formatEta(batch: BulkBatch): string | null {
  if (batch.status !== "running") return null
  if (!batch.startedAt) return null
  const completed = batch.successCount + batch.failedCount
  if (completed === 0) return "Calculating…"
  const elapsedMs = Date.now() - new Date(batch.startedAt).getTime()
  const ratePerMs = completed / elapsedMs
  const remaining = batch.totalUrls - completed
  if (remaining <= 0) return null
  const etaMs = remaining / ratePerMs
  const s = Math.round(etaMs / 1000)
  if (s < 60) return `~${s}s`
  if (s < 3600) return `~${Math.round(s / 60)}m`
  const h = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  return `~${h}h ${m}m`
}

async function fetchAllBatchItems(batchId: string): Promise<BulkBatchItem[]> {
  const params = new URLSearchParams({ limit: "100000", offset: "0" })
  const res = await fetch(`/api/v1/internal/tiktok/bulk-batches/${batchId}?${params}`)
  if (!res.ok) throw new Error("Failed to fetch items for download")
  const data = await res.json()
  return data.items as BulkBatchItem[]
}

function triggerCsvDownload(items: BulkBatchItem[], fileName: string) {
  const headers = [
    "url", "status", "retry_count", "error",
    "plays", "likes", "comments", "shares", "saves", "reposts", "is_tiktok_shop",
    "created_at", "updated_at",
  ]
  const rows = items.map((item) =>
    [
      item.url,
      item.status,
      item.retryCount,
      item.error ?? "",
      item.statsPlays ?? "",
      item.statsLikes ?? "",
      item.statsComments ?? "",
      item.statsShares ?? "",
      item.statsSaves ?? "",
      item.statsReposts ?? "",
      item.isTiktokShop,
      item.createdAt,
      item.updatedAt,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  )
  const csv = [headers.join(","), ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export function BulkScrapeManagement() {
  const [page, setPage] = useState(0)
  const [deleteBatch, setDeleteBatch] = useState<BulkBatch | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const { data, isLoading, isError } = useBulkBatches({ limit: PAGE_SIZE, offset: page * PAGE_SIZE })
  const batches = data?.batches ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const start = useStartBatch()
  const stop = useStopBatch()

  async function handleDownload(batch: BulkBatch) {
    setDownloadingId(batch.id)
    try {
      const items = await fetchAllBatchItems(batch.id)
      const fileName = `${batch.uploadName.replace(/\s+/g, "_")}_batch${batch.batchNumber}.csv`
      triggerCsvDownload(items, fileName)
    } catch {
      // silent — user can retry
    } finally {
      setDownloadingId(null)
    }
  }

  const columns = useMemo<ColumnDef<BulkBatch>[]>(
    () => [
      {
        id: "name",
        header: "Batch",
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium">{row.original.uploadName}</p>
            <p className="text-xs text-muted-foreground">
              Batch {row.original.batchNumber}/{row.original.totalBatches}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "dispatched",
        header: "Dispatched",
        cell: ({ row }) => (
          <ProgressBar value={row.original.dispatched} total={row.original.totalUrls} />
        ),
      },
      {
        id: "success",
        header: "Success",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-green-600">
            {row.original.successCount.toLocaleString()}
          </span>
        ),
      },
      {
        id: "failed",
        header: "Failed",
        cell: ({ row }) => (
          <span
            className={`text-sm tabular-nums ${row.original.failedCount > 0 ? "text-destructive" : "text-muted-foreground"}`}
          >
            {row.original.failedCount.toLocaleString()}
          </span>
        ),
      },
      {
        id: "inQueue",
        header: "In Queue",
        cell: ({ row }) => {
          const inQueue =
            row.original.dispatched - row.original.successCount - row.original.failedCount
          return (
            <span
              className={`text-sm tabular-nums ${inQueue > 0 ? "text-primary" : "text-muted-foreground"}`}
            >
              {Math.max(inQueue, 0).toLocaleString()}
            </span>
          )
        },
      },
      {
        id: "eta",
        header: "ETA",
        cell: ({ row }) => {
          const eta = formatEta(row.original)
          return eta ? (
            <span className="text-xs text-muted-foreground whitespace-nowrap">{eta}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {new Date(row.original.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const batch = row.original
          const isDownloading = downloadingId === batch.id
          return (
            <div className="flex items-center gap-1 justify-end">
              {batch.status === "running" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-yellow-600 hover:text-yellow-600"
                  disabled={stop.isPending}
                  onClick={() => stop.mutate(batch.id)}
                  title="Stop dispatching"
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-primary hover:text-primary"
                  disabled={batch.status === "done" || start.isPending}
                  onClick={() => start.mutate(batch.id)}
                  title={batch.status === "done" ? "All dispatched" : "Start scraping"}
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                <Link href={`/tiktok/bulk-scrape/${batch.id}`} title="View items">
                  <Eye className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={isDownloading}
                onClick={() => handleDownload(batch)}
                title="Download CSV"
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                disabled={batch.status === "running"}
                onClick={() => setDeleteBatch(batch)}
                title="Delete batch"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )
        },
      },
    ],
    [start.isPending, stop.isPending, downloadingId],
  )

  const table = useReactTable({
    data: batches,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <UploadBatchDialog />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-destructive">
                  Failed to load batches.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No batches yet. Upload a CSV to get started.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total > 0
            ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total} batches`
            : "0 batches"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2">
            {page + 1} / {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DeleteBatchDialog
        batch={deleteBatch}
        open={deleteBatch !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteBatch(null)
        }}
      />
    </div>
  )
}
