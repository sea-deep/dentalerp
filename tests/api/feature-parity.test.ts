import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
const mock = vi.hoisted(() => ({
  auth: vi.fn(),
  expense: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  auditLog: { create: vi.fn() },
  hospital: { findFirst: vi.fn() },
  enquiry: { findFirst: vi.fn(), updateMany: vi.fn() },
  token: vi.fn(),
  slot: vi.fn(),
  dispatch: vi.fn(),
  automation: vi.fn(),
}))
vi.mock('@/lib/api-helpers', () => ({ requireAuthAndRole: mock.auth }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    expense: mock.expense,
    auditLog: mock.auditLog,
    hospital: mock.hospital,
    clinicEnquiry: mock.enquiry,
    $transaction: async (fn: any) => fn({ expense: mock.expense, auditLog: mock.auditLog }),
  },
}))
vi.mock('@/lib/booking-token', () => ({ readBookingToken: mock.token }))
vi.mock('@/lib/services/booking.service', () => ({
  assertSlot: mock.slot,
  BookingError: class extends Error {
    status = 409
  },
}))
vi.mock('@/lib/services/whatsapp.service', () => ({
  dispatchWhatsApp: mock.dispatch,
  processAppointmentAutomation: mock.automation,
}))
import { POST as expensePOST, GET as expenseGET } from '@/app/api/expenses/route'
import { PATCH as expensePATCH } from '@/app/api/expenses/[id]/route'
import { POST as bookPOST } from '@/app/api/public/[slug]/book/route'
import { GET as cronGET } from '@/app/api/cron/reminders/route'
function req(path: string, method = 'GET', body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    ...(body
      ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }
      : {}),
  })
}
beforeEach(() => {
  vi.resetAllMocks()
  mock.auth.mockResolvedValue({ error: null, hospitalId: 'h1', user: { id: 'u1', role: 'ADMIN' } })
})
describe('parity API boundaries', () => {
  it('enforces role checks for expenses', async () => {
    mock.auth.mockResolvedValue({
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    })
    expect((await expenseGET(req('/api/expenses'))).status).toBe(403)
    expect(mock.expense.findMany).not.toHaveBeenCalled()
  })
  it('rejects invalid expenses before writing', async () => {
    expect((await expensePOST(req('/api/expenses', 'POST', { amount: -1 }))).status).toBe(400)
    expect(mock.expense.create).not.toHaveBeenCalled()
  })
  it('scopes an expense write and audit entry to the authenticated clinic', async () => {
    mock.expense.create.mockResolvedValue({ id: 'e1' })
    const response = await expensePOST(
      req('/api/expenses', 'POST', {
        hospitalId: 'other',
        category: 'RENT',
        description: 'Clinic rent',
        amount: 5000,
        expenseDate: '2026-10-25',
        paymentMode: 'UPI',
      })
    )
    expect(response.status).toBe(201)
    expect(mock.expense.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ hospitalId: 'h1', createdBy: 'u1' }),
      })
    )
    expect(mock.auditLog.create).toHaveBeenCalled()
  })
  it('does not permit cross-clinic voiding', async () => {
    mock.expense.updateMany.mockResolvedValue({ count: 0 })
    const response = await expensePATCH(
      req('/api/expenses/e1', 'PATCH', { reason: 'Entered twice' }),
      { params: Promise.resolve({ id: 'e1' }) }
    )
    expect(response.status).toBe(409)
    expect(mock.expense.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'e1', hospitalId: 'h1', voidedAt: null } })
    )
  })
  it('rejects a bare phone number as booking authentication', async () => {
    mock.token.mockRejectedValue(new Error())
    expect(
      (
        await bookPOST(req('/api/public/clinic/book', 'POST', { phone: '9876543210' }), {
          params: Promise.resolve({ slug: 'clinic' }),
        })
      ).status
    ).toBe(401)
    expect(mock.enquiry.updateMany).not.toHaveBeenCalled()
  })
  it('submits verified bookings to approval instead of creating appointments', async () => {
    mock.token.mockResolvedValue({ id: 'lead1', hospitalId: 'h1', phone: '9876543210' })
    mock.hospital.findFirst.mockResolvedValue({ id: 'h1' })
    mock.enquiry.findFirst.mockResolvedValue({ id: 'lead1' })
    mock.enquiry.updateMany.mockResolvedValue({ count: 1 })
    const response = await bookPOST(
      req('/api/public/clinic/book', 'POST', {
        token: 'verified',
        doctorId: 'd1',
        date: '2026-10-26',
        time: '10:00',
      }),
      { params: Promise.resolve({ slug: 'clinic' }) }
    )
    expect(response.status).toBe(201)
    expect(mock.enquiry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'REQUESTED' }) })
    )
    expect(mock.slot).toHaveBeenCalled()
  })
  it('protects the cron worker and dispatches only after authorization', async () => {
    expect((await cronGET(req('/api/cron/reminders'))).status).toBe(401)
    expect(mock.dispatch).not.toHaveBeenCalled()
    mock.automation.mockResolvedValue({ noShows: 0 })
    mock.dispatch.mockResolvedValue({ sent: 2 })
    expect(
      (
        await cronGET(
          new Request('http://localhost/api/cron/reminders', {
            headers: { Authorization: 'Bearer test-cron-secret' },
          })
        )
      ).status
    ).toBe(200)
    expect(mock.dispatch).toHaveBeenCalledOnce()
  })
})
