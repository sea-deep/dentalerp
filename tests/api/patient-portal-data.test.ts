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
import { NextRequest, NextResponse } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => import('../__mocks__/prisma'))

vi.mock('@/lib/patient-auth', () => ({
  requirePatientAuth: vi.fn(),
}))

// ── Imports (after mocks) ────────────────────────────────────────────────────

import {
  GET as appointmentsGET,
  POST as appointmentsPOST,
} from '@/app/api/patient-portal/appointments/route'
import { GET as billsGET } from '@/app/api/patient-portal/bills/route'
import { GET as prescriptionsGET } from '@/app/api/patient-portal/prescriptions/route'
import { GET as doctorsGET } from '@/app/api/patient-portal/doctors/route'
import { GET as slotsGET } from '@/app/api/patient-portal/slots/route'
import { requirePatientAuth } from '@/lib/patient-auth'
import { prisma } from '@/lib/prisma'

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockPatientAuth(patient = { id: 'p1', hospitalId: 'h1' }) {
  vi.mocked(requirePatientAuth).mockResolvedValue({ error: null, patient } as any)
}

function mockPatientAuthError() {
  vi.mocked(requirePatientAuth).mockResolvedValue({
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    patient: null,
  } as any)
}

function makeReq(path: string, method = 'GET', body?: any): NextRequest {
  const url = `http://localhost${path}`
  const init: any = { method }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { 'Content-Type': 'application/json' }
  }
  return new NextRequest(url, init)
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. GET/POST /api/patient-portal/appointments
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/patient-portal/appointments', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockPatientAuthError()
    const res = await appointmentsGET(makeReq('/api/patient-portal/appointments'))
    expect(res.status).toBe(401)
  })

  it('returns upcoming appointments by default', async () => {
    mockPatientAuth()
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([
      {
        id: 'a1',
        scheduledDate: new Date('2026-03-01'),
        status: 'SCHEDULED',
        doctor: { firstName: 'Dr', lastName: 'Smith', specialization: 'General' },
      },
    ] as any)
    vi.mocked(prisma.appointment.count).mockResolvedValue(1)

    const res = await appointmentsGET(makeReq('/api/patient-portal/appointments'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.appointments).toHaveLength(1)
    expect(body.pagination.total).toBe(1)
  })

  it('filters by past appointments', async () => {
    mockPatientAuth()
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([])
    vi.mocked(prisma.appointment.count).mockResolvedValue(0)

    await appointmentsGET(makeReq('/api/patient-portal/appointments?filter=past'))

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      })
    )
  })

  it('paginates results', async () => {
    mockPatientAuth()
    vi.mocked(prisma.appointment.findMany).mockResolvedValue([])
    vi.mocked(prisma.appointment.count).mockResolvedValue(25)

    const res = await appointmentsGET(makeReq('/api/patient-portal/appointments?page=2&limit=10'))
    const body = await res.json()

    expect(body.pagination.page).toBe(2)
    expect(body.pagination.totalPages).toBe(3)
  })
})

describe('POST /api/patient-portal/appointments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPatientAuth()
    prisma.hospital.findUnique.mockResolvedValue({
      id: 'h1',
      isActive: true,
      patientPortalEnabled: true,
    })
    prisma.clinicEnquiry.findFirst.mockResolvedValue(null)
    prisma.clinicEnquiry.create.mockResolvedValue({ id: 'request1' })
    slotMocks.assert.mockResolvedValue(undefined)
  })
  it('requires patient authentication', async () => {
    mockPatientAuthError()
    expect(
      (await appointmentsPOST(makeReq('/api/patient-portal/appointments', 'POST', {}))).status
    ).toBe(401)
  })
  it('validates required booking fields', async () => {
    expect(
      (
        await appointmentsPOST(
          makeReq('/api/patient-portal/appointments', 'POST', { doctorId: 'd1' })
        )
      ).status
    ).toBe(400)
  })
  it('creates an approval request instead of an appointment', async () => {
    const response = await appointmentsPOST(
      makeReq('/api/patient-portal/appointments', 'POST', {
        doctorId: 'd1',
        date: '2026-11-01',
        time: '10:00',
      })
    )
    expect(response.status).toBe(201)
    expect(prisma.clinicEnquiry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REQUESTED',
          kind: 'BOOKING',
          verifiedAt: expect.any(Date),
        }),
      })
    )
    expect(prisma.appointment.create).not.toHaveBeenCalled()
  })
})

