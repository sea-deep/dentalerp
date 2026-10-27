import { NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { effectiveAccess } from '@/lib/permissions'
export async function GET() {
  const { error, hospitalId, user } = await requireAuthAndRole()
  if (error || !hospitalId) return error!
  if (user.role !== 'ADMIN') return NextResponse.json({ access: user.access })
  const [users, settings] = await Promise.all([
    prisma.user.findMany({
      where: { hospitalId },
      select: { id: true, name: true, role: true, isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.setting.findMany({ where: { hospitalId, category: 'access' } }),
  ])
  return NextResponse.json({
    access: user.access,
    users: users.map((u) => ({
      ...u,
      access: effectiveAccess(
        u.role,
        JSON.parse(settings.find((s) => s.key === `access.${u.id}`)?.value || '{}')
      ),
    })),
  })
}
