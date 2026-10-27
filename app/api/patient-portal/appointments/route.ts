import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { assertSlot, BookingError } from '@/lib/services/booking.service'
import { requirePatientAuth } from '@/lib/patient-auth'

/**
 * GET: List patient's appointments (past + upcoming).
 */
export async function GET(req: NextRequest) {
  const { error, patient } = await requirePatientAuth(req)
  if (error) return error

  try {
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') || 'upcoming' // upcoming | past | all
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const where: Record<string, unknown> = {
      patientId: patient!.id,
      hospitalId: patient!.hospitalId,
    }

    if (filter === 'upcoming') {
      where.scheduledDate = { gte: today }
      where.status = { in: ['SCHEDULED', 'CONFIRMED'] }
    } else if (filter === 'past') {
      where.OR = [
        { scheduledDate: { lt: today } },
        { status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] } },
      ]
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: where as any,
        include: {
          doctor: {
            select: {
              firstName: true,
              lastName: true,
              specialization: true,
            },
          },
        },
        orderBy: { scheduledDate: filter === 'upcoming' ? 'asc' : 'desc' },
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where: where as any }),
    ])

    return NextResponse.json({
      appointments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err: unknown) {
    console.error('Patient appointments error:', err)
    return NextResponse.json({ error: 'Failed to load appointments' }, { status: 500 })
  }
}

/** Patient-authenticated booking requests still require clinic approval. */
export async function POST(req: NextRequest) {
  const { error, patient } = await requirePatientAuth(req)
  if (error || !patient) return error!
  try {
    const { doctorId, date, time, chiefComplaint } = await req.json()
    if (typeof doctorId !== 'string' || typeof date !== 'string' || typeof time !== 'string')
      return NextResponse.json({ error: 'Choose a doctor, date and time' }, { status: 400 })
    const clinic = await prisma.hospital.findUnique({ where: { id: patient.hospitalId } })
    if (!clinic?.patientPortalEnabled || !clinic.isActive)
      return NextResponse.json({ error: 'Online booking is unavailable' }, { status: 403 })
    await assertSlot(prisma, patient.hospitalId, doctorId, date, time)
    const duplicate = await prisma.clinicEnquiry.findFirst({
      where: {
        hospitalId: patient.hospitalId,
        patientId: patient.id,
        status: 'REQUESTED',
        requestedDate: new Date(date),
        requestedTime: time,
      },
    })
    if (duplicate)
      return NextResponse.json({ error: 'You already requested this time' }, { status: 409 })
    const request = await prisma.clinicEnquiry.create({
      data: {
        hospitalId: patient.hospitalId,
        patientId: patient.id,
        name: `${patient.firstName} ${patient.lastName}`.trim(),
        phone: patient.phone,
        kind: 'BOOKING',
        status: 'REQUESTED',
        doctorId,
        requestedDate: new Date(date),
        requestedTime: time,
        verifiedAt: new Date(),
        message: typeof chiefComplaint === 'string' ? chiefComplaint.slice(0, 2000) : null,
      },
    })
    return NextResponse.json(
      { success: true, request, appointment: { appointmentNo: request.id, status: 'REQUESTED' } },
      { status: 201 }
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof BookingError ? e.message : 'Could not request an appointment' },
      { status: e instanceof BookingError ? e.status : 500 }
    )
  }
}