describe('GET /api/patient-portal/bills', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockPatientAuthError()
    const res = await billsGET(makeReq('/api/patient-portal/bills'))
    expect(res.status).toBe(401)
  })

  it('returns invoices with payments and links', async () => {
    mockPatientAuth()
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([
      {
        id: 'inv1',
        invoiceNo: 'INV001',
        totalAmount: 5000,
        paidAmount: 2000,
        status: 'PARTIALLY_PAID',
        items: [{ description: 'Cleaning', quantity: 1, unitPrice: 5000, amount: 5000 }],
        payments: [
          {
            id: 'pay1',
            paymentNo: 'PAY001',
            amount: 2000,
            paymentMethod: 'CASH',
            paymentDate: new Date(),
            status: 'COMPLETED',
          },
        ],
        paymentLinks: [],
      },
    ] as any)
    vi.mocked(prisma.invoice.count).mockResolvedValue(1)

    const res = await billsGET(makeReq('/api/patient-portal/bills'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.invoices).toHaveLength(1)
    expect(body.invoices[0].items).toHaveLength(1)
    expect(body.invoices[0].payments).toHaveLength(1)
  })

  it('filters by status', async () => {
    mockPatientAuth()
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([])
    vi.mocked(prisma.invoice.count).mockResolvedValue(0)

    await billsGET(makeReq('/api/patient-portal/bills?status=PENDING'))

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PENDING' }),
      })
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 3. GET /api/patient-portal/prescriptions
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/patient-portal/prescriptions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockPatientAuthError()
    const res = await prescriptionsGET(makeReq('/api/patient-portal/prescriptions'))
    expect(res.status).toBe(401)
  })

  it('returns prescriptions with medication details', async () => {
    mockPatientAuth()
    vi.mocked(prisma.prescription.findMany).mockResolvedValue([
      {
        id: 'rx1',
        doctor: { firstName: 'Dr', lastName: 'Smith', specialization: 'General' },
        medications: [
          {
            medication: {
              name: 'Amoxicillin',
              genericName: 'Amoxicillin',
              form: 'Capsule',
              strength: '500mg',
            },
          },
        ],
      },
    ] as any)

    const res = await prescriptionsGET(makeReq('/api/patient-portal/prescriptions'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.prescriptions).toHaveLength(1)
    expect(body.prescriptions[0].medications).toHaveLength(1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 4. GET /api/patient-portal/doctors
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/patient-portal/doctors', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    mockPatientAuthError()
    const res = await doctorsGET(makeReq('/api/patient-portal/doctors'))
    expect(res.status).toBe(401)
  })

  it('returns list of active doctors', async () => {
    mockPatientAuth()
    vi.mocked(prisma.staff.findMany).mockResolvedValue([
      { id: 'd1', firstName: 'Dr', lastName: 'Smith', specialization: 'General' },
      { id: 'd2', firstName: 'Dr', lastName: 'Jones', specialization: 'Ortho' },
    ] as any)

    const res = await doctorsGET(makeReq('/api/patient-portal/doctors'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.doctors).toHaveLength(2)
    expect(prisma.staff.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          user: { role: 'DOCTOR' },
        }),
      })
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 5. GET /api/patient-portal/slots
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/patient-portal/slots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPatientAuth()
    slotMocks.get.mockResolvedValue([{ time: '10:00', available: true }])
  })
  it('requires authentication', async () => {
    mockPatientAuthError()
    expect(
      (await slotsGET(makeReq('/api/patient-portal/slots?doctorId=d1&date=2026-11-01'))).status
    ).toBe(401)
  })
  it('validates doctor and date', async () => {
    expect((await slotsGET(makeReq('/api/patient-portal/slots'))).status).toBe(400)
  })
  it('uses the same clinic rules as public booking', async () => {
    const response = await slotsGET(
      makeReq('/api/patient-portal/slots?doctorId=d1&date=2026-11-01')
    )
    expect(response.status).toBe(200)
    expect(slotMocks.get).toHaveBeenCalledWith(prisma, 'h1', 'd1', '2026-11-01', 30)
  })
})
