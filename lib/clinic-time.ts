/** Calendar values stay date-only; combine them with a clinic's IANA zone only at the boundary. */
export const datePattern = /^\d{4}-\d{2}-\d{2}$/
export const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
export function validDate(value: string) {
  return (
    datePattern.test(value) &&
    !isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}
export function localClock(now = new Date(), timezone = 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)!.value
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}
export function minutes(time: string) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
export function appointmentInstant(date: Date | string, time: string, timezone: string) {
  const day = typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10)
  let guess = new Date(`${day}T${time}:00Z`)
  for (let i = 0; i < 3; i++) {
    const clock = localClock(guess, timezone)
    const displayed = Date.parse(`${clock.date}T${clock.time}:00Z`)
    guess = new Date(guess.getTime() + Date.parse(`${day}T${time}:00Z`) - displayed)
  }
  return guess
}
