import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  formatCurrency as baseFormatCurrency,
  formatDate as baseFormatDate,
  formatDateTime as baseFormatDateTime,
} from '@/lib/i18n/format'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, locale?: string): string {
  return baseFormatCurrency(amount, { locale })
}

export function formatDate(date: Date | string, locale?: string): string {
  return baseFormatDate(date, { locale })
}

export function formatDateTime(date: Date | string, locale?: string): string {
  return baseFormatDateTime(date, { locale })
}

export function formatPhone(phone: string): string {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`
  }
  return phone
}

const BLOOD_GROUP_LABELS: Record<string, string> = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-',
}

/**
 * Blood groups are stored as enum values (A_POSITIVE). Clinical screens and
 * printed documents should show the notation clinicians actually use.
 */
export function formatBloodGroup(value?: string | null): string {
  if (!value) return '—'
  return BLOOD_GROUP_LABELS[value] ?? value
}

/**
 * Turn SHOUTY_SNAKE_CASE enum values into readable labels while preserving
 * known acronyms. Used for statuses that have no dedicated label config.
 */
export function formatEnumLabel(value?: string | null): string {
  if (!value) return '—'
  const acronyms = new Set(['UPI', 'GST', 'GSTIN', 'SMS', 'API', 'SAC', 'ID'])
  return value
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) =>
      acronyms.has(word.toUpperCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ')
}

/**
 * Format a clinician's display name exactly once. Imported records sometimes
 * carry the title in firstName ("Dr. Priya"); naive prefixing produced
 * "Dr. Dr. Priya Kumar" in appointment lists and prescriptions.
 */
export function formatDoctorName(firstName?: string | null, lastName?: string | null): string {
  const full = [firstName, lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
  if (!full) return 'Unassigned'
  return /^dr\.?\s/i.test(full) ? full : `Dr. ${full}`
}

export function generatePatientId(): string {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  const random = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
  return `PAT${year}${month}${random}`
}

export function generateInvoiceNo(): string {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  const random = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
  return `INV-${year}${month}-${random}`
}

export function calculateGST(amount: number, cgstRate: number = 9, sgstRate: number = 9) {
  const cgst = (amount * cgstRate) / 100
  const sgst = (amount * sgstRate) / 100
  return {
    subtotal: amount,
    cgst,
    sgst,
    total: amount + cgst + sgst,
  }
}

export function validateAadhar(aadhar: string): boolean {
  const cleaned = aadhar.replace(/\D/g, '')
  return cleaned.length === 12
}

export function validateIndianPhone(phone: string): boolean {
  let cleaned = phone.replace(/\D/g, '')
  // Strip country code if present
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2)
  }
  return /^[6-9]\d{9}$/.test(cleaned)
}

export function validateGSTIN(gstin: string): boolean {
  // GSTIN format: 2 digits (state code) + 10 chars PAN + 1 alphanumeric + Z + 1 check digit
  // Example: 27AAPFU0939F1ZV
  const pattern = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
  if (!pattern.test(gstin) || gstin.length !== 15) return false
  // State code must be 01-37
  const stateCode = parseInt(gstin.substring(0, 2), 10)
  return stateCode >= 1 && stateCode <= 37
}
