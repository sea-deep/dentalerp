'use client'

import * as React from 'react'
import {
  addDays,
  eachDayOfInterval,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isValid,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatShortDateLabel, parseDateInputValue, toDateInputValue } from '@/lib/date-input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type DatePresetMode = 'default' | 'validity' | 'none'

export interface DatePickerProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max'
> {
  value?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onValueChange?: (value: string) => void
  min?: string | number
  max?: string | number
  placeholder?: string
  presetMode?: DatePresetMode
  showPresets?: boolean
  clearable?: boolean
  fromYear?: number
  toYear?: number
  align?: 'start' | 'center' | 'end'
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const PRESET_DAYS: Record<
  Exclude<DatePresetMode, 'none'>,
  Array<{ label: string; days: number }>
> = {
  default: [
    { label: 'Today', days: 0 },
    { label: 'Tomorrow', days: 1 },
    { label: 'In 3 days', days: 3 },
    { label: 'Next week', days: 7 },
  ],
  validity: [
    { label: '5 days', days: 5 },
    { label: '1 week', days: 7 },
    { label: '2 weeks', days: 14 },
    { label: '1 month', days: 30 },
  ],
}

export function DatePicker({
  value,
  onChange,
  onValueChange,
  min,
  max,
  placeholder = 'Pick date',
  presetMode = 'default',
  showPresets = true,
  clearable = false,
  fromYear,
  toYear,
  align = 'start',
  className,
  disabled,
  id,
  name,
  required,
  ...rest
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selectedDate = parseDateInputValue(value)
  const minDate = React.useMemo(() => parseDateInputValue(String(min ?? '')), [min])
  const maxDate = React.useMemo(() => parseDateInputValue(String(max ?? '')), [max])
  const [viewDate, setViewDate] = React.useState<Date>(
    () => selectedDate ?? minDate ?? startOfDay(new Date())
  )

  const emit = (next: string) => {
    onChange?.({
      target: { value: next, name, type: 'date' },
    } as React.ChangeEvent<HTMLInputElement>)
    onValueChange?.(next)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) setViewDate(selectedDate ?? minDate ?? startOfDay(new Date()))
  }

  const isDisabledDate = (date: Date) => {
    if (minDate && isBefore(startOfDay(date), startOfDay(minDate))) return true
    if (maxDate && isAfter(startOfDay(date), startOfDay(maxDate))) return true
    return false
  }

  const selectDate = (date: Date) => {
    if (isDisabledDate(date)) return
    emit(toDateInputValue(date))
    setOpen(false)
  }

  const today = startOfDay(new Date())
  const currentYear = today.getFullYear()
  const firstYear = fromYear ?? (minDate ? minDate.getFullYear() : currentYear - 110)
  const lastYear = toYear ?? (maxDate ? maxDate.getFullYear() : currentYear + 10)
  const years = React.useMemo(
    () =>
      Array.from(
        { length: Math.max(1, lastYear - firstYear + 1) },
        (_, index) => firstYear + index
      ),
    [firstYear, lastYear]
  )

  const monthStart = startOfMonth(viewDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: addDays(gridStart, 41) })

  const presets =
    !showPresets || presetMode === 'none'
      ? []
      : PRESET_DAYS[presetMode]
          .map((preset) => {
            const date = addDays(today, preset.days)
            return { ...preset, date, value: toDateInputValue(date) }
          })
          .filter((preset) => !isDisabledDate(preset.date))

  const setMonth = (month: number) => {
    setViewDate(new Date(viewDate.getFullYear(), month, 1))
  }

  const setYear = (year: number) => {
    setViewDate(new Date(year, viewDate.getMonth(), 1))
  }

  const canGoPrevious = viewDate.getFullYear() > firstYear || viewDate.getMonth() > 0
  const canGoNext = viewDate.getFullYear() < lastYear || viewDate.getMonth() < 11

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-invalid={(rest as Record<string, unknown>)['aria-invalid'] as boolean | undefined}
          aria-describedby={
            (rest as Record<string, unknown>)['aria-describedby'] as string | undefined
          }
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-left',
              !selectedDate && 'text-muted-foreground'
            )}
          >
            {selectedDate ? formatShortDateLabel(value) : placeholder}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        className="max-h-[min(540px,calc(100vh-2rem))] w-[min(336px,calc(100vw-2rem))] overflow-y-auto p-3"
      >
        <div className="mb-3 flex items-center justify-between gap-1">
          <button
            type="button"
            aria-label="Previous month"
            disabled={!canGoPrevious}
            onClick={() => {
              const previous = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
              setViewDate(previous)
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex min-w-0 items-center gap-1">
            <select
              aria-label="Month"
              value={viewDate.getMonth()}
              onChange={(event) => setMonth(Number(event.target.value))}
              className="h-8 max-w-[110px] rounded-md border-0 bg-transparent px-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {Array.from({ length: 12 }, (_, month) => (
                <option key={month} value={month}>
                  {format(new Date(2020, month, 1), 'MMMM')}
                </option>
              ))}
            </select>
            <select
              aria-label="Year"
              value={viewDate.getFullYear()}
              onChange={(event) => setYear(Number(event.target.value))}
              className="h-8 rounded-md border-0 bg-transparent px-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            aria-label="Next month"
            disabled={!canGoNext}
            onClick={() => {
              const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
              setViewDate(next)
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {presets.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5 border-b pb-3">
            {presets.map((preset) => {
              const active = preset.value === value
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => selectDate(preset.date)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
                  )}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        )}

        <div className="grid grid-cols-7 gap-0.5 text-center">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {weekday}
            </div>
          ))}
          {days.map((day) => {
            const selected = selectedDate ? isSameDay(day, selectedDate) : false
            const isToday = isSameDay(day, today)
            const outsideMonth = !isSameMonth(day, viewDate)
            const disabledDay = isDisabledDate(day)
            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={disabledDay}
                aria-label={format(day, 'EEEE, d MMMM yyyy')}
                aria-current={isToday ? 'date' : undefined}
                onClick={() => selectDate(day)}
                className={cn(
                  'relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors',
                  selected
                    ? 'bg-primary font-semibold text-primary-foreground'
                    : outsideMonth
                      ? 'text-muted-foreground/40 hover:bg-accent hover:text-foreground'
                      : 'text-foreground hover:bg-accent',
                  isToday && !selected && 'ring-1 ring-primary/50',
                  disabledDay && 'cursor-not-allowed opacity-25 hover:bg-transparent'
                )}
              >
                {format(day, 'd')}
                {isToday && !selected && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex items-center justify-between border-t pt-2">
          <button
            type="button"
            disabled={isDisabledDate(today)}
            onClick={() => selectDate(today)}
            className="rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Jump to today
          </button>
          {clearable && value ? (
            <button
              type="button"
              onClick={() => {
                emit('')
                setOpen(false)
              }}
              className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Clear
            </button>
          ) : null}
        </div>
      </PopoverContent>

      {name && <input type="hidden" name={name} value={value ?? ''} required={required} />}
    </Popover>
  )
}
