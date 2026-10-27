import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { websiteSchema } from '@/lib/parity-validation'
export async function GET() {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId) return error!
  const [entries, clinic] = await Promise.all([
    prisma.websiteEntry.findMany({ where: { hospitalId }, orderBy: { createdAt: 'desc' } }),
    prisma.hospital.findUnique({
      where: { id: hospitalId },
      select: { slug: true, patientPortalEnabled: true },
    }),
  ])
  return NextResponse.json({ entries, clinic })
}
export async function POST(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId) return error!
  try {
    const parsed = websiteSchema.safeParse(await req.json())
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const { consent, ...data } = parsed.data
    return NextResponse.json(
      await prisma.websiteEntry.create({ data: { ...data, hospitalId, consentAt: new Date() } }),
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Could not save website content' }, { status: 500 })
  }
}
