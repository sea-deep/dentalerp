import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { generateClinicPdf } from '@/lib/services/clinic-pdf.service'
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'])
  if (error || !hospitalId) return error!
  const { id } = await params
  const row = await prisma.invoice.findFirst({ where: { id, hospitalId }, select: { id: true } })
  if (!row) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  try {
    const pdf = await generateClinicPdf(hospitalId, 'INVOICE', id)
    return new NextResponse(new Uint8Array(pdf.bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdf.filename.replace(/[^a-zA-Z0-9_.-]/g, '_')}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Could not generate PDF' }, { status: 500 })
  }
}
