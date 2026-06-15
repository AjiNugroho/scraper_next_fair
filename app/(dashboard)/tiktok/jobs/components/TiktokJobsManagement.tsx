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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { TiktokJobRequest } from "../datahooks/useTiktokJobs"
import { useTiktokJobs } from "../datahooks/useTiktokJobs"
import { SubmitJobSheet } from "./SubmitJobSheet"

const PAGE_SIZE = 20

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function ExtrasDialog({
  extras,
  open,
  onOpenChange,
}: {
  extras: Record<string, unknown> | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Extras</DialogTitle>
          <DialogDescription>Additional parameters for this job submission.</DialogDescription>
        </DialogHeader>
        {extras && Object.keys(extras).length > 0 ? (
          <div className="rounded-md border divide-y">
            {Object.entries(extras).map(([key, value]) => (
              <div key={key} className="flex items-start gap-3 px-3 py-2">
                <span className="text-sm font-medium shrink-0 w-32 truncate text-muted-foreground">
                  {key}
                </span>
                <span className="text-sm break-all">
                  {typeof value === "object" ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No extras.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function TiktokJobsManagement() {
  const [page, setPage] = useState(0)
  const [extrasDialog, setExtrasDialog] = useState<{
    open: boolean
    extras: Record<string, unknown> | null
  }>({ open: false, extras: null })

  const { data, isLoading, isError } = useTiktokJobs({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const requests = data?.requests ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const columns = useMemo<ColumnDef<TiktokJobRequest>[]>(
    () => [
      
      {
        accessorKey: "hashtag",
        header: "Hashtag",
        cell: ({ row }) => (
          <span className="text-sm font-medium">#{row.original.hashtag}</span>
        ),
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
          row.original.extras && Object.keys(row.original.extras).length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setExtrasDialog({ open: true, extras: row.original.extras })}
            >
              View
            </Button>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "listenGroupId",
        header: "ListenGroup ID",
        cell: ({ row }) =>
          row.original.listenGroupId != null ? (
            <span className="text-sm tabular-nums">{row.original.listenGroupId}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "requestDataId",
        header: "Request Data ID",
        cell: ({ row }) =>
          row.original.requestDataId != null ? (
            <span className="text-sm tabular-nums">{row.original.requestDataId}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "createdAt",
        header: "Submitted",
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
        <SubmitJobSheet />
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
                  Failed to load jobs.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No jobs submitted yet.
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
            ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total} submissions`
            : "0 submissions"}
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
        onOpenChange={(open) => setExtrasDialog((prev) => ({ ...prev, open }))}
      />
    </div>
  )
}
