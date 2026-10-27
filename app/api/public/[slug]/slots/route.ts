import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClinicSlots, BookingError } from '@/lib/services/booking.service'
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const hospital = await prisma.hospital.findFirst({
      where: { slug, isActive: true, patientPortalEnabled: true },
    })
    if (!hospital)
      return NextResponse.json({ error: 'Online booking unavailable' }, { status: 404 })
    const hospitalId = hospital.id
    const doctorId = req.nextUrl.searchParams.get('doctorId') || ''
    const date = req.nextUrl.searchParams.get('date') || ''
    const duration = Number(req.nextUrl.searchParams.get('duration') || 30)
    const slots = await getClinicSlots(prisma, hospitalId, doctorId, date, duration)
    return NextResponse.json({ available: slots.some((s) => s.available), slots, doctorId, date })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof BookingError ? e.message : 'Could not load slots' },
      { status: e instanceof BookingError ? e.status : 500 }
    )
  }
}
