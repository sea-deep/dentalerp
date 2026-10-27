'use client'

import * as React from 'react'
import { Check, ChevronDown, Clock } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatTimeLabel } from '@/lib/date-input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface TimePickerProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'min' | 'max'
> {
  value?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onValueChange?: (value: string) => void
  min?: string | number
  max?: string | number
  placeholder?: string
  clearable?: boolean
  align?: 'start' | 'center' | 'end'
}

const QUICK_SLOTS = (() => {
  const slots: string[] = []
  for (let hour = 8; hour <= 19; hour += 1) {
    slots.push(`${String(hour).padStart(2, '0')}:00`)
    slots.push(`${String(hour).padStart(2, '0')}:30`)
  }
  return slots
})()

const SLOT_GROUPS = [
  { label: 'Morning', start: 8, end: 11 },
  { label: 'Afternoon', start: 12, end: 16 },
  { label: 'Evening', start: 17, end: 19 },
]

const MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))

function parseTimeValue(value?: string) {
  const match = value ? /^(\d{1,2}):(\d{2})/.exec(value) : null
  if (!match) return undefined
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined
  return { hours, minutes }
}

function toTimeValue(hours: number, minutes: number) {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function TimePicker({
  value,
  onChange,
  onValueChange,
  min,
  max,
  placeholder = 'Pick time',
  clearable = false,
  align = 'start',
  className,
  disabled,
  id,
  name,
  required,
  ...rest
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const parsed = parseTimeValue(value)
  const [customHour, setCustomHour] = React.useState(() => (parsed ? parsed.hours % 12 || 12 : 9))
  const [customMinute, setCustomMinute] = React.useState(() =>
    parsed ? String((Math.round(parsed.minutes / 5) * 5) % 60).padStart(2, '0') : '00'
  )
  const [customPeriod, setCustomPeriod] = React.useState<'AM' | 'PM'>(() =>
    parsed ? (parsed.hours >= 12 ? 'PM' : 'AM') : 'AM'
  )

  const emit = (next: string) => {
    onChange?.({
      target: { value: next, name, type: 'time' },
    } as React.ChangeEvent<HTMLInputElement>)
    onValueChange?.(next)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && parsed) {
      setCustomHour(parsed.hours % 12 || 12)
      setCustomMinute(String((Math.round(parsed.minutes / 5) * 5) % 60).padStart(2, '0'))
      setCustomPeriod(parsed.hours >= 12 ? 'PM' : 'AM')
    }
    setOpen(nextOpen)
  }

  const selectTime = (next: string, close = true) => {
    emit(next)
    if (close) setOpen(false)
  }

  const minValue = min ? String(min) : undefined
  const maxValue = max ? String(max) : undefined
  const inRange = (time: string) => {
    if (minValue && time < minValue) return false
    if (maxValue && time > maxValue) return false
    return true
  }

  const applyCustom = (hour: number, minute: string, period: 'AM' | 'PM') => {
    const hours24 = period === 'PM' ? (hour % 12) + 12 : hour % 12
    const next = toTimeValue(hours24, Number(minute))
    selectTime(next, false)
  }

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
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span
            className={cn('min-w-0 flex-1 truncate text-left', !parsed && 'text-muted-foreground')}
          >
            {parsed ? formatTimeLabel(value) : placeholder}
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
        <div className="space-y-3">
          {SLOT_GROUPS.map((group) => {
            const slots = QUICK_SLOTS.filter((slot) => {
              const hour = Number(slot.slice(0, 2))
              return hour >= group.start && hour <= group.end
            })
            return (
              <div key={group.label}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {slots.map((slot) => {
                    const active = slot === value
                    const disabledSlot = !inRange(slot)
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={disabledSlot}
                        onClick={() => selectTime(slot)}
                        className={cn(
                          'relative flex h-8 items-center justify-center rounded-md border text-xs font-medium transition-colors',
                          active
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
                          disabledSlot &&
                            'cursor-not-allowed opacity-30 hover:border-border hover:bg-background hover:text-foreground'
                        )}
                      >
                        {formatTimeLabel(slot)}
                        {active && <Check className="ml-1 h-3 w-3" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <div className="border-t pt-3">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Exact time
            </p>
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Hour"
                value={customHour}
                onChange={(event) => {
                  const hour = Number(event.target.value)
                  setCustomHour(hour)
                  applyCustom(hour, customMinute, customPeriod)
                }}
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
              <span className="text-sm font-semibold text-muted-foreground">:</span>
              <select
                aria-label="Minute"
                value={customMinute}
                onChange={(event) => {
                  const minute = event.target.value
                  setCustomMinute(minute)
                  applyCustom(customHour, minute, customPeriod)
                }}
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {MINUTES.map((minute) => (
                  <option key={minute} value={minute}>
                    {minute}
                  </option>
                ))}
              </select>
              <div className="flex overflow-hidden rounded-md border border-input">
                {(['AM', 'PM'] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => {
                      setCustomPeriod(period)
                      applyCustom(customHour, customMinute, period)
                    }}
                    className={cn(
                      'h-9 px-2.5 text-xs font-semibold transition-colors',
                      customPeriod === period
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-2">
            <button
              type="button"
              onClick={() => {
                const now = new Date()
                selectTime(toTimeValue(now.getHours(), Math.floor(now.getMinutes() / 5) * 5))
              }}
              className="rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            >
              Now
            </button>
            <div className="flex items-center gap-1">
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
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </PopoverContent>

      {name && <input type="hidden" name={name} value={value ?? ''} required={required} />}
    </Popover>
  )
}
