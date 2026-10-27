import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readBookingToken } from '@/lib/booking-token'
import { assertSlot, BookingError } from '@/lib/services/booking.service'
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const body = await req.json()
    let payload
    try {
      payload = await readBookingToken(body.token)
    } catch {
      return NextResponse.json(
        { error: 'Verify your phone before requesting an appointment' },
        { status: 401 }
      )
    }
    const hospital = await prisma.hospital.findFirst({
      where: { id: payload.hospitalId, slug, patientPortalEnabled: true, isActive: true },
    })
    if (!hospital) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
    const enquiry = await prisma.clinicEnquiry.findFirst({
      where: {
        id: payload.id,
        hospitalId: hospital.id,
        phone: payload.phone,
        status: 'DRAFT',
        verifiedAt: { not: null },
      },
    })
    if (!enquiry)
      return NextResponse.json(
        { error: 'Phone verification required or request already submitted' },
        { status: 409 }
      )
    if (
      typeof body.doctorId !== 'string' ||
      typeof body.date !== 'string' ||
      typeof body.time !== 'string'
    )
      return NextResponse.json({ error: 'Choose a doctor, date and time' }, { status: 400 })
    await assertSlot(prisma, hospital.id, body.doctorId, body.date, body.time)
    const result = await prisma.clinicEnquiry.updateMany({
      where: { id: enquiry.id, status: 'DRAFT' },
      data: {
        status: 'REQUESTED',
        doctorId: body.doctorId,
        requestedDate: new Date(body.date),
        requestedTime: body.time,
      },
    })
    if (!result.count)
      return NextResponse.json({ error: 'Request already submitted' }, { status: 409 })
    return NextResponse.json(
      {
        success: true,
        requestId: enquiry.id,
        message: 'Request received. The clinic will confirm your appointment.',
      },
      { status: 201 }
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof BookingError ? e.message : 'Could not request appointment' },
      { status: e instanceof BookingError ? e.status : 500 }
    )
  }
}
