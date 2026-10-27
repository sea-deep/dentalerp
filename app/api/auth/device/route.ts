import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  DEVICE_COOKIE,
  deviceToken,
  deviceHash,
  newDeviceToken,
  newStaffCode,
  staffCodeHash,
  needsDeviceVerification,
  isTrustedDevice,
  sendStaffLoginCode,
} from '@/lib/services/device-auth.service'
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  otp: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),
})
export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Check your email, password and verification code' },
        { status: 400 }
      )
    const { email, password, otp } = parsed.data
    const user = await prisma.user.findUnique({ where: { email }, include: { hospital: true } })
    if (
      !user?.isActive ||
      !user.hospital.isActive ||
      !(await bcrypt.compare(password, user.password))
    )
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    if (
      !(await needsDeviceVerification(user.hospitalId)) ||
      (await isTrustedDevice(user.id, user.hospitalId, req))
    )
      return NextResponse.json({ requiresOtp: false })
    const existing = deviceToken(req),
      token = existing && existing.length === 64 ? existing : newDeviceToken(),
      phone = `staff:${user.id}:${deviceHash(token)}`
    const response = (body: unknown, status = 200) => {
      const result = NextResponse.json(body, { status })
      result.cookies.set(DEVICE_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 86400,
      })
      return result
    }
    if (otp) {
      const record = await prisma.patientOTP.findFirst({
        where: {
          hospitalId: user.hospitalId,
          phone,
          verified: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      })
      if (!record || record.attempts >= 3)
        return response(
          { error: 'Code expired or attempt limit reached. Request a new code.' },
          400
        )
      const attempt = await prisma.patientOTP.updateMany({
        where: { id: record.id, verified: false, attempts: { lt: 3 } },
        data: { attempts: { increment: 1 } },
      })
      if (!attempt.count || record.otp !== staffCodeHash(user.id, token, otp))
        return response({ error: 'Incorrect verification code' }, 400)
      const accepted = await prisma.$transaction(async (tx) => {
        const claimed = await tx.patientOTP.updateMany({
          where: { id: record.id, verified: false },
          data: { verified: true },
        })
        if (!claimed.count) return false
        const key = `device.${user.id}.${deviceHash(token)}`,
          value = JSON.stringify({ expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() })
        await tx.setting.upsert({
          where: { hospitalId_key: { hospitalId: user.hospitalId, key } },
          create: {
            hospitalId: user.hospitalId,
            key,
            value,
            category: 'trusted_devices',
            type: 'json',
          },
          update: { value },
        })
        return true
      })
      return response(
        accepted ? { requiresOtp: false } : { error: 'Code already used' },
        accepted ? 200 : 409
      )
    }
    const recent = await prisma.patientOTP.count({
      where: {
        hospitalId: user.hospitalId,
        phone: { startsWith: `staff:${user.id}:` },
        createdAt: { gt: new Date(Date.now() - 600000) },
      },
    })
    if (recent >= 5)
      return response({ error: 'Too many verification requests. Try again in ten minutes.' }, 429)
    const code = newStaffCode(),
      record = await prisma.patientOTP.create({
        data: {
          hospitalId: user.hospitalId,
          phone,
          otp: staffCodeHash(user.id, token, code),
          expiresAt: new Date(Date.now() + 300000),
        },
      })
    try {
      await sendStaffLoginCode(user.hospitalId, user.email, code)
    } catch {
      await prisma.patientOTP.update({ where: { id: record.id }, data: { expiresAt: new Date(0) } })
      return response(
        {
          error:
            'Could not send verification email. Ask the administrator to check email settings.',
        },
        503
      )
    }
    return response({
      requiresOtp: true,
      message: 'A verification code was sent to your staff email.',
    })
  } catch {
    return NextResponse.json({ error: 'Could not verify this device. Try again.' }, { status: 500 })
  }
}
