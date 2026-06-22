"use client"

import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type ColumnFiltersState,
} from "@tanstack/react-table"
import { RefreshCw, Loader2, ChevronLeft, ChevronRight, Download, ArrowLeft } from "lucide-react"
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
import { useBulkJobAllItems, useRetryBulkJob } from "../../datahooks/useBulkScrape"
import type { BulkJobItem } from "../../datahooks/useBulkScrape"

const PAGE_SIZE = 100

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-primary/10 text-primary",
  success: "bg-green-500/10 text-green-600",
  failed: "bg-destructive/10 text-destructive",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status}
    </span>
  )
}

function downloadCsv(items: BulkJobItem[], jobName: string) {
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
  a.download = `${jobName.replace(/\s+/g, "_")}_items.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function BulkJobDetail({ id }: { id: string }) {
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const retry = useRetryBulkJob()

  const { data, isLoading, isError } = useBulkJobAllItems(id)
  const job = data?.job
  const allItems = data?.items ?? []

  const columns = useMemo<ColumnDef<BulkJobItem>[]>(
    () => [
      {
        accessorKey: "url",
        header: "URL",
        cell: ({ row }) => (
          <a
            href={row.original.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline max-w-sm truncate block"
            title={row.original.url}
          >
            {row.original.url}
          </a>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        filterFn: "equals",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
              className="text-xs text-destructive max-w-xs truncate block"
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
        cell: ({ row }) =>
          row.original.statsPlays != null ? (
            <span className="text-sm tabular-nums">{row.original.statsPlays.toLocaleString()}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "statsLikes",
        header: "Likes",
        cell: ({ row }) =>
          row.original.statsLikes != null ? (
            <span className="text-sm tabular-nums">{row.original.statsLikes.toLocaleString()}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "statsComments",
        header: "Comments",
        cell: ({ row }) =>
          row.original.statsComments != null ? (
            <span className="text-sm tabular-nums">{row.original.statsComments.toLocaleString()}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "statsShares",
        header: "Shares",
        cell: ({ row }) =>
          row.original.statsShares != null ? (
            <span className="text-sm tabular-nums">{row.original.statsShares.toLocaleString()}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "statsSaves",
        header: "Saves",
        cell: ({ row }) =>
          row.original.statsSaves != null ? (
            <span className="text-sm tabular-nums">{row.original.statsSaves.toLocaleString()}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "statsReposts",
        header: "Reposts",
        cell: ({ row }) =>
          row.original.statsReposts != null ? (
            <span className="text-sm tabular-nums">{row.original.statsReposts.toLocaleString()}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
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

  const statusFilter = (columnFilters.find((f) => f.id === "status")?.value as string) ?? "all"

  const table = useReactTable({
    data: allItems,
    columns,
    state: { columnFilters },
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  })

  const filteredRows = table.getFilteredRowModel().rows
  const pageIndex = table.getState().pagination.pageIndex
  const pageCount = table.getPageCount()
  const displayedFrom = pageIndex * PAGE_SIZE + 1
  const displayedTo = Math.min((pageIndex + 1) * PAGE_SIZE, filteredRows.length)

  function handleStatusFilter(value: string) {
    if (value === "all") {
      table.getColumn("status")?.setFilterValue(undefined)
    } else {
      table.getColumn("status")?.setFilterValue(value)
    }
    table.setPageIndex(0)
  }

  function handleDownload(filtered: boolean) {
    if (!job) return
    const items = filtered ? filteredRows.map((r) => r.original) : allItems
    downloadCsv(items, job.name)
  }

  return (
    <Card className="bg-background border-none shadow-none ring-0 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Link
          href="/tiktok/bulk-scrape"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Bulk Jobs
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold truncate">{job?.name ?? "Loading…"}</h1>
            {job && (
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
                <span className="text-muted-foreground">
                  Total:{" "}
                  <strong className="text-foreground">{job.totalUrls.toLocaleString()}</strong>
                </span>
                <span className="text-muted-foreground">
                  Dispatched:{" "}
                  <strong className="text-foreground">{job.processed.toLocaleString()}</strong>
                </span>
                <span className="text-green-600">
                  Success: <strong>{job.successCount.toLocaleString()}</strong>
                </span>
                <span className="text-destructive">
                  Failed: <strong>{job.failedCount.toLocaleString()}</strong>
                </span>
                <StatusBadge status={job.status} />
              </div>
            )}
          </div>

          {job && job.failedCount > 0 && job.status !== "running" && (
            <Button
              size="sm"
              variant="outline"
              disabled={retry.isPending}
              onClick={() => retry.mutate(job.id)}
            >
              {retry.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Retry Failed ({job.failedCount.toLocaleString()})
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({allItems.length.toLocaleString()})</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          {statusFilter !== "all" && filteredRows.length !== allItems.length && (
            <Button size="sm" variant="outline" onClick={() => handleDownload(true)}>
              <Download className="h-3.5 w-3.5" />
              Download filtered ({filteredRows.length.toLocaleString()})
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => handleDownload(false)} disabled={allItems.length === 0}>
            <Download className="h-3.5 w-3.5" />
            Download all ({allItems.length.toLocaleString()})
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
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
          {filteredRows.length > 0
            ? `${displayedFrom.toLocaleString()}–${displayedTo.toLocaleString()} of ${filteredRows.length.toLocaleString()} items`
            : "0 items"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2">
            {pageIndex + 1} / {Math.max(pageCount, 1)}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
