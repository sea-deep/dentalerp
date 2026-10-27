// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/prisma', () => import('../__mocks__/prisma'))

// ── Imports (after mocks) ────────────────────────────────────────────────────

import { GET as publicDoctorsGET } from '@/app/api/public/[slug]/doctors/route'
import { POST as publicBookPOST } from '@/app/api/public/[slug]/book/route'
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
// 1. GET /api/public/[slug]/doctors
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/public/[slug]/doctors', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 404 when clinic not found', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue(null)

    const res = await publicDoctorsGET(
      makeReq('/api/public/nonexistent/doctors'),
      makeParams('nonexistent')
    )
    expect(res.status).toBe(404)
  })

  it('returns 403 when portal not enabled', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({
      id: 'h1',
      name: 'Test Clinic',
      patientPortalEnabled: false,
    } as any)

    const res = await publicDoctorsGET(
      makeReq('/api/public/test-clinic/doctors'),
      makeParams('test-clinic')
    )
    expect(res.status).toBe(403)
  })

  it('returns doctors list with hospital name', async () => {
    vi.mocked(prisma.hospital.findUnique).mockResolvedValue({
      id: 'h1',
      name: 'Smile Dental',
      patientPortalEnabled: true,
    } as any)
    vi.mocked(prisma.staff.findMany).mockResolvedValue([
      { id: 'd1', firstName: 'Dr', lastName: 'Smith', specialization: 'General' },
      { id: 'd2', firstName: 'Dr', lastName: 'Jones', specialization: 'Ortho' },
    ] as any)

    const res = await publicDoctorsGET(
      makeReq('/api/public/smile-dental/doctors'),
      makeParams('smile-dental')
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.doctors).toHaveLength(2)
    expect(body.hospitalName).toBe('Smile Dental')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// 2. POST /api/public/[slug]/book
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/public/[slug]/book', () => {
  it('requires a verified booking token even when a phone number and slot are supplied', async () => {
    const res = await publicBookPOST(
      makeReq('/api/public/test/book', 'POST', {
        phone: '9876543210',
        doctorId: 'd1',
        date: '2026-10-26',
        time: '10:00',
      }),
      makeParams('test')
    )
    expect(res.status).toBe(401)
    expect(prisma.appointment.create).not.toHaveBeenCalled()
  })
})
