import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId) return error!
  const { id } = await params
  const { confirmRetry } = await req.json()
  if (confirmRetry !== true)
    return NextResponse.json(
      { error: 'Confirm that retrying may send a duplicate message' },
      { status: 400 }
    )
  const changed = await prisma.whatsAppMessage.updateMany({
    where: { id, hospitalId, status: 'FAILED' },
    data: { status: 'QUEUED', error: null },
  })
  return NextResponse.json({ success: !!changed.count }, { status: changed.count ? 200 : 409 })
}
