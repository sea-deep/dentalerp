import { z } from 'zod'
import { validDate } from './clinic-time'
export const dateInput = z.string().refine(validDate, 'Choose a valid calendar date')
export const expenseCategories = [
  'MATERIALS',
  'SALARIES',
  'RENT',
  'LAB',
  'UTILITIES',
  'EQUIPMENT',
  'MARKETING',
  'OTHER',
] as const
export const expenseSchema = z.object({
  category: z.enum(expenseCategories),
  description: z.string().trim().min(2).max(500),
  amount: z.coerce
    .number()
    .positive()
    .max(99999999.99)
    .refine(
      (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.00001,
      'Use at most two decimal places'
    ),
  expenseDate: dateInput,
  paymentMode: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE']),
  reference: z.string().trim().max(200).optional(),
})
export const enquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^(?:\+?91)?[6-9]\d{9}$/, 'Enter an Indian mobile number'),
  message: z.string().trim().max(2000).optional(),
  consent: z.literal(true),
})
export function normalizePhone(phone: string) {
  return phone.replace(/^\+?91(?=\d{10}$)/, '')
}
export const referenceSchema = z.object({
  kind: z.enum(['COMPLAINT', 'FINDING', 'DIAGNOSIS', 'ADVICE']),
  label: z.string().trim().min(2).max(190),
})
export const websiteSchema = z
  .object({
    kind: z.enum(['GALLERY', 'REVIEW']),
    title: z.string().trim().min(2).max(150),
    body: z.string().trim().max(2000).optional(),
    imageUrl: z
      .string()
      .url()
      .refine((u) => u.startsWith('https://'), 'Use an HTTPS image URL')
      .optional(),
    afterUrl: z
      .string()
      .url()
      .refine((u) => u.startsWith('https://'), 'Use an HTTPS image URL')
      .optional(),
    rating: z.number().int().min(1).max(5).optional(),
    consent: z.literal(true),
    published: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'GALLERY' && !v.imageUrl)
      ctx.addIssue({ code: 'custom', message: 'A gallery image is required', path: ['imageUrl'] })
    if (v.kind === 'REVIEW' && (!v.rating || !v.body))
      ctx.addIssue({
        code: 'custom',
        message: 'Rating and review text are required',
        path: ['rating'],
      })
  })
