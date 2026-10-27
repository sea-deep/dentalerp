import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { buildStorageKey, getStorage } from '@/lib/storage'
import { prisma } from '@/lib/prisma'
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId) return error!
  const { id } = await params
  const body = await req.json()
  if (typeof body.published !== 'boolean')
    return NextResponse.json({ error: 'Choose a publication status' }, { status: 400 })
  const changed = await prisma.websiteEntry.updateMany({
    where: { id, hospitalId, consentAt: { not: null } },
    data: { published: body.published },
  })
  return NextResponse.json({ success: !!changed.count }, { status: changed.count ? 200 : 404 })
}
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId) return error!
  const { id } = await params
  const entry = await prisma.websiteEntry.findFirst({ where: { id, hospitalId } })
  const changed = await prisma.websiteEntry.deleteMany({ where: { id, hospitalId } })
  if (changed.count && entry) {
    const files = [entry.imageUrl, entry.afterUrl].flatMap((url) => {
      const match = url?.match(new RegExp(`/gallery/${id}/((?:before|after)\\.(?:png|jpg|webp))$`))
      return match ? [buildStorageKey(hospitalId, 'gallery', id, match[1])] : []
    })
    await Promise.allSettled(files.map((key) => getStorage().delete(key)))
  }
  return NextResponse.json({ success: !!changed.count }, { status: changed.count ? 200 : 404 })
}
