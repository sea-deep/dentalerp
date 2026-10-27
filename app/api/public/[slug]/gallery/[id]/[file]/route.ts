import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildStorageKey, getStorage } from '@/lib/storage'
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string; file: string }> }
) {
  const { slug, id, file } = await params
  if (!/^(before|after)\.(png|jpg|webp)$/.test(file))
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  const row = await prisma.websiteEntry.findFirst({
    where: {
      id,
      kind: 'GALLERY',
      published: true,
      consentAt: { not: null },
      hospital: { slug, isActive: true, patientPortalEnabled: true },
    },
  })
  const expected = `/api/public/${slug}/gallery/${id}/${file}`
  if (!row || ![row.imageUrl, row.afterUrl].includes(expected))
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  try {
    const image = await getStorage().get(buildStorageKey(row.hospitalId, 'gallery', id, file))
    const mime = file.endsWith('.png')
      ? 'image/png'
      : file.endsWith('.jpg')
        ? 'image/jpeg'
        : 'image/webp'
    return new NextResponse(new Uint8Array(image.body), {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  }
}
