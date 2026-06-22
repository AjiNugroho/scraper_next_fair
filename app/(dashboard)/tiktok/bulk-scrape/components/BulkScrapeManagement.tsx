"use client"

import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Loader2, Eye } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { BulkJob } from "../datahooks/useBulkScrape"
import { useBulkJobs } from "../datahooks/useBulkScrape"
import { UploadJobDialog } from "./UploadJobDialog"
import { JobDetailSheet } from "./JobDetailSheet"

const PAGE_SIZE = 20

const JOB_STATUS_STYLES: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-primary/10 text-primary",
  done: "bg-green-500/10 text-green-600",
  failed: "bg-destructive/10 text-destructive",
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${JOB_STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"}`}
    >
      {status}
    </span>
  )
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min((value / total) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {value.toLocaleString()} / {total.toLocaleString()}
      </span>
    </div>
  )
}

export function BulkScrapeManagement() {
  const [page, setPage] = useState(0)
  const [selectedJob, setSelectedJob] = useState<BulkJob | null>(null)

  const { data, isLoading, isError } = useBulkJobs({ limit: PAGE_SIZE, offset: page * PAGE_SIZE })
  const jobs = data?.jobs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const columns = useMemo<ColumnDef<BulkJob>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Job Name",
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "progress",
        header: "Progress",
        cell: ({ row }) => (
          <ProgressBar value={row.original.processed} total={row.original.totalUrls} />
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
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSelectedJob(row.original)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: jobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <UploadJobDialog />
      </div>

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
                  Failed to load bulk jobs.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No bulk jobs yet. Upload a CSV to get started.
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
            ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total} jobs`
            : "0 jobs"}
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

      <JobDetailSheet
        job={selectedJob}
        open={selectedJob !== null}
        onOpenChange={(open) => { if (!open) setSelectedJob(null) }}
      />
    </div>
  )
}
