import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
export async function GET(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'RECEPTIONIST'])
  if (error || !hospitalId) return error!
  try {
    const status = req.nextUrl.searchParams.get('status')
    const enquiries = await prisma.clinicEnquiry.findMany({
      where: { hospitalId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    const counts = await prisma.clinicEnquiry.groupBy({
      by: ['status'],
      where: { hospitalId },
      _count: true,
    })
    const bookings = await prisma.clinicEnquiry.findMany({
      where: { hospitalId, kind: 'BOOKING' },
      select: { status: true, appointmentId: true },
    })
    const appointmentIds = bookings.flatMap((booking) =>
      booking.appointmentId ? [booking.appointmentId] : []
    )
    const visited = appointmentIds.length
      ? await prisma.appointment.count({
          where: { hospitalId, id: { in: appointmentIds }, status: 'COMPLETED' },
        })
      : 0
    const approved = bookings.filter((booking) => booking.status === 'APPROVED').length
    const analytics = {
      started: bookings.length,
      approved,
      visited,
      visitConversion: bookings.length ? Math.round((100 * visited) / bookings.length) : 0,
    }
    return NextResponse.json({ enquiries, counts, analytics })
  } catch {
    return NextResponse.json({ error: 'Could not load enquiries' }, { status: 500 })
  }
}
