import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { queueWhatsApp } from '@/lib/services/whatsapp.service'
import { z } from 'zod'
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'DOCTOR', 'RECEPTIONIST'])
  if (error || !hospitalId) return error!
  const { id } = await params
  if (!(await prisma.patient.findFirst({ where: { id, hospitalId } })))
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  const preference = await prisma.patientCommunicationPreference.findUnique({
    where: { patientId: id },
  })
  return NextResponse.json({
    whatsappEnabled: preference?.whatsappEnabled || false,
    appointmentReminders: preference?.appointmentReminders ?? true,
  })
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId, user } = await requireAuthAndRole(['ADMIN', 'DOCTOR', 'RECEPTIONIST'])
  if (error || !hospitalId) return error!
  const { id } = await params
  const parsed = z
    .object({
      whatsappEnabled: z.boolean(),
      appointmentReminders: z.boolean(),
      consentConfirmed: z.literal(true),
    })
    .safeParse(await req.json())
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Confirm that the patient agreed to these communication preferences' },
      { status: 400 }
    )
  if (!(await prisma.patient.findFirst({ where: { id, hospitalId } })))
    return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
  const { consentConfirmed, ...data } = parsed.data
  const patient = await prisma.patient.findFirstOrThrow({ where: { id, hospitalId } })
  await prisma.$transaction(async (tx) => {
    await tx.patientCommunicationPreference.upsert({
      where: { patientId: id },
      create: { patientId: id, ...data },
      update: data,
    })
    await tx.auditLog.create({
      data: {
        hospitalId,
        userId: user.id,
        action: 'CONSENT',
        entityType: 'PatientCommunicationPreference',
        entityId: id,
        newValues: JSON.stringify(data),
      },
    })
  })
  if (data.whatsappEnabled)
    await queueWhatsApp({
      hospitalId,
      eventKey: `WELCOME:${id}`,
      event: 'WELCOME',
      patientId: id,
      phone: patient.phone,
      parameters: [
        `${patient.firstName} ${patient.lastName}`.trim(),
        (await prisma.hospital.findUniqueOrThrow({ where: { id: hospitalId } })).name,
        patient.patientId,
      ],
    })
  return NextResponse.json({ success: true })
}
