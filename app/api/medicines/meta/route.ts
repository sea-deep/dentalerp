import { NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

interface MetaCache {
  expires: number
  payload: any
}

let cache: MetaCache | null = null

export async function GET() {
  const { error } = await requireAuthAndRole()
  if (error) return error

  if (cache && cache.expires > Date.now()) {
    return NextResponse.json(cache.payload)
  }

  try {
    const [total, distinctCounts, classes, forms] = await Promise.all([
      prisma.medicineCatalog.count({ where: { isDiscontinued: false } }),
      prisma.$queryRaw<Array<{ brands: bigint; generics: bigint }>>`
        SELECT COUNT(DISTINCT brandName) AS brands, COUNT(DISTINCT genericName) AS generics
        FROM MedicineCatalog
        WHERE isDiscontinued = false
      `,
      prisma.medicineCatalog.groupBy({
        by: ['therapeuticClass'],
        where: { isDiscontinued: false },
        _count: { _all: true },
        orderBy: { _count: { therapeuticClass: 'desc' } },
      }),
      prisma.medicineCatalog.groupBy({
        by: ['form'],
        where: { isDiscontinued: false },
        _count: { _all: true },
        orderBy: { _count: { form: 'desc' } },
      }),
    ])

    const payload = {
      success: true,
      data: {
        total,
        brandCount: Number(distinctCounts[0]?.brands ?? 0),
        genericCount: Number(distinctCounts[0]?.generics ?? 0),
        classes: classes
          .filter((row) => row.therapeuticClass)
          .map((row) => ({ name: row.therapeuticClass, count: row._count._all })),
        forms: forms
          .filter((row) => row.form)
          .map((row) => ({ name: row.form, count: row._count._all })),
      },
    }

    // Catalog changes only when the import runs; a short cache keeps the UI
    // instant without making the page hit four GROUP BY queries every visit.
    cache = { expires: Date.now() + 10 * 60 * 1000, payload }
    return NextResponse.json(payload)
  } catch (err: any) {
    console.error('Error loading medicine metadata:', err)
    return NextResponse.json({ error: err.message || 'Failed to load metadata' }, { status: 500 })
  }
}
