import { z } from 'zod'
import { ToothCondition, Severity } from '@prisma/client'

export const validFDITooth = (number: number) => {
  const quadrant = Math.floor(number / 10)
  const position = number % 10
  return (
    Number.isInteger(number) &&
    ((quadrant >= 1 && quadrant <= 4 && position >= 1 && position <= 8) ||
      (quadrant >= 5 && quadrant <= 8 && position >= 1 && position <= 5))
  )
}

const fields = {
  condition: z.enum(ToothCondition),
  severity: z.enum(Severity).optional(),
  mesial: z.boolean().optional(),
  distal: z.boolean().optional(),
  occlusal: z.boolean().optional(),
  buccal: z.boolean().optional(),
  lingual: z.boolean().optional(),
  notes: z.string().max(10000).nullable().optional(),
}
export const chartFindingSchema = z.object({
  patientId: z.string().min(1),
  toothNumber: z.number().int().refine(validFDITooth, 'Invalid tooth number. Use FDI notation.'),
  toothNotation: z.string().max(20).optional(),
  ...fields,
})
export const chartFindingUpdateSchema = z
  .object({
    ...fields,
    condition: fields.condition.optional(),
    resolvedDate: z.iso.datetime().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'No finding fields were provided.')
