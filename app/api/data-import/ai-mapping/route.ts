import { NextRequest, NextResponse } from 'next/server'
import { requireAuthAndRole } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { ENTITY_SCHEMAS } from '@/lib/import/schema-definitions'

const COMMON_ALIASES: Record<string, string[]> = {
  firstName: ['first name', 'firstname', 'given name', 'fname', 'first'],
  lastName: ['last name', 'lastname', 'surname', 'family name', 'lname', 'last'],
  phone: ['phone', 'mobile', 'contact', 'cell', 'telephone', 'phone number', 'mobile number'],
  email: ['email', 'email address', 'e-mail', 'mail'],
  dateOfBirth: ['dob', 'date of birth', 'birth date', 'birthdate'],
  gender: ['gender', 'sex'],
  bloodGroup: ['blood group', 'blood type', 'blood'],
  address: ['address', 'street', 'residence'],
  city: ['city', 'town'],
  state: ['state', 'province'],
  pincode: ['pincode', 'postal code', 'zip', 'zipcode'],
  emergencyContactName: ['emergency contact', 'emergency name', 'next of kin'],
  emergencyContactPhone: ['emergency phone', 'emergency mobile'],
  notes: ['notes', 'remarks', 'comments', 'description'],
  sku: ['sku', 'item code', 'product code', 'barcode'],
  name: ['name', 'item name', 'procedure name', 'medication name', 'title'],
  currentStock: ['stock', 'current stock', 'quantity', 'qty', 'on hand'],
  purchasePrice: ['cost', 'purchase price', 'buy price', 'unit cost'],
  sellingPrice: ['price', 'selling price', 'mrp', 'rate', 'unit price'],
}

export async function POST(req: NextRequest) {
  const { error, hospitalId } = await requireAuthAndRole(['ADMIN'])
  if (error || !hospitalId)
    return error || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { jobId } = await req.json()
    if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 })

    const job = await prisma.dataImportJob.findFirst({
      where: { id: jobId, hospitalId },
    })
    if (!job) return NextResponse.json({ error: 'Import job not found' }, { status: 404 })

    const schema = ENTITY_SCHEMAS[job.entityType]
    if (!schema) return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })

    const sourceColumns = (job.sourceColumns as string[]) || []
    const mapping: Record<string, string | null> = {}
    const confidence: Record<string, number> = {}
    const usedTargets = new Set<string>()

    for (const col of sourceColumns) {
      const colNorm = col
        .trim()
        .toLowerCase()
        .replace(/[_\s-]+/g, ' ')
      let matchedTarget: string | null = null
      let score = 0

      // 1. Exact match with field name
      const exactField = schema.fields.find(
        (f) => f.name.toLowerCase() === colNorm.replace(/\s+/g, '')
      )
      if (exactField && !usedTargets.has(exactField.name)) {
        matchedTarget = exactField.name
        score = 1.0
      }

      // 2. Alias match
      if (!matchedTarget) {
        for (const field of schema.fields) {
          if (usedTargets.has(field.name)) continue
          const aliases = COMMON_ALIASES[field.name] || []
          if (
            aliases.some(
              (alias) => colNorm === alias || colNorm.includes(alias) || alias.includes(colNorm)
            )
          ) {
            matchedTarget = field.name
            score = 0.9
            break
          }
        }
      }

      if (matchedTarget) {
        mapping[col] = matchedTarget
        confidence[col] = score
        usedTargets.add(matchedTarget)
      } else {
        mapping[col] = null
        confidence[col] = 0
      }
    }

    const unmappedRequired = schema.fields
      .filter((f) => f.required && !usedTargets.has(f.name))
      .map((f) => f.name)

    // Persist mapping to import job
    await prisma.dataImportJob.update({
      where: { id: jobId },
      data: {
        columnMapping: mapping,
        status: 'MAPPED',
      },
    })

    return NextResponse.json({
      mapping,
      confidence,
      unmappedRequired,
      splitFields: [],
    })
  } catch (error: any) {
    console.error('Data import auto-mapping error:', error)
    return NextResponse.json({ error: 'Failed to auto-map columns' }, { status: 500 })
  }
}
