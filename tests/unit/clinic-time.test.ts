import { describe, it, expect } from 'vitest'
import { validDate, localClock, appointmentInstant } from '@/lib/clinic-time'
import { expenseSchema, websiteSchema, enquirySchema } from '@/lib/parity-validation'
import { effectiveAccess, apiModule } from '@/lib/permissions'
describe('Clinic calendar and validation', () => {
  it('rejects impossible dates and date-times in calendar fields', () => {
    expect(validDate('2026-02-30')).toBe(false)
    expect(validDate('2026-10-25')).toBe(true)
    expect(validDate('2026-10-25T00:00:00Z')).toBe(false)
  })
  it('uses the clinic calendar at UTC date boundaries', () =>
    expect(localClock(new Date('2026-10-24T20:00:00Z'), 'Asia/Kolkata')).toEqual({
      date: '2026-10-25',
      time: '01:30',
    }))
  it('combines split appointment fields in the clinic zone', () =>
    expect(appointmentInstant(new Date('2026-10-25'), '10:30', 'Asia/Kolkata').toISOString()).toBe(
      '2026-10-25T05:00:00.000Z'
    ))
  it('handles daylight-saving zones', () => {
    expect(appointmentInstant('2026-07-01', '10:00', 'America/New_York').toISOString()).toBe(
      '2026-07-01T14:00:00.000Z'
    )
    expect(appointmentInstant('2026-01-01', '10:00', 'America/New_York').toISOString()).toBe(
      '2026-01-01T15:00:00.000Z'
    )
  })
  it('requires positive currency amounts with two decimal places', () => {
    const row = {
      category: 'RENT',
      description: 'Rent',
      amount: 12000,
      expenseDate: '2026-10-25',
      paymentMode: 'UPI',
    }
    expect(expenseSchema.safeParse(row).success).toBe(true)
    for (const amount of [-1, 0, 1.005, Infinity])
      expect(expenseSchema.safeParse({ ...row, amount }).success).toBe(false)
  })
  it('requires publication consent and real gallery media', () => {
    expect(
      websiteSchema.safeParse({ kind: 'GALLERY', title: 'Photo', consent: true }).success
    ).toBe(false)
    expect(
      websiteSchema.safeParse({
        kind: 'REVIEW',
        title: 'Patient',
        rating: 5,
        body: 'Good visit',
        consent: false,
      }).success
    ).toBe(false)
  })
  it('requires contact permission before capturing abandoned enquiries', () => {
    expect(enquirySchema.safeParse({ name: 'Test Patient', phone: '9876543210' }).success).toBe(
      false
    )
  })
})
describe('module permissions', () => {
  it('prevents permissions from escalating the staff role', () =>
    expect(effectiveAccess('RECEPTIONIST', { clinical: true, billing: false })).toMatchObject({
      clinical: false,
      billing: false,
      patients: true,
    }))
  it('protects clinical subroutes and financial writes', () => {
    expect(apiModule('/api/patients/123/documents')).toBe('clinical')
    expect(apiModule('/api/prescriptions/123/pdf')).toBe('clinical')
    expect(apiModule('/api/expenses')).toBe('billing')
    expect(apiModule('/api/staff/doctors')).toBe(null)
  })
})
