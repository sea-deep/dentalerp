import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClinicSlots, BookingError } from '@/lib/services/booking.service'
import { requireAuthAndRole } from '@/lib/api-helpers'
export async function GET(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole()
  if (error || !hospitalId) return error!
  try {
    const doctorId = req.nextUrl.searchParams.get('doctorId') || ''
    const date = req.nextUrl.searchParams.get('date') || ''
    const duration = Number(req.nextUrl.searchParams.get('duration') || 30)
    if (!doctorId || !date)
      return NextResponse.json({ error: 'Doctor and date are required' }, { status: 400 })
    const slots = await getClinicSlots(prisma, hospitalId, doctorId, date, duration)
    return NextResponse.json({ available: slots.some((s) => s.available), slots, doctorId, date })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof BookingError ? e.message : 'Could not load slots' },
      { status: e instanceof BookingError ? e.status : 500 }
    )
  }
}
