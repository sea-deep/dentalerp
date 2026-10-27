'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { joinDateTimeValue, splitDateTimeValue, toDateInputValue } from '@/lib/date-input'
import { DatePicker, type DatePresetMode } from '@/components/ui/date-picker'
import { TimePicker } from '@/components/ui/time-picker'

export interface DateTimePickerProps {
  value?: string
  onChange?: React.ChangeEventHandler<HTMLInputElement>
  onValueChange?: (value: string) => void
  min?: string
  max?: string
  disabled?: boolean
  className?: string
  id?: string
  name?: string
  required?: boolean
  placeholder?: string
  presetMode?: DatePresetMode
  clearable?: boolean
  align?: 'start' | 'center' | 'end'
}

export function DateTimePicker({
  value,
  onChange,
  onValueChange,
  min,
  max,
  disabled,
  className,
  id,
  name,
  required,
  placeholder,
  presetMode = 'default',
  clearable = false,
  align = 'start',
}: DateTimePickerProps) {
  const { date, time } = splitDateTimeValue(value)

  const emit = (next: string) => {
    onChange?.({
      target: { value: next, name, type: 'datetime-local' },
    } as React.ChangeEvent<HTMLInputElement>)
    onValueChange?.(next)
  }

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row', className)}>
      <DatePicker
        id={id}
        value={date}
        disabled={disabled}
        min={min?.split('T')[0]}
        max={max?.split('T')[0]}
        placeholder={placeholder || 'Pick date'}
        presetMode={presetMode}
        clearable={false}
        align={align}
        className="min-w-0 flex-1"
        onValueChange={(nextDate) => {
          if (!nextDate) {
            emit('')
            return
          }
          emit(joinDateTimeValue(nextDate, time))
        }}
      />
      <TimePicker
        value={time}
        disabled={disabled || !date}
        placeholder="Pick time"
        clearable={false}
        align={align}
        className="min-w-0 flex-1"
        onValueChange={(nextTime) => {
          emit(joinDateTimeValue(date || toDateInputValue(new Date()), nextTime))
        }}
      />
      {name && <input type="hidden" name={name} value={value ?? ''} required={required} />}
      {clearable && value ? (
        <button
          type="button"
          onClick={() => emit('')}
          className="self-center rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Clear
        </button>
      ) : null}
    </div>
  )
}
