import { describe, it, expect, vi, beforeEach } from 'vitest'
import prisma from '@/tests/__mocks__/prisma'

const mockAuth = vi.hoisted(() => ({
  requireAuthAndRole: vi.fn(),
}))

vi.mock('@/lib/api-helpers', () => mockAuth)
vi.mock('@/lib/prisma', () => ({ prisma, default: prisma }))

const mod = await import('@/app/api/data-import/ai-mapping/route')

function makeRequest(body: any) {
  return new Request('http://localhost/api/data-import/ai-mapping', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  }) as any
}

describe('POST /api/data-import/ai-mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.requireAuthAndRole.mockResolvedValue({
      error: null,
      hospitalId: 'hospital-1',
      session: { user: { id: 'user-1', role: 'ADMIN' } },
    })
  })

  it('returns rule-based column mapping', async () => {
    ;(prisma.dataImportJob.findFirst as any).mockResolvedValue({
      id: 'job-1',
      hospitalId: 'hospital-1',
      entityType: 'patients',
      sourceColumns: ['Mobile', 'DOB'],
      previewData: [{ Mobile: '9876543210', DOB: '1990-01-15' }],
    })
    ;(prisma.dataImportJob.update as any).mockResolvedValue({})

    const res = await mod.POST(makeRequest({ jobId: 'job-1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mapping.Mobile).toBe('phone')
    expect(body.mapping.DOB).toBe('dateOfBirth')
    expect(body.confidence.Mobile).toBe(0.9)
    expect(prisma.dataImportJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'MAPPED' }),
      })
    )
  })

  it('maps unmatched columns to null', async () => {
    ;(prisma.dataImportJob.findFirst as any).mockResolvedValue({
      id: 'job-1',
      hospitalId: 'hospital-1',
      entityType: 'patients',
      sourceColumns: ['UnknownCol1', 'UnknownCol2'],
      previewData: [{ UnknownCol1: 'a', UnknownCol2: 'b' }],
    })
    ;(prisma.dataImportJob.update as any).mockResolvedValue({})

    const res = await mod.POST(makeRequest({ jobId: 'job-1' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mapping.UnknownCol1).toBeNull()
    expect(body.mapping.UnknownCol2).toBeNull()
    expect(body.unmappedRequired).toBeDefined()
  })

  it('returns 400 when jobId is missing', async () => {
    const res = await mod.POST(makeRequest({}))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('jobId')
  })

  it('returns 404 when job not found', async () => {
    ;(prisma.dataImportJob.findFirst as any).mockResolvedValue(null)

    const res = await mod.POST(makeRequest({ jobId: 'nonexistent' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 for non-ADMIN users', async () => {
    mockAuth.requireAuthAndRole.mockResolvedValue({
      error: Response.json({ error: 'Forbidden' }, { status: 403 }),
      hospitalId: null,
    })
    const res = await mod.POST(makeRequest({ jobId: 'job-1' }))
    expect(res.status).toBe(403)
  })
})
