"use client"

import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { RefreshCw, Loader2, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BulkJob, BulkJobItem } from "../datahooks/useBulkScrape"
import { useBulkJobDetail, useRetryBulkJob } from "../datahooks/useBulkScrape"

const PAGE_SIZE = 50

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-primary/10 text-primary",
  success: "bg-green-500/10 text-green-600",
  failed: "bg-destructive/10 text-destructive",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status}
    </span>
  )
}

export function JobDetailSheet({
  job,
  open,
  onOpenChange,
}: {
  job: BulkJob | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(0)
  const retry = useRetryBulkJob()

  const { data, isLoading } = useBulkJobDetail(job?.id ?? null, {
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

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
              className="text-xs text-destructive max-w-[200px] truncate block"
              title={row.original.error}
            >
              {row.original.error}
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

  function handleFilterChange(value: string) {
    setStatusFilter(value)
    setPage(0)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-4xl flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="truncate">{job?.name ?? "Job Detail"}</SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                Total: <strong className="text-foreground">{job?.totalUrls.toLocaleString()}</strong>
              </span>
              <span className="text-muted-foreground">
                Processed:{" "}
                <strong className="text-foreground">{job?.processed.toLocaleString()}</strong>
              </span>
              <span className="text-green-600">
                Success: <strong>{job?.successCount.toLocaleString()}</strong>
              </span>
              <span className="text-destructive">
                Failed: <strong>{job?.failedCount.toLocaleString()}</strong>
              </span>
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between px-6 py-3 border-b shrink-0 gap-3">
          <Select value={statusFilter} onValueChange={handleFilterChange}>
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

        <div className="flex-1 overflow-auto">
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

        <div className="flex items-center justify-between px-6 py-3 border-t shrink-0 text-sm text-muted-foreground">
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
      </SheetContent>
    </Sheet>
  )
}
