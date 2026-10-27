import { NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
export async function GET() {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'RECEPTIONIST'])
  if (error || !hospitalId) return error!
  const messages = await prisma.whatsAppMessage.findMany({
    where: { hospitalId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      event: true,
      phone: true,
      status: true,
      attempts: true,
      error: true,
      sentAt: true,
      createdAt: true,
    },
  })
  return NextResponse.json({ messages })
}
