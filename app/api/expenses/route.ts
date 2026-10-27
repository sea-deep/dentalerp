import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { expenseSchema, dateInput } from '@/lib/parity-validation'
export async function GET(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'ACCOUNTANT'])
  if (error || !hospitalId) return error!
  const q = req.nextUrl.searchParams
  const from = q.get('from'),
    to = q.get('to')
  if (
    (from && !dateInput.safeParse(from).success) ||
    (to && !dateInput.safeParse(to).success) ||
    (from && to && from > to)
  )
    return NextResponse.json({ error: 'Choose a valid date range' }, { status: 400 })
  try {
    const expenses = await prisma.expense.findMany({
      where: {
        hospitalId,
        ...(from || to
          ? {
              expenseDate: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    })
    return NextResponse.json({
      expenses,
      total: expenses.filter((e) => !e.voidedAt).reduce((sum, e) => sum + Number(e.amount), 0),
    })
  } catch {
    return NextResponse.json({ error: 'Could not load expenses. Try again.' }, { status: 500 })
  }
}
export async function POST(req: NextRequest) {
  const { error, hospitalId, user } = await requireAuthAndRole(['ADMIN', 'ACCOUNTANT'])
  if (error || !hospitalId) return error!
  try {
    const result = expenseSchema.safeParse(await req.json())
    if (!result.success)
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
    const expense = await prisma.$transaction(async (tx) => {
      const row = await tx.expense.create({
        data: {
          ...result.data,
          expenseDate: new Date(result.data.expenseDate),
          hospitalId,
          createdBy: user.id,
        },
      })
      await tx.auditLog.create({
        data: {
          hospitalId,
          userId: user.id,
          action: 'CREATE',
          entityType: 'Expense',
          entityId: row.id,
          newValues: JSON.stringify(result.data),
        },
      })
      return row
    })
    return NextResponse.json(expense, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Could not save expense. Try again.' }, { status: 500 })
  }
}
