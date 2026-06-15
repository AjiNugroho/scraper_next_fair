"use client"

import { useState } from "react"
import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export type { DateRange }

interface DateRangePickerProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
  placeholder?: string
}

export function DateRangePicker({ value, onChange, placeholder = "Pick a date range" }: DateRangePickerProps) {
  const today = new Date()
  const [month, setMonth] = useState(today)
  const [open, setOpen] = useState(false)

  const presets = [
    { label: "Today", range: { from: today, to: today } },
    { label: "Yesterday", range: { from: subDays(today, 1), to: subDays(today, 1) } },
    { label: "Last 7 days", range: { from: subDays(today, 6), to: today } },
    { label: "Last 30 days", range: { from: subDays(today, 29), to: today } },
    { label: "Month to date", range: { from: startOfMonth(today), to: today } },
    { label: "Last month", range: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) } },
    { label: "Year to date", range: { from: startOfYear(today), to: today } },
    { label: "Last year", range: { from: startOfYear(subYears(today, 1)), to: endOfYear(subYears(today, 1)) } },
  ]

  function formatLabel() {
    if (!value?.from) return placeholder
    if (!value.to || value.from.toDateString() === value.to.toDateString()) {
      return format(value.from, "MMM d, yyyy")
    }
    return `${format(value.from, "MMM d, yyyy")} – ${format(value.to, "MMM d, yyyy")}`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-muted-foreground font-normal">
          <CalendarIcon className="h-4 w-4" />
          {formatLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex max-sm:flex-col">
          <div className="relative py-3 max-sm:order-1 max-sm:border-t sm:w-32">
            <div className="h-full sm:border-e">
              <div className="flex flex-col px-2 gap-0.5">
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    className="w-full justify-start"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      onChange(preset.range)
                      setMonth(preset.range.to)
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <Calendar
            className="p-2"
            mode="range"
            month={month}
            onMonthChange={setMonth}
            selected={value}
            disabled={[{ after: today }]}
            onSelect={(range) => {
              onChange(range)
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}
