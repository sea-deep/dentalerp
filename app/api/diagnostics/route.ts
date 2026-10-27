import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
const schema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  kind: z.enum(['PATHOLOGY', 'RADIOGRAPH']),
  testName: z.string().trim().min(2).max(190),
  instructions: z.string().trim().max(2000).optional(),
})
export async function GET(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'DOCTOR', 'LAB_TECH'])
  if (error || !hospitalId) return error!
  const patientId = req.nextUrl.searchParams.get('patientId')
  const orders = await prisma.diagnosticOrder.findMany({
    where: { hospitalId, ...(patientId ? { patientId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  const patients = await prisma.patient.findMany({
    where: { hospitalId, id: { in: [...new Set(orders.map((o) => o.patientId))] } },
    select: { id: true, firstName: true, lastName: true, patientId: true },
  })
  return NextResponse.json({
    orders: orders.map((o) => ({ ...o, patient: patients.find((p) => p.id === o.patientId) })),
  })
}
export async function POST(req: NextRequest) {
  const { error, hospitalId, user } = await requireAuthAndRole(['ADMIN', 'DOCTOR'])
  if (error || !hospitalId) return error!
  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Choose a patient, doctor, test type and test name' },
        { status: 400 }
      )
    const data = parsed.data
    const [patient, doctor] = await Promise.all([
      prisma.patient.findFirst({ where: { id: data.patientId, hospitalId, isActive: true } }),
      prisma.staff.findFirst({
        where: {
          id: data.doctorId,
          hospitalId,
          isActive: true,
          user: { role: 'DOCTOR', isActive: true },
        },
      }),
    ])
    if (!patient || !doctor)
      return NextResponse.json({ error: 'Patient or doctor not found' }, { status: 404 })
    if (user.role === 'DOCTOR' && user.staffId !== doctor.id)
      return NextResponse.json({ error: 'Choose your own doctor account' }, { status: 403 })
    const order = await prisma.$transaction(async (tx) => {
      const row = await tx.diagnosticOrder.create({ data: { hospitalId, ...data } })
      await tx.auditLog.create({
        data: {
          hospitalId,
          userId: user.id,
          action: 'CREATE',
          entityType: 'DiagnosticOrder',
          entityId: row.id,
          newValues: JSON.stringify(data),
        },
      })
      return row
    })
    return NextResponse.json(order, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Could not create diagnostic order' }, { status: 500 })
  }
}
