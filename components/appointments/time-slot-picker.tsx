'use client'

import { Check, Sparkles } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatTime } from '@/lib/appointment-utils'

export interface TimeSlot {
  time: string
  available: boolean
}

interface TimeSlotPickerProps {
  slots: TimeSlot[]
  value: string
  onChange: (time: string) => void
  className?: string
}

const GROUPS = [
  { label: 'Morning', start: 0, end: 11 },
  { label: 'Afternoon', start: 12, end: 16 },
  { label: 'Evening', start: 17, end: 23 },
]

export function TimeSlotPicker({ slots, value, onChange, className }: TimeSlotPickerProps) {
  const firstAvailable = slots.find((slot) => slot.available)

  return (
    <div className={cn('space-y-3', className)}>
      {firstAvailable && (
        <button
          type="button"
          onClick={() => onChange(firstAvailable.time)}
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-left transition-colors hover:bg-primary/10"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            Next available
          </span>
          <span className="text-sm font-semibold text-primary">
            {formatTime(firstAvailable.time)}
          </span>
        </button>
      )}

      {GROUPS.map((group) => {
        const groupSlots = slots.filter((slot) => {
          const hour = Number(slot.time.slice(0, 2))
          return hour >= group.start && hour <= group.end
        })
        if (groupSlots.length === 0) return null

        return (
          <div key={group.label}>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {groupSlots.map((slot) => {
                const selected = value === slot.time
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => onChange(slot.time)}
                    className={cn(
                      'flex h-9 items-center justify-center gap-1 rounded-md border text-sm font-medium transition-colors',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : slot.available
                          ? 'border-border bg-background hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
                          : 'cursor-not-allowed border-dashed border-border/60 bg-muted/20 text-muted-foreground/40 line-through'
                    )}
                  >
                    {selected && <Check className="h-3.5 w-3.5" />}
                    {formatTime(slot.time)}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
