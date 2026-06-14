"use client"

import { useState, useEffect, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import {
  MoreHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { AdminUser } from "../datahooks/useUsers"
import {
  useUsers,
  useBanUser,
  useUnbanUser,
} from "../datahooks/useUsers"
import { CreateUserDialog } from "./CreateUserDialog"
import { EditUserDialog } from "./EditUserDialog"
import { SetPasswordDialog } from "./SetPasswordDialog"
import { DeleteUserDialog } from "./DeleteUserDialog"

type DialogType = "edit" | "password" | "delete" | null

const PAGE_SIZE = 10

function formatDate(date: Date | string) {
  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return "-"
  }
}

export function UserManagement() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [searchField, setSearchField] = useState<"email" | "name">("email")
  const [page, setPage] = useState(0)

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [dialogType, setDialogType] = useState<DialogType>(null)

  const banUser = useBanUser()
  const unbanUser = useUnbanUser()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError } = useUsers({
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
    searchValue: debouncedSearch || undefined,
    searchField,
    sortBy: "createdAt",
    sortDirection: "desc",
  })

  const users = data?.users ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function openDialog(type: Exclude<DialogType, null>, user: AdminUser) {
    setSelectedUser(user)
    setDialogType(type)
  }

  function closeDialog() {
    setSelectedUser(null)
    setDialogType(null)
  }

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => {
          const role = row.original.role ?? "user"
          return (
            <Badge variant={role === "admin" ? "default" : "secondary"}>
              {role}
            </Badge>
          )
        },
      },
      {
        accessorKey: "banned",
        header: "Status",
        cell: ({ row }) => {
          const banned = row.original.banned
          return banned ? (
            <Badge variant="destructive">Banned</Badge>
          ) : (
            <Badge variant="outline">Active</Badge>
          )
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const user = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openDialog("edit", user)}>
                  Edit User
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openDialog("password", user)}>
                  Set Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {user.banned ? (
                  <DropdownMenuItem
                    onClick={() => unbanUser.mutate(user.id)}
                    disabled={unbanUser.isPending}
                  >
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Unban User
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => banUser.mutate({ userId: user.id })}
                    disabled={banUser.isPending}
                  >
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Ban User
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => openDialog("delete", user)}
                >
                  Delete User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    [banUser, unbanUser],
  )

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search by ${searchField}…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select
            value={searchField}
            onValueChange={(v) => {
              setSearchField(v as "email" | "name")
              setPage(0)
            }}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CreateUserDialog />
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
                  Failed to load users.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  No users found.
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
            ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total} users`
            : "0 users"}
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

      {selectedUser && (
        <>
          <EditUserDialog
            user={selectedUser}
            open={dialogType === "edit"}
            onOpenChange={(open) => !open && closeDialog()}
          />
          <SetPasswordDialog
            user={selectedUser}
            open={dialogType === "password"}
            onOpenChange={(open) => !open && closeDialog()}
          />
          <DeleteUserDialog
            user={selectedUser}
            open={dialogType === "delete"}
            onOpenChange={(open) => !open && closeDialog()}
          />
        </>
      )}
    </div>
  )
}
