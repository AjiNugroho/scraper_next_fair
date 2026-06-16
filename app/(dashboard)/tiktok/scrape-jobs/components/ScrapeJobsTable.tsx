"use client"

import { useState } from "react"
import { useScrapeJobs, useTriggerScrapeJob } from "../datahooks/useScrapeJobs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Play, RefreshCw } from "lucide-react"
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table"

type ScrapeJobRun = {
  id: string
  startedAt: string
  completedAt: string | null
  batchesSent: number
  videoUrlsCount: number
  status: string
}

const PAGE_SIZE = 20

function StatusBadge({ status }: { status: string }) {
  if (status === "done") return <Badge variant="default">Done</Badge>
  if (status === "running") return <Badge variant="secondary">Running</Badge>
  return <Badge variant="destructive">Failed</Badge>
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

const columns: ColumnDef<ScrapeJobRun>[] = [
  {
    accessorKey: "startedAt",
    header: "Started At",
    cell: ({ row }) => formatDate(row.original.startedAt),
  },
  {
    accessorKey: "completedAt",
    header: "Completed At",
    cell: ({ row }) => formatDate(row.original.completedAt),
  },
  {
    id: "duration",
    header: "Duration",
    cell: ({ row }) => duration(row.original.startedAt, row.original.completedAt),
  },
  {
    accessorKey: "videoUrlsCount",
    header: "URLs Sent",
  },
  {
    accessorKey: "batchesSent",
    header: "Batches",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
]

export function ScrapeJobsTable() {
  const [page, setPage] = useState(0)
  const { data, isLoading, refetch, isFetching } = useScrapeJobs(page, PAGE_SIZE)
  const trigger = useTriggerScrapeJob()

  const table = useReactTable({
    data: data?.runs ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total} job run(s) total` : ""}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => trigger.mutate()}
            disabled={trigger.isPending}
          >
            <Play className={`h-4 w-4 mr-2 ${trigger.isPending ? "animate-pulse" : ""}`} />
            {trigger.isPending ? "Running…" : "Trigger Now"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground py-8">
                  No job runs yet
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

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
