// @ts-nocheck
const slotMocks = vi.hoisted(() => ({ get: vi.fn(), assert: vi.fn() }))
vi.mock('@/lib/services/booking.service', () => ({
  getClinicSlots: slotMocks.get,
  assertSlot: slotMocks.assert,
  lockClinic: vi.fn(),
  BookingError: class extends Error {
    constructor(message, status = 400) {
      super(message)
      this.status = status
    }
  },
}))
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => import('../__mocks__/prisma'))

const { mockGetGateway } = vi.hoisted(() => ({
  mockGetGateway: vi.fn(),
}))

vi.mock('@/lib/payment-gateways', () => ({
  getGateway: mockGetGateway,
}))

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { GET as publicSlotsGET } from '@/app/api/public/[slug]/slots/route'
import { POST as publicOrderPOST } from '@/app/api/payments/public-order/route'
import { POST as publicVerifyPOST } from '@/app/api/payments/public-verify/route'
import { prisma } from '@/lib/prisma'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(path: string, method = 'GET', body?: any): NextRequest {
  const url = `http://localhost${path}`
  const init: any = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(url, init)
}

function makeParams(slug: string) {
  return { params: Promise.resolve({ slug }) }
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET /api/public/[slug]/slots
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/public/[slug]/slots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.hospital.findFirst.mockResolvedValue({
      id: 'h1',
      isActive: true,
      patientPortalEnabled: true,
    })
    slotMocks.get.mockResolvedValue([{ time: '10:00', available: true }])
  })
  it('requires an active clinic with public booking enabled', async () => {
    prisma.hospital.findFirst.mockResolvedValue(null)
    expect(
      (
        await publicSlotsGET(
          makeReq('/api/public/test/slots?doctorId=d1&date=2026-11-01'),
          makeParams('test')
        )
      ).status
    ).toBe(404)
  })
  it('shares staff and portal availability validation', async () => {
    const response = await publicSlotsGET(
      makeReq('/api/public/test/slots?doctorId=d1&date=2026-11-01'),
      makeParams('test')
    )
    expect(response.status).toBe(200)
    expect(slotMocks.get).toHaveBeenCalledWith(prisma, 'h1', 'd1', '2026-11-01', 30)
  })
})

