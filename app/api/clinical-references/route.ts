import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { referenceSchema } from '@/lib/parity-validation'
export async function GET() {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'DOCTOR'])
  if (error || !hospitalId) return error!
  return NextResponse.json({
    references: await prisma.clinicalReference.findMany({
      where: { hospitalId },
      orderBy: [{ kind: 'asc' }, { label: 'asc' }],
    }),
  })
}
export async function POST(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'DOCTOR'])
  if (error || !hospitalId) return error!
  try {
    const parsed = referenceSchema.safeParse(await req.json())
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Choose a category and enter a label (2–190 characters)' },
        { status: 400 }
      )
    return NextResponse.json(
      await prisma.clinicalReference.upsert({
        where: { hospitalId_kind_label: { hospitalId, ...parsed.data } },
        create: { hospitalId, ...parsed.data },
        update: {},
      }),
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Could not save reference' }, { status: 500 })
  }
}
