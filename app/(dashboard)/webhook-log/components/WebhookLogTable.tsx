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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { DateRangePicker } from "@/components/date-range-picker"

import type { WebhookLogItem } from "../datahooks/useWebhookLog"
import { useWebhookLog } from "../datahooks/useWebhookLog"

const PAGE_SIZE = 10

function StatusCodeBadge({ code }: { code: number | null }) {
  if (code === null) return <span className="text-muted-foreground">—</span>
  if (code >= 200 && code < 300)
    return <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 tabular-nums">{code}</Badge>
  if (code >= 400)
    return <Badge variant="destructive" className="tabular-nums">{code}</Badge>
  return <Badge variant="outline" className="tabular-nums">{code}</Badge>
}

function PlatformBadge({ platform }: { platform: string }) {
  return <Badge variant="outline" className="capitalize">{platform}</Badge>
}

export function WebhookLogTable() {
  const [page, setPage] = useState(0)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [responseDialog, setResponseDialog] = useState<{ open: boolean; body: string | null; error: string | null }>({
    open: false, body: null, error: null,
  })

  const dateFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined
  const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined

  const { data, isLoading, isError } = useWebhookLog({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    dateFrom,
    dateTo,
  })

  const logs = data?.logs ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function handleDateChange(range: DateRange | undefined) {
    setDateRange(range)
    setPage(0)
  }

  const columns = useMemo<ColumnDef<WebhookLogItem>[]>(
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
        accessorKey: "platform",
        header: "Platform",
        cell: ({ row }) => <PlatformBadge platform={row.original.platform} />,
      },
      {
        accessorKey: "accountName",
        header: "Account",
        cell: ({ row }) => (
          <span className="text-sm font-medium">{row.original.accountName ?? "—"}</span>
        ),
      },
      {
        id: "counts",
        header: "Posts",
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {row.original.validCount}
            <span className="text-muted-foreground">/{row.original.totalCount}</span>
          </span>
        ),
      },
      {
        accessorKey: "statusCode",
        header: "Status",
        cell: ({ row }) => <StatusCodeBadge code={row.original.statusCode} />,
      },
      {
        accessorKey: "clientWebhook",
        header: "Client Webhook",
        cell: ({ row }) =>
          row.original.clientWebhook ? (
            <span className="text-sm text-muted-foreground max-w-[180px] truncate block" title={row.original.clientWebhook}>
              {row.original.clientWebhook}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "details",
        header: "Details",
        cell: ({ row }) => {
          const hasDetails = row.original.responseBody || row.original.errorMessage
          return hasDetails ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() =>
                setResponseDialog({
                  open: true,
                  body: row.original.responseBody,
                  error: row.original.errorMessage,
                })
              }
            >
              View
            </Button>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        },
      },
    ],
    [],
  )

  const table = useReactTable({
    data: logs,
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
                  Failed to load webhook log.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  No webhook deliveries found.
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

      <Dialog open={responseDialog.open} onOpenChange={(open) => setResponseDialog((p) => ({ ...p, open }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delivery Details</DialogTitle>
            <DialogDescription>Response from the client webhook endpoint.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {responseDialog.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-xs font-medium text-destructive mb-1">Error</p>
                <p className="text-sm break-all">{responseDialog.error}</p>
              </div>
            )}
            {responseDialog.body && (
              <div className="rounded-md border bg-muted/50 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Response Body</p>
                <pre className="text-xs break-all whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {responseDialog.body}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
