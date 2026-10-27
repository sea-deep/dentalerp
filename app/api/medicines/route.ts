import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

/**
 * Search the shared Indian medicine master (253k+ brand packs).
 *
 * Query params:
 *  search   free text across brand, generic, composition and manufacturer
 *  class    therapeutic class (e.g. Antibiotic)
 *  form     dosage form (e.g. Tablet)
 *  generic  exact generic name, used by the Generics tab
 *  letter   A-Z brand filter
 *  dental   "true" to restrict to medicines commonly used in dentistry
 *  page, limit, sort (name | price-asc | price-desc)
 */
export const DENTAL_GENERICS = [
  'Amoxicillin',
  'Amoxycillin',
  'Clavulanic Acid',
  'Metronidazole',
  'Azithromycin',
  'Clindamycin',
  'Doxycycline',
  'Cefixime',
  'Cephalexin',
  'Ibuprofen',
  'Paracetamol',
  'Acetaminophen',
  'Diclofenac',
  'Ketorolac',
  'Naproxen',
  'Etoricoxib',
  'Tramadol',
  'Chlorhexidine',
  'Povidone Iodine',
  'Hydrogen Peroxide',
  'Sodium Fluoride',
  'Lignocaine',
  'Lidocaine',
  'Benzocaine',
  'Articaine',
  'Triamcinolone',
  'Betamethasone',
  'Dexamethasone',
  'Prednisolone',
  'Clotrimazole',
  'Fluconazole',
  'Itraconazole',
  'Miconazole',
  'Acyclovir',
  'Pantoprazole',
  'Omeprazole',
  'Ranitidine',
  'Domperidone',
  'Ondansetron',
  'Cetirizine',
  'Levocetirizine',
  'Loratadine',
  'Chlorpheniramine',
  'Montelukast',
  'Serratiopeptidase',
  'Tranexamic Acid',
  'Vitamin B Complex',
  'Vitamin C',
  'Vitamin D3',
  'Calcium',
  'Ferrous Fumarate',
  'Zinc',
]

export async function GET(request: NextRequest) {
  const { error } = await requireAuthAndRole()
  if (error) return error

  try {
    const sp = request.nextUrl.searchParams
    const search = (sp.get('search') || sp.get('q') || '').trim()
    const therapeuticClass = sp.get('class') || ''
    const form = sp.get('form') || ''
    const generic = sp.get('generic') || ''
    const letter = sp.get('letter') || ''
    const dental = sp.get('dental') === 'true'
    const includeDiscontinued = sp.get('discontinued') === 'true'
    const page = Math.max(1, Number.parseInt(sp.get('page') || '1', 10) || 1)
    const limit = Math.min(60, Math.max(1, Number.parseInt(sp.get('limit') || '30', 10) || 30))
    const sort = sp.get('sort') || 'name'
    const skip = (page - 1) * limit

    const and: any[] = []

    if (search) {
      // Every word must match somewhere — "amox 500" finds Amoxicillin 500mg.
      for (const term of search.split(/\s+/).filter(Boolean)) {
        and.push({
          OR: [
            { brandName: { contains: term } },
            { genericName: { contains: term } },
            { composition: { contains: term } },
            { manufacturer: { contains: term } },
          ],
        })
      }
    }

    if (therapeuticClass) and.push({ therapeuticClass })
    if (form) and.push({ form })
    if (generic) and.push({ genericName: generic })
    if (letter) and.push({ brandName: { startsWith: letter } })
    if (dental) {
      and.push({
        OR: DENTAL_GENERICS.map((name) => ({ genericName: { contains: name } })),
      })
    }
    if (!includeDiscontinued) and.push({ isDiscontinued: false })

    const where: any = and.length > 0 ? { AND: and } : {}

    let orderBy: any = { brandName: 'asc' }
    if (sort === 'price-asc') orderBy = [{ price: 'asc' }, { brandName: 'asc' }]
    if (sort === 'price-desc') orderBy = [{ price: 'desc' }, { brandName: 'asc' }]

    const [rows, total, formulary] = await Promise.all([
      prisma.medicineCatalog.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          productId: true,
          brandName: true,
          genericName: true,
          composition: true,
          strength: true,
          form: true,
          manufacturer: true,
          packSize: true,
          price: true,
          therapeuticClass: true,
          isDiscontinued: true,
        },
      }),
      prisma.medicineCatalog.count({ where }),
      prisma.medication.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
    ])

    // Let the UI show "In formulary" without an extra round-trip per row.
    const formularyByName = new Map(formulary.map((item) => [item.name.toLowerCase(), item.id]))

    const data = rows.map((row) => ({
      ...row,
      price: row.price != null ? Number(row.price) : null,
      inFormulary: formularyByName.has(row.brandName.toLowerCase()),
      formularyId: formularyByName.get(row.brandName.toLowerCase()) || null,
    }))

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: skip + rows.length < total,
      },
    })
  } catch (err: any) {
    console.error('Error searching medicine catalog:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to search medicines' },
      { status: 500 }
    )
  }
}
