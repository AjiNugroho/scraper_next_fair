"use client"

import { useState, useMemo, useCallback } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table"
import { Trash2, ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react"
import { useDebounce } from "use-debounce"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { TiktokVideoResult } from "../datahooks/useTiktokResults"
import {
  useTiktokResults,
  useDeleteTiktokResult,
  useDeleteTiktokResults,
} from "../datahooks/useTiktokResults"

const PAGE_SIZE = 20

function videoId(url: string) {
  return url.split("/").pop() ?? url
}

function DeleteSingleDialog({
  row,
  open,
  onOpenChange,
}: {
  row: TiktokVideoResult | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [confirm, setConfirm] = useState("")
  const deleteOne = useDeleteTiktokResult()
  const id = row ? videoId(row.videoUrl) : ""

  async function handleDelete() {
    if (!row) return
    await deleteOne.mutateAsync(row.id)
    onOpenChange(false)
    setConfirm("")
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setConfirm("") }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete video URL</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Type the video ID{" "}
            <span className="font-mono font-semibold text-foreground">{id}</span> to confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground break-all">{row?.videoUrl}</p>
          <Input
            placeholder={id}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={confirm !== id || deleteOne.isPending}
            onClick={handleDelete}
          >
            {deleteOne.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteBulkDialog({
  ids,
  open,
  onOpenChange,
}: {
  ids: string[]
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [confirm, setConfirm] = useState("")
  const deleteMany = useDeleteTiktokResults()

  async function handleDelete() {
    await deleteMany.mutateAsync(ids)
    onOpenChange(false)
    setConfirm("")
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setConfirm("") }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {ids.length} video URL{ids.length !== 1 ? "s" : ""}</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Type{" "}
            <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="DELETE"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={confirm !== "DELETE" || deleteMany.isPending}
            onClick={handleDelete}
          >
            {deleteMany.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete {ids.length} item{ids.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ResultsTable({ hashtags }: { hashtags: string[] }) {
  const [page, setPage] = useState(0)
  const [searchInput, setSearchInput] = useState("")
  const [search] = useDebounce(searchInput, 300)
  const [hashtag, setHashtag] = useState("")
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [deleteSingle, setDeleteSingle] = useState<TiktokVideoResult | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  const resetPage = useCallback(() => setPage(0), [])

  const { data, isLoading, isError } = useTiktokResults({
    search,
    hashtag,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const results = data?.results ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k])

  const columns = useMemo<ColumnDef<TiktokVideoResult>[]>(
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
        accessorKey: "workerName",
        header: "Worker",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.workerName}</span>
        ),
      },
      {
        accessorKey: "videoUrl",
        header: "Video URL",
        cell: ({ row }) => (
          <a
            href={row.original.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline-offset-4 hover:underline max-w-xs truncate block"
            title={row.original.videoUrl}
          >
            {row.original.videoUrl}
          </a>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Collected",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {new Date(row.original.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeleteSingle(row.original)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [],
  )

  const table = useReactTable({
    data: results,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
    getRowId: (row) => row.id,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
  })

  function handleHashtagChange(val: string) {
    setHashtag(val === "_all" ? "" : val)
    resetPage()
    setRowSelection({})
  }

  function handleSearchChange(val: string) {
    setSearchInput(val)
    resetPage()
    setRowSelection({})
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-9"
            placeholder="Search by username or video ID…"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchInput && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => handleSearchChange("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={hashtag || "_all"} onValueChange={handleHashtagChange}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue placeholder="All hashtags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All hashtags</SelectItem>
            {hashtags.map((h) => (
              <SelectItem key={h} value={h}>#{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedIds.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setBulkOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete {selectedIds.length} selected
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.column.getSize() }}>
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
                  Failed to load results.
                </TableCell>
              </TableRow>
            ) : results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
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

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total > 0
            ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total} results`
            : "0 results"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => { setPage((p) => p - 1); setRowSelection({}) }}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2">{page + 1} / {Math.max(totalPages, 1)}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => { setPage((p) => p + 1); setRowSelection({}) }}
            disabled={page >= totalPages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DeleteSingleDialog
        row={deleteSingle}
        open={!!deleteSingle}
        onOpenChange={(v) => { if (!v) setDeleteSingle(null) }}
      />
      <DeleteBulkDialog
        ids={selectedIds}
        open={bulkOpen}
        onOpenChange={setBulkOpen}
      />
    </div>
  )
}
