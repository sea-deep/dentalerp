import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getClinicSlots, assertSlot } from '@/lib/services/booking.service'
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
const db: any = {
  hospital: { findUnique: vi.fn() },
  staff: { findFirst: vi.fn() },
  holiday: { findFirst: vi.fn() },
  staffShift: { findUnique: vi.fn() },
  leave: { findFirst: vi.fn() },
  appointment: { findMany: vi.fn() },
  setting: { findMany: vi.fn() },
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-25T03:00:00Z'))
  db.hospital.findUnique.mockResolvedValue({
    id: 'h1',
    isActive: true,
    timezone: 'Asia/Kolkata',
    workingHours: JSON.stringify({
      start: '09:00',
      end: '17:00',
      lunchStart: '13:00',
      lunchEnd: '14:00',
    }),
  })
  db.staff.findFirst.mockResolvedValue({ id: 'd1' })
  db.holiday.findFirst.mockResolvedValue(null)
  db.staffShift.findUnique.mockResolvedValue(null)
  db.leave.findFirst.mockResolvedValue(null)
  db.appointment.findMany.mockResolvedValue([])
  db.setting.findMany.mockResolvedValue([])
})
import { afterEach } from 'vitest'
afterEach(() => vi.useRealTimers())
describe('shared clinic slots', () => {
  it('does not let an appointment run across lunch or closing', async () => {
    const slots = await getClinicSlots(db, 'h1', 'd1', '2026-10-26', 60)
    expect(slots.find((s) => s.time === '12:30')?.available).toBe(false)
    expect(slots.some((s) => s.time === '16:30')).toBe(false)
  })
  it('blocks overlapping durations, not only identical start times', async () => {
    db.appointment.findMany.mockResolvedValue([{ scheduledTime: '10:00', duration: 60 }])
    const slots = await getClinicSlots(db, 'h1', 'd1', '2026-10-26')
    expect(slots.find((s) => s.time === '10:30')?.available).toBe(false)
    expect(slots.find((s) => s.time === '11:00')?.available).toBe(true)
  })
  it('honours disabled shifts, leave and holidays', async () => {
    for (const key of ['staffShift', 'holiday', 'leave']) {
      db[key][key === 'staffShift' ? 'findUnique' : 'findFirst'].mockResolvedValue(
        key === 'staffShift' ? { isActive: false } : {}
      )
      expect(await getClinicSlots(db, 'h1', 'd1', '2026-10-26')).toEqual([])
      db[key][key === 'staffShift' ? 'findUnique' : 'findFirst'].mockResolvedValue(null)
    }
  })
  it('honours clinic rule slot intervals and advance booking limits', async () => {
    db.setting.findMany.mockResolvedValue([
      { key: 'appointments.slotDuration', value: '15' },
      { key: 'appointments.maxAdvanceBookingDays', value: '7' },
    ])
    expect(
      (await getClinicSlots(db, 'h1', 'd1', '2026-10-26')).some((s) => s.time === '09:15')
    ).toBe(true)
    expect(await getClinicSlots(db, 'h1', 'd1', '2026-11-03')).toEqual([])
  })
  it('rejects invalid durations instead of looping indefinitely', async () => {
    await expect(getClinicSlots(db, 'h1', 'd1', '2026-10-26', 0)).rejects.toThrow()
    await expect(getClinicSlots(db, 'h1', 'd1', '2026-10-26', NaN)).rejects.toThrow()
  })
  it('requires a currently available slot at submission', async () => {
    db.appointment.findMany.mockResolvedValue([{ scheduledTime: '10:00', duration: 30 }])
    await expect(assertSlot(db, 'h1', 'd1', '2026-10-26', '10:00')).rejects.toThrow(
      'no longer available'
    )
  })
})
