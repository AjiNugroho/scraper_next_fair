"use client"

import { RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useWorkerStatus, type QueueStatus } from "../datahooks/useWorkerStatus"

function formatRelativeTime(ms: number) {
  const minutes = Math.floor(ms / 60000)
  if (minutes < 1) return "just now"
  if (minutes === 1) return "1 min ago"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`
}

function QueueCard({ queue, label }: { queue: QueueStatus; label: string }) {
  const isActive = queue.consumers !== null && queue.consumers > 0
  const hasError = !!queue.error

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          {hasError ? (
            <Badge variant="destructive">Error</Badge>
          ) : isActive ? (
            <Badge className="bg-primary/15 text-primary border-primary/20">Active</Badge>
          ) : (
            <Badge variant="destructive">Inactive</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground font-mono truncate" title={queue.name}>
          {queue.name}
        </p>
      </CardHeader>
      <CardContent>
        {hasError ? (
          <p className="text-sm text-destructive">{queue.error}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {queue.consumers ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">consumers</p>
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {queue.messages ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">messages queued</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function QueueCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-3 w-48 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-10" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-10" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function WorkerStatusGrid() {
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useWorkerStatus()

  const lastChecked = dataUpdatedAt
    ? formatRelativeTime(Date.now() - dataUpdatedAt)
    : null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Instagram Worker</h2>
          {lastChecked && (
            <p className="text-xs text-muted-foreground mt-0.5">Last checked {lastChecked} · auto-refreshes every hour</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-8 gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QueueCardSkeleton />
          <QueueCardSkeleton />
        </div>
      ) : isError ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-destructive">
            Could not reach RabbitMQ management API.
          </CardContent>
        </Card>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <QueueCard queue={data.queues.request} label="Request Queue" />
          <QueueCard queue={data.queues.response} label="Response Queue" />
        </div>
      ) : null}
    </div>
  )
}
