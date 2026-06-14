import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"

export type AdminUser = {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  createdAt: Date
  updatedAt: Date
  role?: string | null
  banned: boolean | null
  banReason?: string | null
  banExpires?: Date | null
}

const USERS_KEY = ["admin", "users"] as const

export interface ListUsersOptions {
  limit?: number
  offset?: number
  searchValue?: string
  searchField?: "email" | "name"
  sortBy?: string
  sortDirection?: "asc" | "desc"
}

export function useUsers(options: ListUsersOptions = {}) {
  const {
    limit = 10,
    offset = 0,
    searchValue,
    searchField = "email",
    sortBy = "createdAt",
    sortDirection = "desc",
  } = options

  return useQuery({
    queryKey: [...USERS_KEY, { limit, offset, searchValue, searchField, sortBy, sortDirection }],
    queryFn: async () => {
      const { data, error } = await authClient.admin.listUsers({
        query: {
          limit,
          offset,
          ...(searchValue ? { searchValue, searchField } : {}),
          sortBy,
          sortDirection,
        },
      })
      if (error) throw new Error(error.message ?? "Failed to fetch users")
      return data as unknown as { users: AdminUser[]; total: number }
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; email: string; password: string; role: "user" | "admin" }) => {
      const { error } = await authClient.admin.createUser(input)
      if (error) throw new Error(error.message ?? "Failed to create user")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY })
      toast.success("User created successfully")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      userId: string
      data: { name?: string; email?: string; role?: string }
    }) => {
      const { error } = await authClient.admin.updateUser(input)
      if (error) throw new Error(error.message ?? "Failed to update user")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY })
      toast.success("User updated successfully")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await authClient.admin.removeUser({ userId })
      if (error) throw new Error(error.message ?? "Failed to delete user")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY })
      toast.success("User deleted successfully")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useSetPassword() {
  return useMutation({
    mutationFn: async (input: { userId: string; newPassword: string }) => {
      const { error } = await authClient.admin.setUserPassword(input)
      if (error) throw new Error(error.message ?? "Failed to set password")
    },
    onSuccess: () => toast.success("Password updated successfully"),
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useBanUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { userId: string; banReason?: string }) => {
      const { error } = await authClient.admin.banUser(input)
      if (error) throw new Error(error.message ?? "Failed to ban user")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY })
      toast.success("User banned")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUnbanUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await authClient.admin.unbanUser({ userId })
      if (error) throw new Error(error.message ?? "Failed to unban user")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY })
      toast.success("User unbanned")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
