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
  useTokopediaPhylloBatch,
  useRetryTokopediaPhylloBatch,
  type TokopediaPhylloBatch,
  type TokopediaPhylloBatchItem,
} from "../../datahooks/useTokopediaPhylloBatches"

const PAGE_SIZE = 50

const BATCH_STATUS_STYLES: Record<string, string> = {
  running: "bg-primary/10 text-primary",
  done: "bg-green-500/10 text-green-600",
  partial: "bg-yellow-500/10 text-yellow-600",
  failed: "bg-destructive/10 text-destructive",
}

const ITEM_STATUS_STYLES: Record<string, string> = {
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

export function PhylloBatchDetail({ id }: { id: string }) {
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState("all")

  const { data, isLoading, isError } = useTokopediaPhylloBatch(id, {
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })
  const retry = useRetryTokopediaPhylloBatch()

  const batch: TokopediaPhylloBatch | undefined = data?.batch
  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const columns = useMemo<ColumnDef<TokopediaPhylloBatchItem>[]>(
    () => [
      {
        accessorKey: "hashtag",
        header: "Hashtag",
        cell: ({ row }) => <span className="text-sm">#{row.original.hashtag}</span>,
      },
      {
        accessorKey: "workerName",
        header: "Worker",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.workerName}</span>
        ),
      },
      {
        accessorKey: "videoUrl",
        header: "URL",
        cell: ({ row }) => (
          <span className="text-sm max-w-[280px] truncate block" title={row.original.videoUrl}>
            {row.original.videoUrl}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} styles={ITEM_STATUS_STYLES} />,
      },
      {
        accessorKey: "attempts",
        header: "Attempts",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums text-muted-foreground">{row.original.attempts}</span>
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

  const canRetry = !!batch && batch.status !== "running"

  return (
    <Card className="bg-background border-none shadow-none ring-0 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Link
          href="/tokopedia-project/phyllo-batches"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Batches
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold">
                {batch ? batch.batchDate : "Loading…"}
              </h1>
              {batch && <StatusBadge status={batch.status} styles={BATCH_STATUS_STYLES} />}
            </div>
            {batch && (
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
                <span className="text-muted-foreground">
                  URLs:{" "}
                  <strong className="text-foreground">{batch.videoUrlsCount.toLocaleString()}</strong>
                </span>
                <span className="text-muted-foreground">
                  Sent:{" "}
                  <strong className="text-foreground">{batch.itemsSent.toLocaleString()}</strong>
                </span>
                <span className="text-muted-foreground">
                  Last updated:{" "}
                  <strong className="text-foreground">{formatDate(batch.updatedAt)}</strong>
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
