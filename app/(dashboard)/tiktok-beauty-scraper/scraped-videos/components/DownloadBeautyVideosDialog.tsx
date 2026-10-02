"use client"

import { useMemo, useState } from "react"
import { endOfDay, format, startOfDay, subDays } from "date-fns"
import { CalendarIcon, Download, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { useDownloadBeautyVideos } from "../datahooks/useDownloadBeautyVideos"

function DatePicker({
  value,
  onChange,
  disabled,
}: {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 font-normal">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          {value ? format(value, "MMM d, yyyy") : <span className="text-muted-foreground">Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          className="p-2"
          mode="single"
          selected={value}
          defaultMonth={value}
          disabled={disabled}
          onSelect={(date) => {
            onChange(date)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export function DownloadBeautyVideosDialog({ hashtags }: { hashtags: string[] }) {
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(() => subDays(new Date(), 6))
  const [endDate, setEndDate] = useState<Date | undefined>(() => new Date())
  const [selected, setSelected] = useState<Set<string>>(() => new Set(hashtags))
  const [search, setSearch] = useState("")

  const download = useDownloadBeautyVideos()

  const visibleHashtags = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/^#/, "")
    return q ? hashtags.filter((h) => h.toLowerCase().includes(q)) : hashtags
  }, [hashtags, search])

  const allVisibleSelected =
    visibleHashtags.length > 0 && visibleHashtags.every((h) => selected.has(h))

  function toggleVisible(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const h of visibleHashtags) {
        if (checked) next.add(h)
        else next.delete(h)
      }
      return next
    })
  }

  function toggleHashtag(h: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(h)
      else next.delete(h)
      return next
    })
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) setSearch("")
  }

  async function handleDownload() {
    if (!startDate || !endDate) return
    await download.mutateAsync({
      from: startOfDay(startDate),
      to: endOfDay(endDate),
      // Every hashtag selected → no filter, so hashtags scraped after page load are included too.
      hashtags: selected.size === hashtags.length ? [] : [...selected],
    })
    handleOpenChange(false)
  }

  const today = new Date()
  const canDownload = !!startDate && !!endDate && startDate <= endDate && selected.size > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col gap-0">
        <DialogHeader className="shrink-0 pb-4">
          <DialogTitle>Download Scraped Videos</DialogTitle>
          <DialogDescription>
            Export collected video URLs as CSV for a date range and selected hashtags.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 overflow-y-auto pr-1 pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field>
              <FieldLabel>Start date</FieldLabel>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                disabled={(d) => d > today || (!!endDate && d > endDate)}
              />
            </Field>
            <Field>
              <FieldLabel>End date</FieldLabel>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                disabled={(d) => d > today || (!!startDate && d < startOfDay(startDate))}
              />
            </Field>
          </div>

          <FieldSet>
            <div className="flex items-center justify-between">
              <FieldLegend variant="label">
                Hashtags{" "}
                <span className="font-normal text-muted-foreground">
                  ({selected.size === hashtags.length ? "all" : `${selected.size}/${hashtags.length}`})
                </span>
              </FieldLegend>
              <FieldLabel className="border-none p-0">
                <Field orientation="horizontal">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(v) => toggleVisible(!!v)}
                    disabled={visibleHashtags.length === 0}
                  />
                  <span className="text-sm text-muted-foreground">
                    {search.trim() ? "Select matching" : "Select all"}
                  </span>
                </Field>
              </FieldLabel>
            </div>

            {hashtags.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hashtags have been scraped yet.</p>
            ) : (
              <>
                <Input
                  placeholder="Search hashtag…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8"
                />
                <FieldGroup className="max-h-60 overflow-y-auto rounded-md border p-2 gap-1">
                  {visibleHashtags.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-1">No hashtags match.</p>
                  ) : (
                    visibleHashtags.map((h) => (
                      <FieldLabel key={h} className="border-none p-1">
                        <Field orientation="horizontal">
                          <Checkbox
                            checked={selected.has(h)}
                            onCheckedChange={(v) => toggleHashtag(h, !!v)}
                          />
                          <span className="text-sm">#{h}</span>
                        </Field>
                      </FieldLabel>
                    ))
                  )}
                </FieldGroup>
              </>
            )}
          </FieldSet>
        </div>

        <div className="flex justify-end gap-2 pt-4 shrink-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={!canDownload || download.isPending}>
            {download.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download CSV
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
