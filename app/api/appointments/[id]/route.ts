import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { canReadClinical } from '@/lib/permissions'
import { lockClinic, BookingError } from '@/lib/services/booking.service'
import { validDate, timePattern, minutes } from '@/lib/clinic-time'
import { queueAppointmentMessage } from '@/lib/services/whatsapp.service'
import { handleCancellationWaitlist } from '@/lib/services/smart-scheduler'

// GET - Get single appointment
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId, user } = await requireAuthAndRole()

  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    const appointment = await prisma.appointment.findFirst({
      where: { id, hospitalId },
      include: {
        patient: {
          include: {
            medicalHistory: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true,
            phone: true,
          },
        },
        treatments: {
          include: {
            procedure: true,
          },
        },
        reminders: true,
      },
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    if (!canReadClinical(user))
      Object.assign(appointment, {
        chiefComplaint: null,
        notes: null,
        treatments: [],
        patient: { ...appointment.patient, medicalHistory: null, aiSummary: null },
      })
    return NextResponse.json(appointment)
  } catch (error) {
    console.error('Error fetching appointment:', error)
    return NextResponse.json({ error: 'Failed to fetch appointment' }, { status: 500 })
  }
}

// PUT - Update appointment
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId } = await requireAuthAndRole()

  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const {
      scheduledDate,
      scheduledTime,
      duration,
      chairNumber,
      appointmentType,
      status,
      priority,
      chiefComplaint,
      notes,
      doctorId,
    } = body

    // Check if appointment exists and belongs to this hospital
    const existingAppointment = await prisma.appointment.findFirst({
      where: { id, hospitalId },
    })

    if (!existingAppointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const changedTime =
      (scheduledDate !== undefined &&
        scheduledDate.slice(0, 10) !==
          existingAppointment.scheduledDate.toISOString().slice(0, 10)) ||
      (scheduledTime !== undefined && scheduledTime !== existingAppointment.scheduledTime) ||
      (doctorId !== undefined && doctorId !== existingAppointment.doctorId)
    if (
      changedTime &&
      (typeof body.rescheduleReason !== 'string' || body.rescheduleReason.trim().length < 3)
    )
      return NextResponse.json({ error: 'Record a reason for rescheduling' }, { status: 400 })
    if (
      status === 'CANCELLED' &&
      (typeof body.cancellationReason !== 'string' || body.cancellationReason.trim().length < 3)
    )
      return NextResponse.json({ error: 'Record a reason for cancellation' }, { status: 400 })
    if (scheduledDate !== undefined && !validDate(scheduledDate))
      return NextResponse.json({ error: 'Choose a valid date' }, { status: 400 })
    if (scheduledTime !== undefined && !timePattern.test(scheduledTime))
      return NextResponse.json({ error: 'Choose a valid time' }, { status: 400 })
    if (duration !== undefined && (!Number.isInteger(duration) || duration < 5 || duration > 480))
      return NextResponse.json({ error: 'Duration must be 5–480 minutes' }, { status: 400 })
    if (
      status !== undefined &&
      ![
        'SCHEDULED',
        'CONFIRMED',
        'CHECKED_IN',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'NO_SHOW',
        'RESCHEDULED',
      ].includes(status)
    )
      return NextResponse.json({ error: 'Invalid appointment status' }, { status: 400 })
    const appointment = await prisma.$transaction(async (tx) => {
      await lockClinic(tx, hospitalId)
      const current = await tx.appointment.findFirstOrThrow({ where: { id, hospitalId } })
      const targetDoctor = doctorId ?? current.doctorId
      if (
        !(await tx.staff.findFirst({
          where: {
            id: targetDoctor,
            hospitalId,
            isActive: true,
            user: { role: 'DOCTOR', isActive: true },
          },
        }))
      )
        throw new BookingError('Doctor not found', 404)
      const date = scheduledDate ? new Date(scheduledDate) : current.scheduledDate
      const time = scheduledTime ?? current.scheduledTime
      const length = duration ?? current.duration
      const chair = chairNumber === undefined ? current.chairNumber : chairNumber
      const targetStatus = status ?? current.status
      if (!['CANCELLED', 'NO_SHOW', 'RESCHEDULED'].includes(targetStatus)) {
        const others = await tx.appointment.findMany({
          where: {
            hospitalId,
            id: { not: id },
            scheduledDate: date,
            status: { notIn: ['CANCELLED', 'NO_SHOW', 'RESCHEDULED'] },
            OR: [{ doctorId: targetDoctor }, ...(chair ? [{ chairNumber: chair }] : [])],
          },
        })
        if (
          others.some(
            (a) =>
              minutes(time) < minutes(a.scheduledTime) + a.duration &&
              minutes(time) + length > minutes(a.scheduledTime)
          )
        )
          throw new BookingError('Doctor or chair is already booked during this time', 409)
      }
      return tx.appointment.update({
        where: { id },
        data: {
          scheduledDate: date,
          scheduledTime: time,
          doctorId: targetDoctor,
          duration: length,
          chairNumber: chair,
          ...(appointmentType !== undefined ? { appointmentType } : {}),
          ...(status !== undefined ? { status } : {}),
          ...(priority !== undefined ? { priority } : {}),
          ...(chiefComplaint !== undefined ? { chiefComplaint } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(changedTime ? { rescheduleReason: body.rescheduleReason.trim() } : {}),
          ...(status === 'CANCELLED'
            ? { cancelledAt: new Date(), cancellationReason: body.cancellationReason.trim() }
            : {}),
        },
        include: {
          patient: {
            select: { id: true, patientId: true, firstName: true, lastName: true, phone: true },
          },
          doctor: { select: { id: true, firstName: true, lastName: true } },
        },
      })
    })
    if (changedTime || status === 'CANCELLED') {
      await prisma.appointmentReminder.updateMany({
        where: { appointmentId: id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      })
      await prisma.whatsAppMessage.updateMany({
        where: { hospitalId, eventKey: { contains: `:${id}:` }, status: 'QUEUED' },
        data: { status: 'CANCELLED', error: 'Appointment changed' },
      })
      await queueAppointmentMessage(id, status === 'CANCELLED' ? 'CANCELLED' : 'RESCHEDULED')
    }

    // Smart Scheduler: When appointment is cancelled, notify matching waitlist patients
    if (status === 'CANCELLED' && existingAppointment.status !== 'CANCELLED') {
      try {
        const waitlistResult = await handleCancellationWaitlist({
          hospitalId,
          doctorId: existingAppointment.doctorId,
          scheduledDate: existingAppointment.scheduledDate,
          scheduledTime: existingAppointment.scheduledTime,
          duration: existingAppointment.duration,
        })

        if (waitlistResult.matchedPatients.length > 0) {
          // Return the waitlist notification info alongside the appointment
          return NextResponse.json({
            ...appointment,
            _waitlistNotifications: {
              patientsNotified: waitlistResult.matchedPatients.length,
              patients: waitlistResult.matchedPatients.map((p) => ({
                name: p.patientName,
                phone: p.patientPhone,
              })),
              slotDetails: waitlistResult.slotDetails,
            },
          })
        }
      } catch (err) {
        // Don't fail the cancellation if waitlist notification fails
        console.error('Smart scheduler error:', err)
      }
    }

    return NextResponse.json(appointment)
  } catch (error) {
    console.error('Error updating appointment:', error)
    return NextResponse.json(
      { error: error instanceof BookingError ? error.message : 'Failed to update appointment' },
      { status: error instanceof BookingError ? error.status : 500 }
    )
  }
}

// DELETE - Delete appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, hospitalId } = await requireAuthAndRole()

  if (error || !hospitalId) {
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    // Check if appointment exists and belongs to this hospital
    const appointment = await prisma.appointment.findFirst({
      where: { id, hospitalId },
      include: { treatments: true },
    })

    if (!appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Don't allow deletion if treatments are linked
    if (appointment.treatments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete appointment with linked treatments. Cancel it instead.' },
        { status: 400 }
      )
    }

    // Delete appointment (reminders will cascade)
    await prisma.appointment.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Appointment deleted successfully' })
  } catch (error) {
    console.error('Error deleting appointment:', error)
    return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 })
  }
}
