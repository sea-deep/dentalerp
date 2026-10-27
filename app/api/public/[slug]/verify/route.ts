import { NextRequest, NextResponse } from 'next/server'
import { randomInt, createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { readBookingToken } from '@/lib/booking-token'
import { sendBookingOTP } from '@/lib/services/whatsapp.service'
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const { token, otp } = await req.json()
    let payload
    try {
      payload = await readBookingToken(token)
    } catch {
      return NextResponse.json({ error: 'Booking session expired. Start again.' }, { status: 401 })
    }
    const hospital = await prisma.hospital.findFirst({
      where: { slug, id: payload.hospitalId, isActive: true, patientPortalEnabled: true },
    })
    if (!hospital) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
    const enquiry = await prisma.clinicEnquiry.findFirst({
      where: { id: payload.id, hospitalId: hospital.id, status: 'DRAFT' },
    })
    if (!enquiry)
      return NextResponse.json({ error: 'Booking request is no longer open' }, { status: 409 })
    // Scope OTPs to this booking intent so portal and booking codes cannot be substituted.
    const key = `booking:${payload.id}`
    if (otp !== undefined) {
      if (typeof otp !== 'string' || !/^\d{6}$/.test(otp))
        return NextResponse.json({ error: 'Enter the six-digit code' }, { status: 400 })
      const record = await prisma.patientOTP.findFirst({
        where: {
          hospitalId: hospital.id,
          phone: key,
          verified: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      })
      if (!record || record.attempts >= 3)
        return NextResponse.json(
          { error: 'Code expired or attempt limit reached. Request a new code.' },
          { status: 400 }
        )
      const digest = createHash('sha256').update(`${payload.id}:${otp}`).digest('hex')
      const attempt = await prisma.patientOTP.updateMany({
        where: { id: record.id, attempts: { lt: 3 }, verified: false },
        data: { attempts: { increment: 1 } },
      })
      if (!attempt.count || record.otp !== digest)
        return NextResponse.json({ error: 'Incorrect verification code' }, { status: 400 })
      await prisma.$transaction(async (tx) => {
        const claimed = await tx.patientOTP.updateMany({
          where: { id: record.id, verified: false },
          data: { verified: true },
        })
        if (!claimed.count) throw new Error('Code already used')
        await tx.clinicEnquiry.update({
          where: { id: payload.id },
          data: { verifiedAt: new Date() },
        })
      })
      return NextResponse.json({ success: true })
    }
    const recent = await prisma.patientOTP.count({
      where: {
        hospitalId: hospital.id,
        phone: key,
        createdAt: { gt: new Date(Date.now() - 600000) },
      },
    })
    if (recent >= 3)
      return NextResponse.json(
        { error: 'Too many code requests. Try again in ten minutes.' },
        { status: 429 }
      )
    const code = String(randomInt(100000, 1000000))
    const record = await prisma.patientOTP.create({
      data: {
        hospitalId: hospital.id,
        phone: key,
        otp: createHash('sha256').update(`${payload.id}:${code}`).digest('hex'),
        expiresAt: new Date(Date.now() + 300000),
      },
    })
    try {
      await sendBookingOTP(hospital.id, payload.phone, code)
    } catch {
      await prisma.patientOTP.update({ where: { id: record.id }, data: { expiresAt: new Date(0) } })
      return NextResponse.json(
        { error: 'Verification message could not be sent. Please call the clinic or try again.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Verification failed. Try again.' }, { status: 500 })
  }
}
