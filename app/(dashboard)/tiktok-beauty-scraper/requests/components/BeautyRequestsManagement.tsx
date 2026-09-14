"use client"

import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table"
import { useDebounce } from "use-debounce"
import { ChevronLeft, ChevronRight, Loader2, Pencil, Search, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { SubmitJobSheet } from "@/app/(dashboard)/tiktok/jobs/components/SubmitJobSheet"
import { ImportCsvDialog } from "@/app/(dashboard)/tiktok/jobs/components/ImportCsvDialog"
import { EditJobDialog } from "@/app/(dashboard)/tiktok/jobs/components/EditJobDialog"
import { DeleteJobDialog } from "@/app/(dashboard)/tiktok/jobs/components/DeleteJobDialog"
import {
  DeleteBulkDialog,
  ExtrasDialog,
} from "@/app/(dashboard)/tiktok/jobs/components/TiktokJobsManagement"

import type { BeautyRequest } from "../datahooks/useBeautyRequests"
import { useBeautyRequests } from "../datahooks/useBeautyRequests"

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

function parseId(value: string) {
  const n = parseInt(value, 10)
  return Number.isNaN(n) ? undefined : n
}

export function BeautyRequestsManagement() {
  const [page, setPage] = useState(0)
  const [extrasDialog, setExtrasDialog] = useState<{
    open: boolean
    extras: Record<string, unknown> | null
  }>({ open: false, extras: null })
  const [editJob, setEditJob] = useState<BeautyRequest | null>(null)
  const [deleteJob, setDeleteJob] = useState<BeautyRequest | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)

  const [searchInput, setSearchInput] = useState("")
  const [listenGroupInput, setListenGroupInput] = useState("")
  const [requestDataInput, setRequestDataInput] = useState("")
  const [search] = useDebounce(searchInput.trim(), 300)
  const [listenGroupId] = useDebounce(parseId(listenGroupInput), 300)
  const [requestDataId] = useDebounce(parseId(requestDataInput), 300)

  const hasFilters = searchInput !== "" || listenGroupInput !== "" || requestDataInput !== ""

  const { data, isLoading, isError, isFetching } = useBeautyRequests({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    search: search || undefined,
    listenGroupId,
    requestDataId,
  })

  const requests = data?.requests ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k])

  function resetPaging() {
    setPage(0)
    setRowSelection({})
  }

  function clearFilters() {
    setSearchInput("")
    setListenGroupInput("")
    setRequestDataInput("")
    resetPaging()
  }

  const columns = useMemo<ColumnDef<BeautyRequest>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(v: boolean) => table.toggleAllPageRowsSelected(v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v: boolean) => row.toggleSelected(v)}
            aria-label="Select row"
          />
        ),
        size: 40,
      },
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
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setEditJob(row.original)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => setDeleteJob(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
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
    getRowId: (row) => row.id,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search project, hashtag or extras…"
              className="pl-8 pr-8"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                resetPaging()
              }}
            />
            {searchInput && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearchInput("")
                  resetPaging()
                }}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="ListenGroup ID"
            className="w-36"
            value={listenGroupInput}
            onChange={(e) => {
              setListenGroupInput(e.target.value)
              resetPaging()
            }}
          />
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Request Data ID"
            className="w-36"
            value={requestDataInput}
            onChange={(e) => {
              setRequestDataInput(e.target.value)
              resetPaging()
            }}
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
          {isFetching && !isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete {selectedIds.length} selected
            </Button>
          )}
          <ImportCsvDialog />
          <SubmitJobSheet />
        </div>
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
                  Failed to load requests.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-32 text-center text-muted-foreground"
                >
                  {hasFilters ? "No requests match your filters." : "No requests submitted yet."}
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
            onClick={() => {
              setPage((p) => p - 1)
              setRowSelection({})
            }}
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
            onClick={() => {
              setPage((p) => p + 1)
              setRowSelection({})
            }}
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

      <EditJobDialog
        job={editJob}
        open={editJob !== null}
        onOpenChange={(open) => { if (!open) setEditJob(null) }}
      />

      <DeleteJobDialog
        job={deleteJob}
        open={deleteJob !== null}
        onOpenChange={(open) => { if (!open) setDeleteJob(null) }}
      />

      <DeleteBulkDialog
        ids={selectedIds}
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          setBulkDeleteOpen(open)
          if (!open) setRowSelection({})
        }}
      />
    </div>
  )
}
