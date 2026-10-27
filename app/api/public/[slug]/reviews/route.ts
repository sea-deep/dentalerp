import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requirePatientAuth } from '@/lib/patient-auth'
import { z } from 'zod'
const schema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(5).max(2000),
  consent: z.literal(true),
})
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { error, patient } = await requirePatientAuth(req)
  if (error || !patient) return error!
  const { slug } = await params
  const hospital = await prisma.hospital.findFirst({
    where: { id: patient.hospitalId, slug, isActive: true, patientPortalEnabled: true },
  })
  if (!hospital) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success)
    return NextResponse.json(
      { error: 'Add a rating, review and permission to publish' },
      { status: 400 }
    )
  const title = `${patient.firstName} ${patient.lastName}`.trim()
  const recent = await prisma.websiteEntry.count({
    where: {
      hospitalId: hospital.id,
      kind: 'REVIEW',
      title,
      createdAt: { gt: new Date(Date.now() - 86400000) },
    },
  })
  if (recent)
    return NextResponse.json(
      { error: 'You have already submitted a review today' },
      { status: 429 }
    )
  await prisma.websiteEntry.create({
    data: {
      hospitalId: hospital.id,
      kind: 'REVIEW',
      title,
      body: parsed.data.body,
      rating: parsed.data.rating,
      consentAt: new Date(),
      published: false,
    },
  })
  return NextResponse.json(
    {
      success: true,
      message: 'Thank you. The clinic will review your feedback before publication.',
    },
    { status: 201 }
  )
}
