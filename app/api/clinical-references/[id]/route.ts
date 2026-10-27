import { NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'DOCTOR'])
  if (error || !hospitalId) return error!
  const { id } = await params
  const result = await prisma.clinicalReference.deleteMany({ where: { id, hospitalId } })
  return NextResponse.json({ success: !!result.count }, { status: result.count ? 200 : 404 })
}
