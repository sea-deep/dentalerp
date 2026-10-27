import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/cron/briefing
 * Scheduled: daily 07:30 IST
 * Generates morning briefings for all active hospitals and notifies ADMIN users.
 * Secured via CRON_SECRET header.
 */
export async function GET(req: Request) {
  const secret = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hospitals = await prisma.hospital.findMany({
    where: { isActive: true, onboardingCompleted: true },
    select: { id: true, name: true },
  })

  const results: { hospitalId: string; status: string }[] = []

  for (const hospital of hospitals) {
    try {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]

      const [appointments, overdueInvoices, lowStock] = await Promise.all([
        prisma.appointment.findMany({
          where: { hospitalId: hospital.id, scheduledDate: new Date(todayStr + 'T00:00:00') },
          select: { id: true },
        }),
        prisma.invoice.findMany({
          where: { hospitalId: hospital.id, status: 'OVERDUE' },
          select: { id: true, balanceAmount: true },
        }),
        prisma.inventoryItem.findMany({
          where: { hospitalId: hospital.id, isActive: true },
          select: { name: true, currentStock: true, minimumStock: true },
        }),
      ])

      const criticalStock = lowStock.filter((i) => i.currentStock <= i.minimumStock)
      const overdueTotal = overdueInvoices.reduce(
        (sum, inv) => sum + Number(inv.balanceAmount || 0),
        0
      )

      const summaryText = `Daily Briefing for ${todayStr}: ${appointments.length} appointment(s) scheduled today. ${overdueInvoices.length} overdue invoice(s) (₹${overdueTotal.toFixed(2)}). ${criticalStock.length} inventory item(s) below reorder threshold.`

      // Notify ADMIN users
      const admins = await prisma.user.findMany({
        where: { hospitalId: hospital.id, role: 'ADMIN', isActive: true },
        select: { id: true },
      })

      await Promise.all(
        admins.map((admin) =>
          prisma.notification.create({
            data: {
              hospitalId: hospital.id,
              userId: admin.id,
              title: `Daily Clinic Briefing – ${todayStr}`,
              message: summaryText,
              type: 'INFO',
              entityType: 'Briefing',
              entityId: todayStr,
            },
          })
        )
      )

      results.push({ hospitalId: hospital.id, status: 'ok' })
    } catch (err) {
      results.push({
        hospitalId: hospital.id,
        status: err instanceof Error ? err.message : 'error',
      })
    }
  }

  return NextResponse.json({ results, processedAt: new Date().toISOString() })
}
