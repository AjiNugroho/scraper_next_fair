"use client"

import { useMemo, useState } from "react"
import { Play, Loader2, ChevronLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldSet,
  FieldLegend,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { DateRangePicker, type DateRange } from "@/components/date-range-picker"
import {
  useBeautyEligibleRequests,
  usePreviewBeautyDispatch,
  useTriggerBeautyDispatch,
  type BeautyDispatchPreview,
  type BeautyDispatchTriggerFilters,
  type BeautyEligibleRequest,
} from "../datahooks/useBeautyDispatcher"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

function RequestSummary({ request }: { request: BeautyEligibleRequest }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
      <span className="text-sm font-medium">#{request.hashtag}</span>
      <Badge variant="outline" className="font-normal tabular-nums">
        LG {request.listenGroupId ?? "—"}
      </Badge>
      <Badge variant="outline" className="font-normal tabular-nums">
        RD {request.requestDataId ?? "—"}
      </Badge>
    </div>
  )
}

export function TriggerBeautyDispatchDialog() {
  const [open, setOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [customRange, setCustomRange] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>(undefined)
  const [search, setSearch] = useState("")
  const [preview, setPreview] = useState<
    (BeautyDispatchPreview & { filters: BeautyDispatchTriggerFilters }) | null
  >(null)

  const { data, isLoading } = useBeautyEligibleRequests(open)
  const allRequests = useMemo(() => data?.requests ?? [], [data])

  // How many requests share each hashtag — flags where per-request selection matters.
  const hashtagCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of allRequests) counts.set(r.hashtag, (counts.get(r.hashtag) ?? 0) + 1)
    return counts
  }, [allRequests])

  const visibleRequests = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#/, "")
    if (!q) return allRequests
    return allRequests.filter(
      (r) =>
        r.hashtag.toLowerCase().includes(q) ||
        String(r.listenGroupId ?? "").includes(q) ||
        String(r.requestDataId ?? "").includes(q),
    )
  }, [allRequests, search])

  const selectedRequests = useMemo(
    () => allRequests.filter((r) => selectedIds.has(r.id)),
    [allRequests, selectedIds],
  )

  const previewJob = usePreviewBeautyDispatch()
  const triggerJob = useTriggerBeautyDispatch()

  function handleClose() {
    setOpen(false)
    setPreview(null)
    setSelectedIds(new Set())
    setCustomRange(false)
    setRange(undefined)
    setSearch("")
  }

  const allVisibleSelected =
    visibleRequests.length > 0 && visibleRequests.every((r) => selectedIds.has(r.id))

  function toggleVisible(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const r of visibleRequests) {
        if (checked) next.add(r.id)
        else next.delete(r.id)
      }
      return next
    })
  }

  function toggleRequest(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function buildFilters(): BeautyDispatchTriggerFilters {
    // Every request selected → default run (null), which advances the "since last run" cursor.
    const requestIds = selectedRequests.length === allRequests.length ? null : selectedRequests.map((r) => r.id)
    const from = customRange && range?.from ? range.from.toISOString() : null
    const to = from ? (range?.to ?? new Date()).toISOString() : null
    return { requestIds, from, to }
  }

  async function handlePreview() {
    const filters = buildFilters()
    const result = await previewJob.mutateAsync(filters)
    setPreview({ filters, ...result })
  }

  async function handleConfirm() {
    if (!preview) return
    await triggerJob.mutateAsync(preview.filters)
    handleClose()
  }

  const canPreview = selectedRequests.length > 0 && (!customRange || !!range?.from)

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Play className="h-4 w-4" />
          Trigger Now
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col gap-0">
        {preview ? (
          <>
            <DialogHeader className="shrink-0 pb-4">
              <DialogTitle>Confirm Dispatch</DialogTitle>
              <DialogDescription>
                Review what will be sent to Phyllo Scraper before running. Results are delivered
                only to the selected requests.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 overflow-y-auto pr-1 pb-2">
              <div className="rounded-md border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Video URLs</span>
                  <strong>{preview.videoUrlsCount.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Requests</span>
                  <strong>{preview.requestsCount.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unique hashtags</span>
                  <strong>{preview.hashtagsCount.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Window</span>
                  <strong className="text-right">
                    {formatDate(preview.from)} – {formatDate(preview.to)}
                  </strong>
                </div>
              </div>

              {preview.filters.requestIds && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Selected requests</p>
                  <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                    {selectedRequests.map((r) => (
                      <div key={r.id} className="px-3 py-2">
                        <RequestSummary request={r} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.videoUrlsCount === 0 && (
                <p className="text-sm text-muted-foreground">
                  No new video URLs matched — running this will complete immediately with nothing
                  sent.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 shrink-0">
              <Button type="button" variant="outline" onClick={() => setPreview(null)}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={triggerJob.isPending}>
                {triggerJob.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm & Run
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader className="shrink-0 pb-4">
              <DialogTitle>Trigger Video Dispatch</DialogTitle>
              <DialogDescription>
                Choose which scrape requests should receive Phyllo results, and the date range of
                collected videos to send.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-6 overflow-y-auto pr-1 pb-2">
              <FieldSet>
                <div className="flex items-center justify-between">
                  <FieldLegend variant="label">
                    Requests{" "}
                    <span className="font-normal text-muted-foreground">
                      ({selectedRequests.length}/{allRequests.length})
                    </span>
                  </FieldLegend>
                  <FieldLabel className="border-none p-0">
                    <Field orientation="horizontal">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(v) => toggleVisible(!!v)}
                        disabled={visibleRequests.length === 0}
                      />
                      <span className="text-sm text-muted-foreground">
                        {search.trim() ? "Select matching" : "Select all"}
                      </span>
                    </Field>
                  </FieldLabel>
                </div>

                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading requests…</p>
                ) : allRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No scrape requests have a webhook configured yet — nothing to trigger.
                  </p>
                ) : (
                  <>
                    <Input
                      placeholder="Search hashtag, ListenGroup ID or Request Data ID…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8"
                    />
                    <FieldGroup className="max-h-72 overflow-y-auto rounded-md border p-2 gap-1">
                      {visibleRequests.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-1">No requests match.</p>
                      ) : (
                        visibleRequests.map((request) => {
                          const shared = hashtagCounts.get(request.hashtag) ?? 0
                          return (
                            <FieldLabel key={request.id} className="border-none p-1">
                              <Field orientation="horizontal" className="items-start">
                                <Checkbox
                                  className="mt-0.5"
                                  checked={selectedIds.has(request.id)}
                                  onCheckedChange={(v) => toggleRequest(request.id, !!v)}
                                />
                                <div className="flex flex-col gap-0.5 min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <RequestSummary request={request} />
                                    {shared > 1 && (
                                      <Badge variant="secondary" className="font-normal">
                                        hashtag in {shared} requests
                                      </Badge>
                                    )}
                                  </div>
                                  <span
                                    className="text-xs text-muted-foreground truncate"
                                    title={request.webhookUrl}
                                  >
                                    {request.webhookUrl}
                                  </span>
                                </div>
                              </Field>
                            </FieldLabel>
                          )
                        })
                      )}
                    </FieldGroup>
                  </>
                )}
              </FieldSet>

              <FieldSet>
                <FieldLabel className="border-none p-0">
                  <Field orientation="horizontal">
                    <Checkbox checked={customRange} onCheckedChange={(v) => setCustomRange(!!v)} />
                    <span className="text-sm">Use a custom date range</span>
                  </Field>
                </FieldLabel>
                {customRange ? (
                  <DateRangePicker value={range} onChange={setRange} />
                ) : (
                  <FieldDescription>Since the last successful run, up to now.</FieldDescription>
                )}
              </FieldSet>
            </div>

            <div className="flex justify-end gap-2 pt-4 shrink-0">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handlePreview} disabled={!canPreview || previewJob.isPending}>
                {previewJob.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Preview
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
