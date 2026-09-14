"use client"

import { useState, useMemo, useEffect, type ReactNode } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
  type RowSelectionState,
} from "@tanstack/react-table"
import { Check, ChevronLeft, ChevronRight, Copy, Loader2, Search, Trash2, X } from "lucide-react"
import { useDebounce } from "use-debounce"
import { toast } from "sonner"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import {
  DeleteBulkDialog,
  DeleteSingleDialog,
} from "@/app/(dashboard)/tiktok/results/components/ResultsTable"

import type { BeautyVideo } from "../datahooks/useBeautyVideos"
import { useBeautyVideos } from "../datahooks/useBeautyVideos"

const PAGE_SIZE = 20

function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timeout)
  }, [copied])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success("Video URL copied")
    } catch {
      toast.error("Failed to copy URL")
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={handleCopy}
      aria-label="Copy video URL"
      title="Copy video URL"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

export function BeautyVideosTable({ hashtags }: { hashtags: string[] }) {
  const [page, setPage] = useState(0)
  const [searchInput, setSearchInput] = useState("")
  const [search] = useDebounce(searchInput, 300)
  const [hashtag, setHashtag] = useState("")
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [deleteSingle, setDeleteSingle] = useState<BeautyVideo | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  const { data, isLoading, isError } = useBeautyVideos({
    search,
    hashtag,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const results = data?.results ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k])

  const columns = useMemo<ColumnDef<BeautyVideo>[]>(
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
          <div className="flex items-center gap-1 max-w-sm">
            <a
              href={row.original.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline-offset-4 hover:underline truncate"
              title={row.original.videoUrl}
            >
              {row.original.videoUrl}
            </a>
            <CopyUrlButton url={row.original.videoUrl} />
          </div>
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
    setPage(0)
    setRowSelection({})
  }

  function handleSearchChange(val: string) {
    setSearchInput(val)
    setPage(0)
    setRowSelection({})
  }

  let body: ReactNode
  if (isLoading) {
    body = (
      <TableRow>
        <TableCell colSpan={columns.length} className="h-32 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
        </TableCell>
      </TableRow>
    )
  } else if (isError) {
    body = (
      <TableRow>
        <TableCell colSpan={columns.length} className="h-32 text-center text-destructive">
          Failed to load results.
        </TableCell>
      </TableRow>
    )
  } else if (results.length === 0) {
    body = (
      <TableRow>
        <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
          No results found.
        </TableCell>
      </TableRow>
    )
  } else {
    body = table.getRowModel().rows.map((row) => (
      <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ))
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
          <Button variant="destructive" size="sm" onClick={() => setBulkOpen(true)}>
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
          <TableBody>{body}</TableBody>
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
        onOpenChange={(v) => {
          setBulkOpen(v)
          if (!v) setRowSelection({})
        }}
      />
    </div>
  )
}
