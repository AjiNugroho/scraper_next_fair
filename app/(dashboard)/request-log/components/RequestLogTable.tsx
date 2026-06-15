"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DateRangePicker } from "@/components/date-range-picker"

import type { RequestLogItem } from "../datahooks/useRequestLog"
import { useRequestLog } from "../datahooks/useRequestLog"

const PAGE_SIZE = 10

function StatusBadge({ status }: { status: string }) {
  if (status === "done")
    return <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">Done</Badge>
  if (status === "processing")
    return <Badge variant="outline" className="border-yellow-500/30 text-yellow-600 bg-yellow-500/5">Processing</Badge>
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>
  return <Badge variant="outline">Queued</Badge>
}

export function RequestLogTable() {
  const [page, setPage] = useState(0)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const dateFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined
  const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined

  const { data, isLoading, isError } = useRequestLog({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    dateFrom,
    dateTo,
  })

  const requests = data?.requests ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function handleDateChange(range: DateRange | undefined) {
    setDateRange(range)
    setPage(0)
  }

  const columns = useMemo<ColumnDef<RequestLogItem>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {format(new Date(row.original.createdAt), "MMM d, yyyy HH:mm")}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "requestor",
        header: "Requestor",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.requestor}</span>
        ),
      },
      {
        id: "items",
        header: "Items",
        cell: ({ row }) => {
          let count = 0
          try { count = (JSON.parse(row.original.data) as unknown[]).length } catch { /* noop */ }
          return <span className="text-sm tabular-nums">{count}</span>
        },
      },
      {
        accessorKey: "webhookUrl",
        header: "Webhook URL",
        cell: ({ row }) =>
          row.original.webhookUrl ? (
            <span className="text-sm text-muted-foreground max-w-[200px] truncate block" title={row.original.webhookUrl}>
              {row.original.webhookUrl}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: requests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <DateRangePicker value={dateRange} onChange={handleDateChange} placeholder="All time" />
        {dateRange && (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => handleDateChange(undefined)}>
            Clear
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                  Failed to load request log.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  No requests found.
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
            ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`
            : "0 results"}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2">{page + 1} / {Math.max(totalPages, 1)}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
