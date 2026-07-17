"use client"

import { useState } from "react"
import { Play, Loader2, ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  useEligibleHashtags,
  usePreviewScrapeJob,
  useTriggerScrapeJob,
  type ScrapeJobTriggerFilters,
} from "../datahooks/useScrapeJobs"

function formatDate(iso: string) {
  return new Date(iso).toLocaleString()
}

export function TriggerScrapeJobDialog() {
  const [open, setOpen] = useState(false)
  const [uncheckedHashtags, setUncheckedHashtags] = useState<Set<string>>(new Set())
  const [customRange, setCustomRange] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>(undefined)
  const [preview, setPreview] = useState<{
    filters: ScrapeJobTriggerFilters
    videoUrlsCount: number
    hashtagsCount: number
    estimatedBatches: number
    from: string
    to: string
  } | null>(null)

  const { data: hashtagsData, isLoading: hashtagsLoading } = useEligibleHashtags()
  const allHashtags = hashtagsData?.hashtags ?? []
  const previewJob = usePreviewScrapeJob()
  const triggerJob = useTriggerScrapeJob()

  function handleClose() {
    setOpen(false)
    setPreview(null)
    setUncheckedHashtags(new Set())
    setCustomRange(false)
    setRange(undefined)
  }

  function toggleAll(checked: boolean) {
    setUncheckedHashtags(checked ? new Set() : new Set(allHashtags))
  }

  function toggleHashtag(hashtag: string, checked: boolean) {
    setUncheckedHashtags((prev) => {
      const next = new Set(prev)
      if (checked) next.delete(hashtag)
      else next.add(hashtag)
      return next
    })
  }

  function buildFilters(): ScrapeJobTriggerFilters {
    const hashtags =
      uncheckedHashtags.size === 0 ? null : allHashtags.filter((h) => !uncheckedHashtags.has(h))
    const from = customRange && range?.from ? range.from.toISOString() : null
    const to = from ? (range?.to ?? new Date()).toISOString() : null
    return { hashtags, from, to }
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

  const checkedCount = allHashtags.length - uncheckedHashtags.size
  const canPreview = allHashtags.length > 0 && checkedCount > 0

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Play className="h-4 w-4" />
          Trigger Now
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0">
        {preview ? (
          <>
            <DialogHeader className="shrink-0 pb-4">
              <DialogTitle>Confirm Scrape Job</DialogTitle>
              <DialogDescription>
                Review what will be sent to Bright Data before running.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 overflow-y-auto pr-1 pb-2">
              <div className="rounded-md border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Video URLs</span>
                  <strong>{preview.videoUrlsCount.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hashtags</span>
                  <strong>{preview.hashtagsCount.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated batches</span>
                  <strong>{preview.estimatedBatches.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Window</span>
                  <strong className="text-right">
                    {formatDate(preview.from)} – {formatDate(preview.to)}
                  </strong>
                </div>
              </div>

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
              <DialogTitle>Trigger Scrape Job</DialogTitle>
              <DialogDescription>
                Choose which hashtags and date range to send to Bright Data.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-6 overflow-y-auto pr-1 pb-2">
              <FieldSet>
                <div className="flex items-center justify-between">
                  <FieldLegend variant="label">
                    Hashtags{" "}
                    <span className="font-normal text-muted-foreground">
                      ({checkedCount}/{allHashtags.length})
                    </span>
                  </FieldLegend>
                  <FieldLabel className="border-none p-0">
                    <Field orientation="horizontal">
                      <Checkbox
                        checked={allHashtags.length > 0 && checkedCount === allHashtags.length}
                        onCheckedChange={(v) => toggleAll(!!v)}
                        disabled={allHashtags.length === 0}
                      />
                      <span className="text-sm text-muted-foreground">Select all</span>
                    </Field>
                  </FieldLabel>
                </div>

                {hashtagsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading hashtags…</p>
                ) : allHashtags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hashtag requests have a webhook configured yet — nothing to trigger.
                  </p>
                ) : (
                  <FieldGroup className="max-h-64 overflow-y-auto rounded-md border p-2 gap-1">
                    {allHashtags.map((hashtag) => (
                      <FieldLabel key={hashtag} className="border-none p-1">
                        <Field orientation="horizontal">
                          <Checkbox
                            checked={!uncheckedHashtags.has(hashtag)}
                            onCheckedChange={(v) => toggleHashtag(hashtag, !!v)}
                          />
                          <span className="text-sm">#{hashtag}</span>
                        </Field>
                      </FieldLabel>
                    ))}
                  </FieldGroup>
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
