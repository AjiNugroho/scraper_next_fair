"use client"

import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

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

import type { InstagramTaggedRequestItem, RequestDataItem } from "../datahooks/useInstagramTagged"
import { useInstagramTaggedRequests } from "../datahooks/useInstagramTagged"
import { CreateRequestSheet } from "./CreateRequestSheet"

const PAGE_SIZE = 10

function formatDate(date: string | null) {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function StatusBadge({ status }: { status: string }) {
  if (status === "done")
    return (
      <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
        Done
      </Badge>
    )
  if (status === "processing")
    return (
      <Badge variant="outline" className="border-yellow-500/30 text-yellow-600 bg-yellow-500/5">
        Processing
      </Badge>
    )
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>
  return <Badge variant="outline">Queued</Badge>
}

function ExtrasDialog({
  extras,
  open,
  onOpenChange,
}: {
  extras: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const parsed = useMemo(() => {
    if (!extras) return null
    try {
      return JSON.parse(extras) as Record<string, unknown>
    } catch {
      return null
    }
  }, [extras])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Extras</DialogTitle>
          <DialogDescription>Additional parameters for this request.</DialogDescription>
        </DialogHeader>
        {parsed && Object.keys(parsed).length > 0 ? (
          <div className="rounded-md border divide-y">
            {Object.entries(parsed).map(([key, value]) => (
              <div key={key} className="flex items-start gap-3 px-3 py-2">
                <span className="text-sm font-medium shrink-0 w-28 truncate text-muted-foreground">
                  {key}
                </span>
                <span className="text-sm break-all">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No extras set.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function InstagramTaggedManagement() {
  const [page, setPage] = useState(0)
  const [extrasDialog, setExtrasDialog] = useState<{ open: boolean; extras: string | null }>({
    open: false,
    extras: null,
  })

  const { data, isLoading, isError } = useInstagramTaggedRequests({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const requests = data?.requests ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const columns = useMemo<ColumnDef<InstagramTaggedRequestItem>[]>(
    () => [
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
          try {
            const parsed = JSON.parse(row.original.data) as RequestDataItem[]
            count = parsed.length
          } catch {
            count = 0
          }
          return <span className="text-sm tabular-nums">{count}</span>
        },
      },
      {
        accessorKey: "webhookUrl",
        header: "Webhook",
        cell: ({ row }) =>
          row.original.webhookUrl ? (
            <span
              className="text-sm text-muted-foreground max-w-[180px] truncate block"
              title={row.original.webhookUrl}
            >
              {row.original.webhookUrl}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "extras",
        header: "Extras",
        cell: ({ row }) =>
          row.original.extras ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() =>
                setExtrasDialog({ open: true, extras: row.original.extras })
              }
            >
              View
            </Button>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDate(row.original.createdAt)}
          </span>
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
      <div className="flex justify-end">
        <CreateRequestSheet />
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
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-destructive"
                >
                  Failed to load requests.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No requests yet. Create one to get started.
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
            ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total} requests`
            : "0 requests"}
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

      <ExtrasDialog
        extras={extrasDialog.extras}
        open={extrasDialog.open}
        onOpenChange={(open) =>
          setExtrasDialog((prev) => ({ ...prev, open }))
        }
      />
    </div>
  )
}
