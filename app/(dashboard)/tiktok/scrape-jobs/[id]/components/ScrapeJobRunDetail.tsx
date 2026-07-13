"use client"

import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { Loader2, ChevronLeft, ChevronRight, ArrowLeft, RotateCcw } from "lucide-react"
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
import {
  useScrapeJobRun,
  useRetryScrapeJobRun,
  type ScrapeJobRun,
  type ScrapeJobRunBatch,
} from "../../datahooks/useScrapeJobs"

const PAGE_SIZE = 50

const RUN_STATUS_STYLES: Record<string, string> = {
  running: "bg-primary/10 text-primary",
  done: "bg-green-500/10 text-green-600",
  partial: "bg-yellow-500/10 text-yellow-600",
  failed: "bg-destructive/10 text-destructive",
}

const BATCH_STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  sent: "bg-green-500/10 text-green-600",
  failed: "bg-destructive/10 text-destructive",
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

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString()
}

function duration(start: string, end: string | null) {
  if (!end) return "—"
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export function ScrapeJobRunDetail({ id }: { id: string }) {
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState("all")

  const { data, isLoading, isError } = useScrapeJobRun(id, {
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })
  const retry = useRetryScrapeJobRun()

  const run: ScrapeJobRun | undefined = data?.run
  const batches = data?.batches ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const columns = useMemo<ColumnDef<ScrapeJobRunBatch>[]>(
    () => [
      {
        accessorKey: "hashtag",
        header: "Hashtag",
        cell: ({ row }) => <span className="text-sm">#{row.original.hashtag}</span>,
      },
      {
        accessorKey: "urlCount",
        header: "URLs",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">{row.original.urlCount.toLocaleString()}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge status={row.original.status} styles={BATCH_STATUS_STYLES} />
        ),
      },
      {
        accessorKey: "attempts",
        header: "Attempts",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {row.original.attempts}
          </span>
        ),
      },
      {
        accessorKey: "error",
        header: "Error",
        cell: ({ row }) =>
          row.original.error ? (
            <span
              className="text-xs text-destructive max-w-[240px] truncate block"
              title={row.original.error}
            >
              {row.original.error}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "sentAt",
        header: "Sent At",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.sentAt)}
          </span>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: batches,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
  })

  function handleStatusFilter(value: string) {
    setStatusFilter(value)
    setPage(0)
  }

  const canRetry = !!run && run.status !== "running"

  return (
    <Card className="bg-background border-none shadow-none ring-0 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Link
          href="/tiktok/scrape-jobs"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Job Runs
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold">
                {run ? formatDate(run.startedAt) : "Loading…"}
              </h1>
              {run && <StatusBadge status={run.status} styles={RUN_STATUS_STYLES} />}
            </div>
            {run && (
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                <span className="text-muted-foreground">
                  Duration:{" "}
                  <strong className="text-foreground">
                    {duration(run.startedAt, run.completedAt)}
                  </strong>
                </span>
                <span className="text-muted-foreground">
                  Batches Sent:{" "}
                  <strong className="text-foreground">{run.batchesSent.toLocaleString()}</strong>
                </span>
                <span className="text-muted-foreground">
                  URLs Sent:{" "}
                  <strong className="text-foreground">{run.videoUrlsCount.toLocaleString()}</strong>
                </span>
              </div>
            )}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => retry.mutate(id)}
            disabled={!canRetry || retry.isPending}
          >
            {retry.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            Retry Failed
          </Button>
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
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
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
                  Failed to load batches.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No batches match the selected filter.
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
            ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total.toLocaleString()} batches`
            : "0 batches"}
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
