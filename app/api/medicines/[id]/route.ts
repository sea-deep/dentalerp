import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuthAndRole()
  if (error) return error

  try {
    const { id } = await params
    const medicine = await prisma.medicineCatalog.findUnique({ where: { id } })
    if (!medicine) {
      return NextResponse.json({ error: 'Medicine not found' }, { status: 404 })
    }
    return NextResponse.json({
      success: true,
      data: { ...medicine, price: medicine.price != null ? Number(medicine.price) : null },
    })
  } catch (err: any) {
    console.error('Error fetching medicine:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch medicine' }, { status: 500 })
  }
}
