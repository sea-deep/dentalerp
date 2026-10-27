import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId, user } = await requireAuthAndRole(['ADMIN', 'ACCOUNTANT'])
  if (error || !hospitalId) return error!
  try {
    const { id } = await params
    const { reason } = await req.json()
    if (typeof reason !== 'string' || reason.trim().length < 3 || reason.length > 500)
      return NextResponse.json(
        { error: 'Record a reason for voiding this expense' },
        { status: 400 }
      )
    const count = await prisma.$transaction(async (tx) => {
      const changed = await tx.expense.updateMany({
        where: { id, hospitalId, voidedAt: null },
        data: { voidedAt: new Date(), voidReason: reason.trim() },
      })
      if (changed.count)
        await tx.auditLog.create({
          data: {
            hospitalId,
            userId: user.id,
            action: 'VOID',
            entityType: 'Expense',
            entityId: id,
            newValues: JSON.stringify({ reason: reason.trim() }),
          },
        })
      return changed.count
    })
    if (!count)
      return NextResponse.json({ error: 'Expense not found or already voided' }, { status: 409 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Could not void expense. Try again.' }, { status: 500 })
  }
}
