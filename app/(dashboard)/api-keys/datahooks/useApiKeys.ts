import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"

export type ApiKeyItem = {
  id: string
  configId: string
  name: string | null
  start: string | null
  prefix: string | null
  referenceId: string
  refillInterval: number | null
  refillAmount: number | null
  lastRefillAt: Date | null
  enabled: boolean | null
  rateLimitEnabled: boolean | null
  rateLimitTimeWindow: number | null
  rateLimitMax: number | null
  requestCount: number | null
  remaining: number | null
  lastRequest: Date | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
  permissions: string | null
  metadata: string | null
}

const KEYS_KEY = ["api-keys"] as const

export interface ListApiKeysOptions {
  limit?: number
  offset?: number
  sortBy?: string
  sortDirection?: "asc" | "desc"
}

export function useApiKeys(options: ListApiKeysOptions = {}) {
  const { limit = 10, offset = 0, sortBy = "createdAt", sortDirection = "desc" } = options
  return useQuery({
    queryKey: [...KEYS_KEY, { limit, offset, sortBy, sortDirection }],
    queryFn: async () => {
      const { data, error } = await authClient.apiKey.list({
        query: { limit, offset, sortBy, sortDirection },
      })
      if (error) throw new Error(error.message ?? "Failed to fetch API keys")
      return data as unknown as { apiKeys: ApiKeyItem[]; total: number }
    },
  })
}

export function useCreateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name?: string; expiresIn?: number | null; prefix?: string }) => {
      const { data, error } = await authClient.apiKey.create(input)
      if (error) throw new Error(error.message ?? "Failed to create API key")
      return data as { key: string } & ApiKeyItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS_KEY })
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useUpdateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: { keyId: string; name: string }) => {
      const { error } = await authClient.apiKey.update(input)
      if (error) throw new Error(error.message ?? "Failed to update API key")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS_KEY })
      toast.success("API key updated")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await authClient.apiKey.delete({ keyId })
      if (error) throw new Error(error.message ?? "Failed to delete API key")
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEYS_KEY })
      toast.success("API key deleted")
    },
    onError: (error: Error) => toast.error(error.message),
  })
}