describe('POST /api/payments/public-order', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when token missing', async () => {
    const res = await publicOrderPOST(makeReq('/api/payments/public-order', 'POST', {}))
    expect(res.status).toBe(400)
  })

  it('returns 404 when payment link not found', async () => {
    vi.mocked(prisma.paymentLink.findUnique).mockResolvedValue(null)

    const res = await publicOrderPOST(
      makeReq('/api/payments/public-order', 'POST', { token: 'bad-token' })
    )
    expect(res.status).toBe(404)
  })

  it('returns 400 when link already used', async () => {
    vi.mocked(prisma.paymentLink.findUnique).mockResolvedValue({
      id: 'pl1',
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      invoice: { balanceAmount: 5000 },
    } as any)

    const res = await publicOrderPOST(
      makeReq('/api/payments/public-order', 'POST', { token: 'used-token' })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('already been used')
  })

  it('returns 400 when link expired', async () => {
    vi.mocked(prisma.paymentLink.findUnique).mockResolvedValue({
      id: 'pl1',
      usedAt: null,
      expiresAt: new Date(Date.now() - 86400000), // expired yesterday
      invoice: { balanceAmount: 5000 },
    } as any)

    const res = await publicOrderPOST(
      makeReq('/api/payments/public-order', 'POST', { token: 'expired-token' })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('expired')
  })

  it('returns 400 when invoice already paid', async () => {
    vi.mocked(prisma.paymentLink.findUnique).mockResolvedValue({
      id: 'pl1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      invoice: { balanceAmount: 0 },
    } as any)

    const res = await publicOrderPOST(
      makeReq('/api/payments/public-order', 'POST', { token: 'paid-token' })
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('already paid')
  })

  it('returns 400 when gateway not configured', async () => {
    vi.mocked(prisma.paymentLink.findUnique).mockResolvedValue({
      id: 'pl1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      hospitalId: 'h1',
      invoice: {
        id: 'inv1',
        invoiceNo: 'INV001',
        balanceAmount: 3000,
        patient: { firstName: 'John', lastName: 'Doe', email: 'j@d.com', phone: '1234567890' },
        hospital: { name: 'Clinic' },
      },
    } as any)
    mockGetGateway.mockResolvedValue(null)

    const res = await publicOrderPOST(
      makeReq('/api/payments/public-order', 'POST', { token: 'valid-token' })
    )
    expect(res.status).toBe(400)
  })

  it('creates order successfully', async () => {
    vi.mocked(prisma.paymentLink.findUnique).mockResolvedValue({
      id: 'pl1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 86400000),
      hospitalId: 'h1',
      amount: 3000,
      invoice: {
        id: 'inv1',
        invoiceNo: 'INV001',
        balanceAmount: 3000,
        patient: { firstName: 'John', lastName: 'Doe', email: 'j@d.com', phone: '1234567890' },
        hospital: { name: 'Clinic' },
      },
    } as any)
    mockGetGateway.mockResolvedValue({
      gateway: {
        createOrder: vi.fn().mockResolvedValue({
          orderId: 'order_123',
          provider: 'RAZORPAY',
        }),
        getCheckoutConfig: vi.fn().mockReturnValue({ key: 'rzp_key' }),
      },
      credentials: { provider: 'RAZORPAY' },
    })

    const res = await publicOrderPOST(
      makeReq('/api/payments/public-order', 'POST', { token: 'valid-token', amount: 3000 })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.order.orderId).toBe('order_123')
    expect(body.order.amount).toBe(3000)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 3. POST /api/payments/public-verify
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/payments/public-verify', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 400 when required fields missing', async () => {
    const res = await publicVerifyPOST(
      makeReq('/api/payments/public-verify', 'POST', { token: 'abc' })
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 when payment link not found', async () => {
    vi.mocked(prisma.paymentLink.findUnique).mockResolvedValue(null)

    const res = await publicVerifyPOST(
      makeReq('/api/payments/public-verify', 'POST', {
        token: 'bad',
        orderId: 'o1',
        paymentId: 'p1',
      })
    )
    expect(res.status).toBe(404)
  })

  it('returns 400 when gateway not configured', async () => {
    vi.mocked(prisma.paymentLink.findUnique).mockResolvedValue({
      id: 'pl1',
      hospitalId: 'h1',
      invoice: { id: 'inv1', paidAmount: 0, totalAmount: 5000 },
    } as any)
    mockGetGateway.mockResolvedValue(null)

    const res = await publicVerifyPOST(
      makeReq('/api/payments/public-verify', 'POST', {
        token: 'valid',
        orderId: 'o1',
        paymentId: 'p1',
      })
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when verification fails', async () => {
    vi.mocked(prisma.paymentLink.findUnique).mockResolvedValue({
      id: 'pl1',
      hospitalId: 'h1',
      amount: 5000,
      invoice: { id: 'inv1', paidAmount: 0, totalAmount: 5000 },
    } as any)
    mockGetGateway.mockResolvedValue({
      gateway: { verifyPayment: vi.fn().mockResolvedValue({ verified: false }) },
      credentials: { provider: 'RAZORPAY' },
    })

    const res = await publicVerifyPOST(
      makeReq('/api/payments/public-verify', 'POST', {
        token: 'valid',
        orderId: 'o1',
        paymentId: 'p1',
        signature: 'bad',
      })
    )
    expect(res.status).toBe(400)
  })

  it('verifies payment and creates record with $transaction', async () => {
    vi.mocked(prisma.paymentLink.findUnique).mockResolvedValue({
      id: 'pl1',
      hospitalId: 'h1',
      amount: 5000,
      invoice: { id: 'inv1', paidAmount: 0, totalAmount: 5000 },
    } as any)
    mockGetGateway.mockResolvedValue({
      gateway: {
        verifyPayment: vi.fn().mockResolvedValue({
          verified: true,
          transactionId: 'txn_123',
          amount: 5000,
          status: 'CAPTURED',
        }),
      },
      credentials: { provider: 'RAZORPAY' },
    })
    vi.mocked(prisma.payment.findFirst).mockResolvedValue({ paymentNo: 'PAY00050' } as any)
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}, {}])

    const res = await publicVerifyPOST(
      makeReq('/api/payments/public-verify', 'POST', {
        token: 'valid',
        orderId: 'o1',
        paymentId: 'p1',
        signature: 'good',
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.payment.paymentNo).toBe('PAY00051')
    expect(body.payment.amount).toBe(5000)
    expect(body.payment.transactionId).toBe('txn_123')
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('handles partial payment correctly', async () => {
    vi.mocked(prisma.paymentLink.findUnique).mockResolvedValue({
      id: 'pl1',
      hospitalId: 'h1',
      amount: 3000,
      invoice: { id: 'inv1', paidAmount: 2000, totalAmount: 5000 },
    } as any)
    mockGetGateway.mockResolvedValue({
      gateway: {
        verifyPayment: vi.fn().mockResolvedValue({
          verified: true,
          transactionId: 'txn_456',
          amount: 3000,
          status: 'CAPTURED',
        }),
      },
      credentials: { provider: 'RAZORPAY' },
    })
    vi.mocked(prisma.payment.findFirst).mockResolvedValue(null) // no previous payments
    vi.mocked(prisma.$transaction).mockResolvedValue([{}, {}, {}])

    const res = await publicVerifyPOST(
      makeReq('/api/payments/public-verify', 'POST', {
        token: 'valid',
        orderId: 'o1',
        paymentId: 'p1',
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.payment.paymentNo).toBe('PAY00001') // first payment since findFirst returned null
  })
})
