"use client"

import { useState } from "react"
import Link from "next/link"
import { useScrapeJobs, type ScrapeJobRun } from "../datahooks/useScrapeJobs"
import { TriggerScrapeJobDialog } from "./TriggerScrapeJobDialog"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { RefreshCw } from "lucide-react"
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table"

const PAGE_SIZE = 20

function StatusBadge({ status }: { status: string }) {
  if (status === "done") return <Badge variant="default">Done</Badge>
  if (status === "running") return <Badge variant="secondary">Running</Badge>
  if (status === "partial") return <Badge variant="outline">Partial</Badge>
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

function HashtagsCell({ hashtags }: { hashtags: string[] | null }) {
  if (hashtags === null) return <Badge variant="outline">All</Badge>
  if (hashtags.length === 0) return <span className="text-muted-foreground">—</span>

  const preview = hashtags.slice(0, 2).join(", #")
  const remaining = hashtags.length - 2

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm">#{preview}</span>
      {remaining > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
              +{remaining} more
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 max-h-64 overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {hashtags.map((h) => (
                <Badge key={h} variant="outline">
                  #{h}
                </Badge>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

function dateRangeLabel(from: string | null, to: string | null) {
  if (!from || !to) return "Since last run"
  return `${formatDate(from)} – ${formatDate(to)}`
}

const columns: ColumnDef<ScrapeJobRun>[] = [
  {
    accessorKey: "startedAt",
    header: "Started At",
    cell: ({ row }) => (
      <Link href={`/tiktok/scrape-jobs/${row.original.id}`} className="hover:underline">
        {formatDate(row.original.startedAt)}
      </Link>
    ),
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
    id: "hashtags",
    header: "Hashtags",
    cell: ({ row }) => <HashtagsCell hashtags={row.original.filterHashtags} />,
  },
  {
    id: "dateRange",
    header: "Date Range",
    cell: ({ row }) => (
      <span className="text-sm whitespace-nowrap">
        {dateRangeLabel(row.original.filterFrom, row.original.filterTo)}
      </span>
    ),
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
          <TriggerScrapeJobDialog />
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
