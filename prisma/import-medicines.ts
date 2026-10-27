/**
 * Import the public Indian pharma product dataset into `MedicineCatalog`.
 *
 * Source: revooda/indian-pharma-data (Hugging Face) — 253,973 Indian brand
 * packs with generic composition, manufacturer, pack size, price and class.
 * The same rows back the junioralive/Indian-Medicine-Dataset on GitHub.
 *
 * Usage:
 *   npm run db:import-medicines             # incremental, skips known productIds
 *   npm run db:import-medicines -- --force  # wipe & re-import (fastest)
 *   npm run db:import-medicines -- --limit 5000
 *
 * The CSV is downloaded to `.cache/` on first run (≈70 MB) and reused after.
 * Set MEDICINE_CSV=/path/to/file.csv to use a local copy instead.
 */
import { createReadStream, existsSync, mkdirSync, createWriteStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import { Prisma, PrismaClient } from '@prisma/client'

const CSV_URL =
  process.env.MEDICINE_CSV_URL ||
  'https://huggingface.co/datasets/revooda/indian-pharma-data/resolve/main/indian_pharmaceutical_products_clean.csv'
const CACHE_DIR = path.join(process.cwd(), '.cache')
const CACHE_FILE = path.join(CACHE_DIR, 'indian-medicines.csv')
const BATCH_SIZE = 1500

const prisma = new PrismaClient()

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (quoted) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      fields.push(field)
      field = ''
    } else {
      field += char
    }
  }
  fields.push(field)
  return fields
}

function titleCase(value: string): string {
  return value
    .split(/([ /-])/)
    .map((part) => (part.length > 2 ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join('')
}

function extractComposition(raw: string, primary: string, strength: string): string {
  const pairs: string[] = []
  const re = /'name':\s*'([^']+)'\s*,\s*'strength':\s*'([^']*)'/g
  let match: RegExpExecArray | null
  while ((match = re.exec(raw)) !== null) {
    const name = match[1].trim()
    const dose = match[2].trim()
    if (name) pairs.push(dose ? `${name} (${dose})` : name)
  }
  if (pairs.length > 0) return pairs.join(' + ')
  return strength ? `${primary} (${strength})` : primary
}

function clean(value: string | undefined): string | null {
  const trimmed = (value || '').trim()
  if (!trimmed || trimmed.toLowerCase() === 'nan' || trimmed.toLowerCase() === 'none') return null
  return trimmed
}

async function ensureCsv(): Promise<string> {
  const local = process.env.MEDICINE_CSV
  if (local) {
    if (!existsSync(local)) throw new Error(`MEDICINE_CSV not found: ${local}`)
    return local
  }
  if (existsSync(CACHE_FILE)) {
    console.log(`Using cached dataset: ${CACHE_FILE}`)
    return CACHE_FILE
  }

  mkdirSync(CACHE_DIR, { recursive: true })
  console.log(`Downloading Indian medicine dataset…\n${CSV_URL}`)
  const response = await fetch(CSV_URL)
  if (!response.ok || !response.body) {
    throw new Error(`Download failed: HTTP ${response.status}`)
  }
  await pipeline(Readable.fromWeb(response.body as any), createWriteStream(CACHE_FILE))
  console.log(`Saved to ${CACHE_FILE}`)
  return CACHE_FILE
}

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const limitIndex = args.indexOf('--limit')
  const limitArg =
    args.find((arg) => arg.startsWith('--limit=')) ||
    (limitIndex >= 0 ? args[limitIndex + 1] : undefined)
  const parsedLimit = limitArg ? Number.parseInt(limitArg.replace('--limit=', ''), 10) : 0
  const limit = Number.isFinite(parsedLimit) ? parsedLimit : 0

  const csvPath = await ensureCsv()

  if (force) {
    console.log('Clearing existing catalog…')
    await prisma.medicineCatalog.deleteMany({})
  }

  const existing = force ? 0 : await prisma.medicineCatalog.count()
  console.log(`Catalog currently holds ${existing.toLocaleString('en-IN')} medicines.`)

  const stream = createReadStream(csvPath, { encoding: 'utf8' })
  const lines = createInterface({ input: stream, crlfDelay: Infinity })

  let headers: string[] = []
  let index: Record<string, number> = {}
  let batch: Prisma.MedicineCatalogCreateManyInput[] = []
  let read = 0
  let inserted = 0
  let skipped = 0
  let invalid = 0

  const flush = async () => {
    if (batch.length === 0) return
    const result = await prisma.medicineCatalog.createMany({
      data: batch,
      skipDuplicates: true,
    })
    inserted += result.count
    skipped += batch.length - result.count
    batch = []
    const done = inserted + skipped
    if (done % 15000 < BATCH_SIZE) {
      console.log(`  ${done.toLocaleString('en-IN')} rows processed…`)
    }
  }

  for await (const line of lines) {
    if (!line.trim()) continue
    if (headers.length === 0) {
      headers = parseCsvLine(line).map((h) => h.trim())
      index = Object.fromEntries(headers.map((h, i) => [h, i]))
      if (!('brand_name' in index) || !('primary_ingredient' in index)) {
        throw new Error(`Unexpected CSV headers: ${headers.join(', ')}`)
      }
      continue
    }

    read += 1
    if (limit > 0 && read > limit) break

    const fields = parseCsvLine(line)
    const get = (key: string) => clean(fields[index[key]])

    const brandName = get('brand_name')
    const genericName = get('primary_ingredient')
    if (!brandName || !genericName) {
      invalid += 1
      continue
    }

    const activeRaw = fields[index['active_ingredients']] || ''
    const strength = get('primary_strength')
    const composition = extractComposition(activeRaw, genericName, strength || '')
    const manufacturer = get('manufacturer')
    const form = get('dosage_form')
    const therapeuticClass = get('therapeutic_class')
    const packSize = get('packaging_raw') || get('pack_size')
    const priceRaw = get('price_inr')
    const price = priceRaw ? Number.parseFloat(priceRaw) : null

    batch.push({
      productId: get('product_id'),
      brandName,
      genericName,
      composition,
      strength,
      form: form ? titleCase(form) : null,
      manufacturer,
      packSize,
      price: Number.isFinite(price as number) ? (price as number) : null,
      therapeuticClass: therapeuticClass ? titleCase(therapeuticClass) : null,
      isDiscontinued: (get('is_discontinued') || '').toLowerCase() === 'true',
      searchText: [brandName, genericName, composition, manufacturer, form, therapeuticClass]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    })

    if (batch.length >= BATCH_SIZE) await flush()
  }

  await flush()

  console.log(
    `\nDone. Read ${read.toLocaleString('en-IN')} rows · inserted ${inserted.toLocaleString('en-IN')} · skipped ${skipped.toLocaleString('en-IN')} · invalid ${invalid.toLocaleString('en-IN')}`
  )
  const total = await prisma.medicineCatalog.count()
  console.log(`Catalog now holds ${total.toLocaleString('en-IN')} medicines.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
