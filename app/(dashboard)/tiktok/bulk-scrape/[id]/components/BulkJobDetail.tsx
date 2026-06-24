"use client"

import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { Loader2, ChevronLeft, ChevronRight, Download, ArrowLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card } from "@/components/ui/card"
import { useBulkBatchItems } from "../../datahooks/useBulkScrape"
import type { BulkBatch, BulkBatchItem } from "../../datahooks/useBulkScrape"

const PAGE_SIZE = 50

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-primary/10 text-primary",
  success: "bg-green-500/10 text-green-600",
  failed: "bg-destructive/10 text-destructive",
}

const BATCH_STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-primary/10 text-primary",
  stopped: "bg-yellow-500/10 text-yellow-600",
  done: "bg-green-500/10 text-green-600",
}

function StatusBadge({ status, styles }: { status: string; styles: Record<string, string> }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status}
    </span>
  )
}

function Stat({ value }: { value: number | null }) {
  return value != null ? (
    <span className="text-sm tabular-nums">{value.toLocaleString()}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
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

async function fetchAllItems(id: string): Promise<BulkBatchItem[]> {
  const params = new URLSearchParams({ limit: "100000", offset: "0" })
  const res = await fetch(`/api/v1/internal/tiktok/bulk-batches/${id}?${params}`)
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

export function BulkJobDetail({ id }: { id: string }) {
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState("all")
  const [downloading, setDownloading] = useState(false)

  const { data, isLoading, isError } = useBulkBatchItems(id, {
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const batch = data?.batch
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const columns = useMemo<ColumnDef<BulkBatchItem>[]>(
    () => [
      {
        accessorKey: "url",
        header: "URL",
        cell: ({ row }) => (
          <a
            href={row.original.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline max-w-xs truncate block"
            title={row.original.url}
          >
            {row.original.url}
          </a>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.status} styles={STATUS_STYLES} />
        ),
      },
      {
        accessorKey: "retryCount",
        header: "Retries",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {row.original.retryCount}
          </span>
        ),
      },
      {
        accessorKey: "error",
        header: "Error",
        cell: ({ row }) =>
          row.original.error ? (
            <span
              className="text-xs text-destructive max-w-[180px] truncate block"
              title={row.original.error}
            >
              {row.original.error}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "statsPlays",
        header: "Plays",
        cell: ({ row }) => <Stat value={row.original.statsPlays} />,
      },
      {
        accessorKey: "statsLikes",
        header: "Likes",
        cell: ({ row }) => <Stat value={row.original.statsLikes} />,
      },
      {
        accessorKey: "statsComments",
        header: "Comments",
        cell: ({ row }) => <Stat value={row.original.statsComments} />,
      },
      {
        accessorKey: "statsShares",
        header: "Shares",
        cell: ({ row }) => <Stat value={row.original.statsShares} />,
      },
      {
        accessorKey: "statsSaves",
        header: "Saves",
        cell: ({ row }) => <Stat value={row.original.statsSaves} />,
      },
      {
        accessorKey: "statsReposts",
        header: "Reposts",
        cell: ({ row }) => <Stat value={row.original.statsReposts} />,
      },
      {
        accessorKey: "isTiktokShop",
        header: "TikTok Shop",
        cell: ({ row }) =>
          row.original.statsPlays != null ? (
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${row.original.isTiktokShop ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}
            >
              {row.original.isTiktokShop ? "Yes" : "No"}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(row.original.updatedAt).toLocaleString()}
          </span>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
  })

  function handleStatusFilter(value: string) {
    setStatusFilter(value)
    setPage(0)
  }

  async function handleDownload() {
    if (!batch) return
    setDownloading(true)
    try {
      const all = await fetchAllItems(id)
      const fileName = `${batch.uploadName.replace(/\s+/g, "_")}_batch${batch.batchNumber}.csv`
      triggerCsvDownload(all, fileName)
    } catch {
      // silent — user can retry
    } finally {
      setDownloading(false)
    }
  }

  const eta = batch ? formatEta(batch) : null
  const inQueue = batch
    ? Math.max(batch.dispatched - batch.successCount - batch.failedCount, 0)
    : 0

  return (
    <Card className="bg-background border-none shadow-none ring-0 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Link
          href="/tiktok/bulk-scrape"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Batches
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold truncate">{batch?.uploadName ?? "Loading…"}</h1>
              {batch && <StatusBadge status={batch.status} styles={BATCH_STATUS_STYLES} />}
            </div>
            {batch && (
              <p className="text-sm text-muted-foreground mt-0.5">
                Batch {batch.batchNumber}/{batch.totalBatches}
              </p>
            )}
            {batch && (
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                <span className="text-muted-foreground">
                  Total:{" "}
                  <strong className="text-foreground">{batch.totalUrls.toLocaleString()}</strong>
                </span>
                <span className="text-muted-foreground">
                  Dispatched:{" "}
                  <strong className="text-foreground">{batch.dispatched.toLocaleString()}</strong>
                </span>
                <span className="text-green-600">
                  Success: <strong>{batch.successCount.toLocaleString()}</strong>
                </span>
                <span className="text-destructive">
                  Failed: <strong>{batch.failedCount.toLocaleString()}</strong>
                </span>
                {inQueue > 0 && (
                  <span className="text-primary">
                    In Queue: <strong>{inQueue.toLocaleString()}</strong>
                  </span>
                )}
                {eta && (
                  <span className="text-muted-foreground">
                    ETA: <strong className="text-foreground">{eta}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          onClick={handleDownload}
          disabled={downloading || !batch}
        >
          {downloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          Download all CSV
        </Button>
      </div>

      {/* Table */}
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
                  Failed to load items.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No items match the selected filter.
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

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total > 0
            ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total.toLocaleString()} items`
            : "0 items"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 0 || isLoading}
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
            disabled={page >= totalPages - 1 || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
