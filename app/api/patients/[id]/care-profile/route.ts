import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'
const schema = z.object({
  assignedDoctorId: z.string().nullable(),
  weightKg: z.number().positive().max(700).nullable(),
  heightCm: z.number().positive().max(300).nullable(),
  systolicBP: z.number().int().min(30).max(350).nullable(),
  diastolicBP: z.number().int().min(10).max(250).nullable(),
  pulse: z.number().int().min(10).max(300).nullable(),
  temperatureC: z.number().min(25).max(45).nullable(),
  pastSurgeries: z.string().trim().max(10000).nullable(),
})
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'DOCTOR'])
  if (error || !hospitalId) return error!
  const { id } = await params
  if (!(await prisma.patient.findFirst({ where: { id, hospitalId } })))
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  return NextResponse.json({
    profile: await prisma.patientCareProfile.findFirst({ where: { hospitalId, patientId: id } }),
  })
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId, user } = await requireAuthAndRole(['ADMIN', 'DOCTOR'])
  if (error || !hospitalId) return error!
  try {
    const { id } = await params,
      parsed = schema.safeParse(await req.json())
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Check the assigned doctor and vital measurements' },
        { status: 400 }
      )
    if (!(await prisma.patient.findFirst({ where: { id, hospitalId } })))
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    if (
      parsed.data.assignedDoctorId &&
      !(await prisma.staff.findFirst({
        where: {
          id: parsed.data.assignedDoctorId,
          hospitalId,
          isActive: true,
          user: { role: 'DOCTOR', isActive: true },
        },
      }))
    )
      return NextResponse.json({ error: 'Assigned doctor not found' }, { status: 400 })
    const profile = await prisma.$transaction(async (tx) => {
      const data = { ...parsed.data, measuredAt: new Date() }
      const row = await tx.patientCareProfile.upsert({
        where: { patientId: id },
        create: { hospitalId, patientId: id, ...data },
        update: data,
      })
      await tx.auditLog.create({
        data: {
          hospitalId,
          userId: user.id,
          action: 'UPDATE',
          entityType: 'PatientCareProfile',
          entityId: row.id,
          newValues: JSON.stringify(data),
        },
      })
      return row
    })
    return NextResponse.json({ profile })
  } catch {
    return NextResponse.json({ error: 'Could not save care profile' }, { status: 500 })
  }
}
