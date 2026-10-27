const pad = (value: number) => String(value).padStart(2, '0')

/** Format a Date as the `yyyy-MM-dd` value used by date inputs and APIs. */
export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Parse a `yyyy-MM-dd` string as a local calendar date. */
export function parseDateInputValue(value?: string | null): Date | undefined {
  if (!value) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined
  }
  return date
}

/** Format a time string (`HH:mm`) as `h:mm AM/PM`. */
export function formatTimeLabel(value?: string | null): string {
  if (!value) return ''
  const match = /^(\d{1,2}):(\d{2})/.exec(value)
  if (!match) return value
  const hours = Number(match[1])
  const minutes = Number(match[2])
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${pad(minutes)} ${period}`
}

/** Format a date value as `Mon, 26 Oct 2026`. */
export function formatDateLabel(value?: string | null): string {
  const date = parseDateInputValue(value)
  if (!date) return ''
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Format a date value as `26 Oct 2026`. */
export function formatShortDateLabel(value?: string | null): string {
  const date = parseDateInputValue(value)
  if (!date) return ''
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Split a datetime-local value into date and time parts. */
export function splitDateTimeValue(value?: string | null): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  const [date, time = ''] = value.split('T')
  return { date, time: time.slice(0, 5) }
}

/** Join date and time parts into a datetime-local value. */
export function joinDateTimeValue(date: string, time: string): string {
  if (!date) return ''
  return `${date}T${time || '09:00'}`
}
