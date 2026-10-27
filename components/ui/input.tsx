'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { DatePicker, type DatePresetMode } from '@/components/ui/date-picker'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { TimePicker } from '@/components/ui/time-picker'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Controls the quick-pick chips shown by the custom date picker. */
  datePresets?: DatePresetMode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, datePresets, ...props }, ref) => {
    if (type === 'date') {
      return (
        <DatePicker
          className={className}
          presetMode={datePresets ?? 'default'}
          {...(props as React.ComponentProps<typeof DatePicker>)}
        />
      )
    }

    if (type === 'time') {
      return (
        <TimePicker className={className} {...(props as React.ComponentProps<typeof TimePicker>)} />
      )
    }

    if (type === 'datetime-local') {
      return (
        <DateTimePicker
          className={className}
          presetMode={datePresets ?? 'default'}
          {...(props as React.ComponentProps<typeof DateTimePicker>)}
        />
      )
    }

    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
