import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

/**
 * Generic-name index: one row per molecule with the number of Indian brand
 * packs available. Used by the "Generics" tab in the medicine catalog.
 */
export async function GET(request: NextRequest) {
  const { error } = await requireAuthAndRole()
  if (error) return error

  try {
    const sp = request.nextUrl.searchParams
    const search = (sp.get('search') || '').trim()
    const letter = sp.get('letter') || ''
    const page = Math.max(1, Number.parseInt(sp.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(sp.get('limit') || '50', 10) || 50))

    const where: any = { isDiscontinued: false }
    if (search) where.genericName = { contains: search }
    if (letter) where.genericName = { startsWith: letter }

    const [rows, totalRows] = await Promise.all([
      prisma.medicineCatalog.groupBy({
        by: ['genericName'],
        where,
        _count: { _all: true },
        _min: { price: true },
        _max: { price: true },
        orderBy: { genericName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.medicineCatalog.groupBy({
        by: ['genericName'],
        where,
        _count: { _all: true },
      }),
    ])

    const total = totalRows.length

    return NextResponse.json({
      success: true,
      data: rows.map((row) => ({
        name: row.genericName,
        brandCount: row._count._all,
        priceFrom: row._min.price != null ? Number(row._min.price) : null,
        priceTo: row._max.price != null ? Number(row._max.price) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })
  } catch (err: any) {
    console.error('Error loading generics:', err)
    return NextResponse.json({ error: err.message || 'Failed to load generics' }, { status: 500 })
  }
}
