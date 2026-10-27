import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
const schema = z.object({
  enabled: z.boolean(),
  phoneNumberId: z.string().regex(/^\d*$/),
  accessToken: z.string().max(2000).optional(),
  apiVersion: z.string().regex(/^v\d+\.\d+$/),
  language: z.string().regex(/^[a-z]{2}(?:_[A-Z]{2})?$/),
  templates: z.record(z.string(), z.string().regex(/^[a-z0-9_]*$/)),
})
export async function GET() {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId) return error!
  const row = await prisma.setting.findUnique({
    where: { hospitalId_key: { hospitalId, key: 'whatsapp_settings' } },
  })
  const config = row
    ? JSON.parse(row.value)
    : { enabled: false, phoneNumberId: '', apiVersion: 'v23.0', language: 'en', templates: {} }
  return NextResponse.json({ ...config, accessToken: '', hasAccessToken: !!config.accessToken })
}
export async function PUT(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId) return error!
  try {
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success)
      return NextResponse.json(
        { error: 'Check the phone ID, API version, language and template names' },
        { status: 400 }
      )
    const old = await prisma.setting.findUnique({
      where: { hospitalId_key: { hospitalId, key: 'whatsapp_settings' } },
    })
    const previous = old ? JSON.parse(old.value) : {}
    const value = {
      ...parsed.data,
      accessToken: parsed.data.accessToken
        ? encrypt(parsed.data.accessToken)
        : previous.accessToken,
    }
    if (value.enabled && (!value.phoneNumberId || !value.accessToken))
      return NextResponse.json(
        { error: 'Phone ID and access token are required to enable WhatsApp' },
        { status: 400 }
      )
    await prisma.setting.upsert({
      where: { hospitalId_key: { hospitalId, key: 'whatsapp_settings' } },
      create: {
        hospitalId,
        key: 'whatsapp_settings',
        category: 'whatsapp',
        type: 'json',
        value: JSON.stringify(value),
      },
      update: { value: JSON.stringify(value) },
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Could not save WhatsApp configuration' }, { status: 500 })
  }
}
