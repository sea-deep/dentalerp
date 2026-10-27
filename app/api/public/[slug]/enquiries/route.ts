import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enquirySchema, normalizePhone } from '@/lib/parity-validation'
import { createBookingToken } from '@/lib/booking-token'
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const body = await req.json()
    const parsed = enquirySchema.safeParse(body)
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const hospital = await prisma.hospital.findUnique({ where: { slug } })
    if (!hospital?.isActive || !hospital.patientPortalEnabled)
      return NextResponse.json({ error: 'Online enquiries are unavailable' }, { status: 404 })
    const phone = normalizePhone(parsed.data.phone)
    const recent = await prisma.clinicEnquiry.count({
      where: { hospitalId: hospital.id, phone, createdAt: { gt: new Date(Date.now() - 3600000) } },
    })
    if (recent >= 5)
      return NextResponse.json(
        { error: 'Too many requests. Please call the clinic.' },
        { status: 429 }
      )
    const booking = body.kind === 'BOOKING'
    const enquiry = await prisma.clinicEnquiry.create({
      data: {
        hospitalId: hospital.id,
        name: parsed.data.name,
        phone,
        message: parsed.data.message,
        kind: booking ? 'BOOKING' : 'ENQUIRY',
        status: booking ? 'DRAFT' : 'NEW',
      },
    })
    const token = booking ? await createBookingToken(enquiry.id, hospital.id, phone) : undefined
    return NextResponse.json({ success: true, token, id: enquiry.id }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Could not send your enquiry. Please try again.' },
      { status: 500 }
    )
  }
}
