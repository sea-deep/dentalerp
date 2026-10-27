import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { modules } from '@/lib/permissions'
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId, user } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId) return error!
  const { id } = await params
  const parsed = z.partialRecord(z.enum(modules), z.boolean()).safeParse(await req.json())
  if (!parsed.success)
    return NextResponse.json({ error: 'Choose valid module permissions' }, { status: 400 })
  const account = await prisma.user.findFirst({ where: { id, hospitalId } })
  if (!account) return NextResponse.json({ error: 'Staff account not found' }, { status: 404 })
  if (account.role === 'ADMIN')
    return NextResponse.json(
      { error: 'Administrators retain full access; change their role to restrict access' },
      { status: 400 }
    )
  await prisma.$transaction(async (tx) => {
    const value = JSON.stringify(parsed.data)
    await tx.setting.upsert({
      where: { hospitalId_key: { hospitalId, key: `access.${id}` } },
      create: { hospitalId, key: `access.${id}`, value, type: 'json', category: 'access' },
      update: { value },
    })
    await tx.auditLog.create({
      data: {
        hospitalId,
        userId: user.id,
        action: 'UPDATE',
        entityType: 'StaffPermissions',
        entityId: id,
        newValues: value,
      },
    })
  })
  return NextResponse.json({ success: true })
}
