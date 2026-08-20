"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  useTokopediaPhylloBatches,
  type TokopediaPhylloBatch,
} from "../datahooks/useTokopediaPhylloBatches"
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
import { RefreshCw, Trash2 } from "lucide-react"
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table"
import { DeleteBatchDialog } from "./DeleteBatchDialog"

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

export function PhylloBatchesTable() {
  const router = useRouter()
  const [page, setPage] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<TokopediaPhylloBatch | null>(null)
  const { data, isLoading, refetch, isFetching } = useTokopediaPhylloBatches(page, PAGE_SIZE)

  const columns = useMemo<ColumnDef<TokopediaPhylloBatch>[]>(
    () => [
      {
        accessorKey: "batchDate",
        header: "Batch Date",
        cell: ({ row }) => <span className="font-medium">{row.original.batchDate}</span>,
      },
      {
        accessorKey: "videoUrlsCount",
        header: "URLs",
      },
      {
        accessorKey: "itemsSent",
        header: "Sent",
      },
      {
        accessorKey: "updatedAt",
        header: "Last Updated",
        cell: ({ row }) => formatDate(row.original.updatedAt),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteTarget(row.original)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: data?.batches ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.total} batch(es) total` : ""}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
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
                  No batches yet
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/tokopedia-project/phyllo-batches/${row.original.id}`)}
                >
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

      {deleteTarget && (
        <DeleteBatchDialog
          batch={deleteTarget}
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
