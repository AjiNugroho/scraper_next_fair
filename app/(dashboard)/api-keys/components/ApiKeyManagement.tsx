"use client"

import { useState, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { MoreHorizontal, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import type { ApiKeyItem } from "../datahooks/useApiKeys"
import { useApiKeys } from "../datahooks/useApiKeys"
import { CreateApiKeyDialog } from "./CreateApiKeyDialog"
import { EditApiKeyDialog } from "./EditApiKeyDialog"
import { DeleteApiKeyDialog } from "./DeleteApiKeyDialog"

type DialogType = "edit" | "delete" | null

const PAGE_SIZE = 10

function formatDate(date: Date | string | null) {
  if (!date) return "—"
  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "—"
  }
}

function isExpired(expiresAt: Date | string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

export function ApiKeyManagement() {
  const [page, setPage] = useState(0)
  const [selectedKey, setSelectedKey] = useState<ApiKeyItem | null>(null)
  const [dialogType, setDialogType] = useState<DialogType>(null)

  const { data, isLoading, isError } = useApiKeys({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    sortBy: "createdAt",
    sortDirection: "desc",
  })

  const keys = data?.apiKeys ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function openDialog(type: Exclude<DialogType, null>, key: ApiKeyItem) {
    setSelectedKey(key)
    setDialogType(type)
  }

  function closeDialog() {
    setSelectedKey(null)
    setDialogType(null)
  }

  const columns = useMemo<ColumnDef<ApiKeyItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="font-medium">
              {row.original.name ?? <span className="text-muted-foreground italic">Unnamed</span>}
            </span>
            {row.original.start && (
              <code className="text-xs text-muted-foreground font-mono">
                {row.original.start}…
              </code>
            )}
          </div>
        ),
      },
      {
        accessorKey: "enabled",
        header: "Status",
        cell: ({ row }) => {
          const expired = isExpired(row.original.expiresAt)
          if (expired) return <Badge variant="destructive">Expired</Badge>
          return row.original.enabled === false ? (
            <Badge variant="outline">Disabled</Badge>
          ) : (
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">Active</Badge>
          )
        },
      },
      {
        accessorKey: "expiresAt",
        header: "Expires",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.expiresAt ? formatDate(row.original.expiresAt) : "Never"}
          </span>
        ),
      },
      {
        accessorKey: "lastRequest",
        header: "Last Used",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.lastRequest)}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const key = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openDialog("edit", key)}>
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => openDialog("delete", key)}
                >
                  Revoke Key
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [],
  )

  const table = useReactTable({
    data: keys,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
  })

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CreateApiKeyDialog />
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
                  Failed to load API keys.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  No API keys yet. Generate one to get started.
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
            ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total} keys`
            : "0 keys"}
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
          <span className="px-2">{page + 1} / {Math.max(totalPages, 1)}</span>
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

      {selectedKey && (
        <>
          <EditApiKeyDialog
            apiKey={selectedKey}
            open={dialogType === "edit"}
            onOpenChange={(open) => !open && closeDialog()}
          />
          <DeleteApiKeyDialog
            apiKey={selectedKey}
            open={dialogType === "delete"}
            onOpenChange={(open) => !open && closeDialog()}
          />
        </>
      )}
    </div>
  )
}
