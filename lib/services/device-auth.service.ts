import { createHash, randomBytes, randomInt } from 'crypto'
import type { NextRequest } from 'next/server'
import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
export const DEVICE_COOKIE = 'clinic-trusted-device'
export function deviceHash(token: string) {
  return createHash('sha256').update(token).digest('hex')
}
export function deviceToken(req: Request) {
  const cookie = req.headers.get('cookie') || ''
  return cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${DEVICE_COOKIE}=`))
    ?.slice(DEVICE_COOKIE.length + 1)
}
export async function needsDeviceVerification(hospitalId: string) {
  const setting = await prisma.setting.findUnique({
    where: { hospitalId_key: { hospitalId, key: 'requireTwoFactor' } },
  })
  return setting?.value === 'true'
}
export async function isTrustedDevice(userId: string, hospitalId: string, req: Request) {
  if (!(await needsDeviceVerification(hospitalId))) return true
  const token = deviceToken(req)
  if (!token || token.length > 200) return false
  const setting = await prisma.setting.findUnique({
    where: { hospitalId_key: { hospitalId, key: `device.${userId}.${deviceHash(token)}` } },
  })
  if (!setting) return false
  const record = JSON.parse(setting.value)
  return typeof record.expiresAt === 'string' && Date.parse(record.expiresAt) > Date.now()
}
export async function sendStaffLoginCode(hospitalId: string, email: string, code: string) {
  const row = await prisma.setting.findUnique({
    where: { hospitalId_key: { hospitalId, key: 'email_settings' } },
  })
  const config = row ? JSON.parse(row.value) : {}
  const host = config.smtp_host || process.env.SMTP_HOST
  if (!host || host === 'smtp.example.com')
    throw new Error('Configure clinic email before enabling device verification')
  const user = config.smtp_user || process.env.SMTP_USER,
    pass = config.smtp_password || process.env.SMTP_PASSWORD
  const transport = nodemailer.createTransport({
    host,
    port: Number(config.smtp_port || process.env.SMTP_PORT || 587),
    secure: String(config.smtp_secure ?? process.env.SMTP_SECURE) === 'true',
    ...(user ? { auth: { user, pass } } : {}),
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  })
  await transport.sendMail({
    from: config.from_email || user || 'no-reply@localhost',
    to: email,
    subject: 'DentalERP device verification',
    text: `Your DentalERP verification code is ${code}. It expires in five minutes. If you did not request this login, ignore this message.`,
  })
}
export function newDeviceToken() {
  return randomBytes(32).toString('hex')
}
export function staffCodeHash(userId: string, token: string, code: string) {
  return createHash('sha256')
    .update(`${userId}:${deviceHash(token)}:${code}`)
    .digest('hex')
}
export function newStaffCode() {
  return String(randomInt(100000, 1000000))
}
