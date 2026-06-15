"use client"

import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { TiktokWorker } from "../datahooks/useTiktokWorkers"
import { useTiktokWorkers } from "../datahooks/useTiktokWorkers"
import { CreateWorkerDialog } from "./CreateWorkerDialog"
import { DeleteWorkerDialog } from "./DeleteWorkerDialog"
import { WorkerHashtagsDialog } from "./WorkerHashtagsDialog"

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function TiktokWorkersManagement() {
  const [deleteTarget, setDeleteTarget] = useState<TiktokWorker | null>(null)
  const [hashtagsTarget, setHashtagsTarget] = useState<TiktokWorker | null>(null)

  const { data, isLoading, isError } = useTiktokWorkers()
  const workers = data?.workers ?? []

  const columns = useMemo<ColumnDef<TiktokWorker>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium text-sm">{row.original.name}</span>
        ),
      },
      {
        id: "hashtagCount",
        header: "Hashtags",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs tabular-nums"
            onClick={() => setHashtagsTarget(row.original)}
          >
            {row.original.hashtagCount} assigned
          </Button>
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
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row.original)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: workers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateWorkerDialog />
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
                  Failed to load workers.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  No workers registered. Add one to get started.
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

      <DeleteWorkerDialog
        worker={deleteTarget ?? { id: "", name: "", createdAt: "", hashtagCount: 0 }}
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      />

      <WorkerHashtagsDialog
        worker={hashtagsTarget}
        open={!!hashtagsTarget}
        onOpenChange={(open) => !open && setHashtagsTarget(null)}
      />
    </div>
  )
}
