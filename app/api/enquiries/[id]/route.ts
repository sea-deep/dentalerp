import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { approveBooking, BookingError } from '@/lib/services/booking.service'
import { queueAppointmentMessage } from '@/lib/services/whatsapp.service'
import { validDate, timePattern } from '@/lib/clinic-time'
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId, user } = await requireAuthAndRole(['ADMIN', 'RECEPTIONIST'])
  if (error || !hospitalId) return error!
  try {
    const { id } = await params
    const body = await req.json()
    if (body.action === 'APPROVE' || body.action === 'RESCHEDULE') {
      if (
        body.action === 'RESCHEDULE' &&
        (!validDate(body.date || '') ||
          !timePattern.test(body.time || '') ||
          typeof body.reason !== 'string' ||
          body.reason.trim().length < 3)
      )
        return NextResponse.json(
          { error: 'Choose a date, time and record a reason' },
          { status: 400 }
        )
      const appointment = await approveBooking(
        hospitalId,
        id,
        user.id,
        body.action === 'RESCHEDULE'
          ? { date: body.date, time: body.time, reason: body.reason.trim() }
          : undefined
      )
      await queueAppointmentMessage(appointment.id, 'CONFIRMED')
      return NextResponse.json({ success: true, appointment })
    }
    if (!['CONTACTED', 'CLOSED', 'REJECTED'].includes(body.action))
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    if (
      body.action === 'REJECTED' &&
      (typeof body.reason !== 'string' || body.reason.trim().length < 3)
    )
      return NextResponse.json(
        { error: 'Record a reason for rejecting the request' },
        { status: 400 }
      )
    if (body.followUpAt && isNaN(Date.parse(body.followUpAt)))
      return NextResponse.json({ error: 'Choose a valid follow-up date' }, { status: 400 })
    const changed = await prisma.clinicEnquiry.updateMany({
      where: { id, hospitalId, status: { notIn: ['APPROVED', 'REJECTED', 'CLOSED'] } },
      data: {
        status: body.action,
        reason: typeof body.reason === 'string' ? body.reason.slice(0, 2000) : null,
        followUpAt: body.followUpAt ? new Date(body.followUpAt) : null,
      },
    })
    if (!changed.count)
      return NextResponse.json({ error: 'Open enquiry not found' }, { status: 409 })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof BookingError ? e.message : 'Could not update enquiry' },
      { status: e instanceof BookingError ? e.status : 500 }
    )
  }
}
