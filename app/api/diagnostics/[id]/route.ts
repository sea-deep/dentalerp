import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
const schema = z.object({
  status: z.enum(['ORDERED', 'COLLECTED', 'REPORTED', 'CANCELLED']),
  result: z.string().trim().max(10000).optional(),
  documentId: z.string().optional(),
})
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId, user } = await requireAuthAndRole(['ADMIN', 'DOCTOR', 'LAB_TECH'])
  if (error || !hospitalId) return error!
  try {
    const { id } = await params
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success)
      return NextResponse.json({ error: 'Check the status and report details' }, { status: 400 })
    const existing = await prisma.diagnosticOrder.findFirst({ where: { id, hospitalId } })
    if (!existing)
      return NextResponse.json({ error: 'Diagnostic order not found' }, { status: 404 })
    if (
      parsed.data.documentId &&
      !(await prisma.document.findFirst({
        where: { id: parsed.data.documentId, hospitalId, patientId: existing.patientId },
      }))
    )
      return NextResponse.json(
        { error: 'Attach a document from this patient’s record' },
        { status: 400 }
      )
    if (
      parsed.data.status === 'REPORTED' &&
      !(parsed.data.result || parsed.data.documentId || existing.result || existing.documentId)
    )
      return NextResponse.json(
        { error: 'Add a report or attach a patient document first' },
        { status: 400 }
      )
    const order = await prisma.$transaction(async (tx) => {
      const changed = await tx.diagnosticOrder.updateMany({
        where: { id, hospitalId, updatedAt: existing.updatedAt },
        data: { ...parsed.data, documentId: parsed.data.documentId || existing.documentId },
      })
      if (!changed.count) return null
      await tx.auditLog.create({
        data: {
          hospitalId,
          userId: user.id,
          action: 'UPDATE',
          entityType: 'DiagnosticOrder',
          entityId: id,
          oldValues: JSON.stringify(existing),
          newValues: JSON.stringify(parsed.data),
        },
      })
      return tx.diagnosticOrder.findUnique({ where: { id } })
    })
    if (!order)
      return NextResponse.json({ error: 'Order changed. Refresh before saving.' }, { status: 409 })
    return NextResponse.json(order)
  } catch (error) {
    console.error('Diagnostic order update failed', error)
    return NextResponse.json({ error: 'Could not update diagnostic order' }, { status: 500 })
  }
}
