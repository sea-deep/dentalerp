import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { buildStorageKey, getStorage } from '@/lib/storage'
function imageType(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return { ext: 'png', mime: 'image/png' }
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return { ext: 'jpg', mime: 'image/jpeg' }
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP')
    return { ext: 'webp', mime: 'image/webp' }
  return null
}
export async function POST(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId) return error!
  const stored: string[] = []
  try {
    const form = await req.formData()
    const details = z
      .object({
        title: z.string().trim().min(2).max(150),
        body: z.string().trim().max(2000),
        consent: z.literal('on'),
      })
      .safeParse(Object.fromEntries(form))
    if (!details.success)
      return NextResponse.json(
        { error: 'Enter a title and confirm publication permission' },
        { status: 400 }
      )
    const before = form.get('before'),
      after = form.get('after')
    if (!(before instanceof File) || !before.size)
      return NextResponse.json({ error: 'Choose a gallery image or before photo' }, { status: 400 })
    const files: { side: string; bytes: Buffer; ext: string; mime: string }[] = []
    for (const [side, file] of [
      ['before', before],
      ['after', after],
    ] as const) {
      if (!(file instanceof File) || !file.size) continue
      if (file.size > 5 * 1024 * 1024)
        return NextResponse.json({ error: 'Each photo must be under 5 MB' }, { status: 400 })
      const bytes = Buffer.from(await file.arrayBuffer()),
        type = imageType(bytes)
      if (!type)
        return NextResponse.json({ error: 'Upload PNG, JPEG or WebP images' }, { status: 400 })
      files.push({ side, bytes, ...type })
    }
    const clinic = await prisma.hospital.findUniqueOrThrow({
      where: { id: hospitalId },
      select: { slug: true },
    })
    const id = randomUUID(),
      urls: Record<string, string> = {}
    for (const file of files) {
      const filename = `${file.side}.${file.ext}`,
        key = buildStorageKey(hospitalId, 'gallery', id, filename)
      await getStorage().put(key, file.bytes, { contentType: file.mime })
      stored.push(key)
      urls[file.side] = `/api/public/${clinic.slug}/gallery/${id}/${filename}`
    }
    const entry = await prisma.websiteEntry.create({
      data: {
        id,
        hospitalId,
        kind: 'GALLERY',
        title: details.data.title,
        body: details.data.body,
        imageUrl: urls.before,
        afterUrl: urls.after,
        consentAt: new Date(),
        published: false,
      },
    })
    return NextResponse.json(entry, { status: 201 })
  } catch {
    await Promise.allSettled(stored.map((key) => getStorage().delete(key)))
    return NextResponse.json({ error: 'Could not upload photos. Try again.' }, { status: 500 })
  }
}
