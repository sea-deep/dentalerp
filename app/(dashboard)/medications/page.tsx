'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  Loader2,
  Package,
  Pill,
  Plus,
  Search,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface Medicine {
  id: string
  productId: string | null
  brandName: string
  genericName: string
  composition: string | null
  strength: string | null
  form: string | null
  manufacturer: string | null
  packSize: string | null
  price: number | null
  therapeuticClass: string | null
  isDiscontinued: boolean
  inFormulary: boolean
  formularyId: string | null
}

interface GenericRow {
  name: string
  brandCount: number
  priceFrom: number | null
  priceTo: number | null
}

interface CatalogMeta {
  total: number
  brandCount: number
  genericCount: number
  classes: Array<{ name: string; count: number }>
  forms: Array<{ name: string; count: number }>
}

const CLASS_CHIPS = [
  { label: 'All medicines', value: '' },
  { label: 'Dental essentials', value: 'dental' },
  { label: 'Antibiotics', value: 'Antibiotic' },
  { label: 'Pain & fever', value: 'Analgesic' },
  { label: 'Antacids', value: 'Antacid' },
  { label: 'Allergy', value: 'Antihistamine' },
  { label: 'Steroids', value: 'Corticosteroid' },
]

const CUSTOM_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Suspension',
  'Injection',
  'Cream',
  'Ointment',
  'Gel',
  'Drops',
  'Mouthwash',
  'Inhaler',
  'Powder',
  'Spray',
]

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const emptyCustom = {
  name: '',
  genericName: '',
  category: '',
  form: '',
  strength: '',
  manufacturer: '',
  defaultDosage: '',
  defaultFrequency: '',
  defaultDuration: '',
  contraindications: '',
  sideEffects: '',
}

const inr = (value: number | null) =>
  value == null
    ? '—'
    : new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(value)

const compact = (value: number) => new Intl.NumberFormat('en-IN').format(value)

export default function MedicationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [meta, setMeta] = useState<CatalogMeta | null>(null)

  const [tab, setTab] = useState<'brands' | 'generics'>('brands')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [formFilter, setFormFilter] = useState('')
  const [sort, setSort] = useState('name')
  const [letter, setLetter] = useState('')

  const [items, setItems] = useState<Medicine[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [generics, setGenerics] = useState<GenericRow[]>([])
  const [genericPage, setGenericPage] = useState(1)
  const [genericTotal, setGenericTotal] = useState(0)
  const [genericHasMore, setGenericHasMore] = useState(false)
  const [loadingGenerics, setLoadingGenerics] = useState(false)

  const [selected, setSelected] = useState<Medicine | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState(emptyCustom)
  const [savingCustom, setSavingCustom] = useState(false)

  const requestRef = useRef(0)

  // Debounce the search box so typing stays instant on a 250k-row catalog.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 280)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    fetch('/api/medicines/meta')
      .then((res) => res.json())
      .then((result) => {
        if (result.success) setMeta(result.data)
      })
      .catch(() => {})
  }, [])

  const fetchBrands = useCallback(
    async (nextPage: number, append: boolean) => {
      const requestId = ++requestRef.current
      if (append) setLoadingMore(true)
      else setLoading(true)
      setErrorMessage('')

      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: '30',
          sort,
        })
        if (debouncedQuery) params.set('search', debouncedQuery)
        if (classFilter === 'dental') params.set('dental', 'true')
        else if (classFilter) params.set('class', classFilter)
        if (formFilter) params.set('form', formFilter)
        if (letter) params.set('letter', letter)

        const res = await fetch(`/api/medicines?${params}`)
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Could not load medicines')
        if (requestId !== requestRef.current) return

        setItems((current) => (append ? [...current, ...result.data] : result.data))
        setTotal(result.pagination.total)
        setHasMore(result.pagination.hasMore)
        setPage(nextPage)
      } catch (error: any) {
        if (requestId !== requestRef.current) return
        setErrorMessage(error.message)
        if (!append) setItems([])
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [debouncedQuery, classFilter, formFilter, sort, letter]
  )

  const fetchGenerics = useCallback(
    async (nextPage: number, append: boolean) => {
      setLoadingGenerics(true)
      try {
        const params = new URLSearchParams({ page: String(nextPage), limit: '54' })
        if (debouncedQuery) params.set('search', debouncedQuery)
        if (letter) params.set('letter', letter)
        const res = await fetch(`/api/medicines/generics?${params}`)
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Could not load generics')
        setGenerics((current) => (append ? [...current, ...result.data] : result.data))
        setGenericTotal(result.pagination.total)
        setGenericHasMore(result.pagination.hasMore)
        setGenericPage(nextPage)
      } catch (error: any) {
        setErrorMessage(error.message)
        if (!append) setGenerics([])
      } finally {
        setLoadingGenerics(false)
      }
    },
    [debouncedQuery, letter]
  )

  useEffect(() => {
    if (tab === 'brands') fetchBrands(1, false)
  }, [tab, fetchBrands])

  useEffect(() => {
    if (tab === 'generics') fetchGenerics(1, false)
  }, [tab, fetchGenerics])

  const activeFilterLabel = useMemo(() => {
    if (letter) return `Brands starting with ${letter}`
    if (classFilter === 'dental') return 'Dental essentials'
    if (classFilter) return CLASS_CHIPS.find((c) => c.value === classFilter)?.label || classFilter
    return 'All medicines'
  }, [classFilter, letter])

  const addToFormulary = async (medicine: Medicine) => {
    setAddingId(medicine.id)
    try {
      const res = await fetch('/api/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: medicine.brandName,
          genericName: medicine.composition || medicine.genericName,
          category: medicine.therapeuticClass,
          form: medicine.form,
          strength: medicine.strength,
          manufacturer: medicine.manufacturer,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not add to formulary')
      setItems((current) =>
        current.map((item) =>
          item.id === medicine.id
            ? { ...item, inFormulary: true, formularyId: result.data.id }
            : item
        )
      )
      if (selected?.id === medicine.id) {
        setSelected({ ...selected, inFormulary: true, formularyId: result.data.id })
      }
      toast({
        title: 'Added to formulary',
        description: `${medicine.brandName} is ready to prescribe`,
      })
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not add', description: error.message })
    } finally {
      setAddingId(null)
    }
  }

  const prescribe = (medicine: Medicine) => {
    router.push(`/prescriptions/new?medicineId=${medicine.id}`)
  }

  const saveCustom = async () => {
    if (!custom.name.trim()) {
      toast({ variant: 'destructive', title: 'Name required' })
      return
    }
    setSavingCustom(true)
    try {
      const res = await fetch('/api/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(custom),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Could not save medicine')
      toast({ title: 'Medicine added', description: `${custom.name} is in your formulary` })
      setCustomOpen(false)
      setCustom(emptyCustom)
      if (tab === 'brands') fetchBrands(1, false)
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Could not save', description: error.message })
    } finally {
      setSavingCustom(false)
    }
  }

  const resetFilters = () => {
    setQuery('')
    setClassFilter('')
    setFormFilter('')
    setLetter('')
    setSort('name')
  }

  const hasFilters = Boolean(query || classFilter || formFilter || letter || sort !== 'name')

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex">
            <Pill className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Medicine library</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Every Indian brand pack, with its generic composition. Search once, prescribe in a
              click.
            </p>
            {meta && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  {compact(meta.total)} medicines
                </span>
                <span>{compact(meta.brandCount)} brands</span>
                <span>{compact(meta.genericCount)} generics</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" onClick={() => setCustomOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Custom medicine
          </Button>
          <Button asChild>
            <a href="/prescriptions/new">
              <Stethoscope className="mr-2 h-4 w-4" />
              New prescription
            </a>
          </Button>
        </div>
      </div>

      {/* Search + tabs */}
      <Card>
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  tab === 'generics'
                    ? 'Search a generic name, e.g. amoxicillin'
                    : 'Search brand, generic, salt or manufacturer, e.g. Crocin or Amoxicillin'
                }
                className="h-11 pl-9 pr-10 text-base"
                autoComplete="off"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="inline-flex rounded-lg border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setTab('brands')}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  tab === 'brands'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Brands
              </button>
              <button
                type="button"
                onClick={() => setTab('generics')}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  tab === 'generics'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Generics
              </button>
            </div>
          </div>

          {tab === 'brands' ? (
            <>
              <div className="flex flex-wrap gap-2">
                {CLASS_CHIPS.map((chip) => {
                  const active = classFilter === chip.value
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setClassFilter(chip.value)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                        active
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                      )}
                    >
                      {chip.label}
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Filter className="h-3.5 w-3.5" />
                    {activeFilterLabel}
                    {formFilter && ` · ${formFilter}`}
                  </div>
                  {hasFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={resetFilters}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Select
                    value={formFilter || 'all'}
                    onValueChange={(value) => setFormFilter(value === 'all' ? '' : value)}
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue placeholder="All forms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All forms</SelectItem>
                      {(meta?.forms ?? []).map((form) => (
                        <SelectItem key={form.name} value={form.name}>
                          {form.name} ({compact(form.count)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger className="h-8 w-[150px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name A–Z</SelectItem>
                      <SelectItem value="price-asc">Price: low to high</SelectItem>
                      <SelectItem value="price-desc">Price: high to low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setLetter('')}
                className={cn(
                  'rounded px-2 py-1 text-xs font-medium',
                  !letter
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                All
              </button>
              {ALPHABET.map((char) => (
                <button
                  key={char}
                  type="button"
                  onClick={() => setLetter(letter === char ? '' : char)}
                  className={cn(
                    'h-7 w-7 rounded text-xs font-medium transition-colors',
                    letter === char
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {char}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {tab === 'brands' ? (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3 md:px-5">
            <p className="text-sm font-medium">
              {loading
                ? 'Searching…'
                : `${compact(total)} matching medicine${total === 1 ? '' : 's'}`}
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Click a brand for composition, pack and price
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : errorMessage ? (
            <div className="px-4 py-16 text-center">
              <p className="font-medium">Could not load the medicine library</p>
              <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
              <Button className="mt-4" variant="outline" onClick={() => fetchBrands(1, false)}>
                Try again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-4 text-lg font-medium">No medicine found</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Try the generic name (for example “amoxicillin”), a shorter spelling, or clear the
                filters.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="outline" onClick={resetFilters}>
                  Clear filters
                </Button>
                <Button variant="ghost" onClick={() => setCustomOpen(true)}>
                  Add it manually
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Medicine</th>
                      <th className="px-3 py-3 font-medium">Form</th>
                      <th className="px-3 py-3 font-medium">Manufacturer</th>
                      <th className="px-3 py-3 text-right font-medium">Price</th>
                      <th className="px-5 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((medicine) => (
                      <tr
                        key={medicine.id}
                        className="border-b last:border-0 transition-colors hover:bg-muted/40"
                      >
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() => setSelected(medicine)}
                            className="text-left"
                          >
                            <span className="font-medium text-foreground hover:text-primary">
                              {medicine.brandName}
                            </span>
                            <span className="mt-0.5 block max-w-md text-xs text-muted-foreground">
                              {medicine.composition || medicine.genericName}
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-muted-foreground">
                            {[medicine.form, medicine.strength].filter(Boolean).join(' · ') || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="block max-w-[180px] truncate text-muted-foreground">
                            {medicine.manufacturer || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-medium tabular-nums">
                          {inr(medicine.price)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {medicine.inFormulary ? (
                              <Badge variant="secondary" className="gap-1 text-[11px]">
                                <Check className="h-3 w-3" /> In formulary
                              </Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => addToFormulary(medicine)}
                                disabled={addingId === medicine.id}
                              >
                                {addingId === medicine.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Plus className="mr-1 h-3.5 w-3.5" />
                                )}
                                Formulary
                              </Button>
                            )}
                            <Button size="sm" className="h-8" onClick={() => prescribe(medicine)}>
                              Prescribe
                              <ArrowRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y md:hidden">
                {items.map((medicine) => (
                  <div key={medicine.id} className="p-4">
                    <button
                      type="button"
                      onClick={() => setSelected(medicine)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium leading-snug">{medicine.brandName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {[medicine.form, medicine.strength].filter(Boolean).join(' · ') ||
                              'Form not listed'}
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold tabular-nums">{inr(medicine.price)}</p>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                        {medicine.composition || medicine.genericName}
                      </p>
                      {medicine.manufacturer && (
                        <p className="mt-1 truncate text-[11px] text-muted-foreground">
                          {medicine.manufacturer}
                        </p>
                      )}
                    </button>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => prescribe(medicine)}>
                        Prescribe
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                      {medicine.inFormulary ? (
                        <Button size="sm" variant="outline" className="flex-1" disabled>
                          <Check className="mr-1 h-3.5 w-3.5" /> In formulary
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => addToFormulary(medicine)}
                          disabled={addingId === medicine.id}
                        >
                          {addingId === medicine.id ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Plus className="mr-1 h-3.5 w-3.5" />
                          )}
                          Formulary
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="border-t p-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => fetchBrands(page + 1, true)}
                    disabled={loadingMore}
                  >
                    {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Show 30 more
                    <ChevronDown className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3 md:px-5">
            <p className="text-sm font-medium">
              {loadingGenerics ? 'Loading generics…' : `${compact(genericTotal)} generic medicines`}
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Click a generic to see every Indian brand
            </p>
          </div>

          {loadingGenerics ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : generics.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-lg font-medium">No generic found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a molecule name such as “amoxicillin” or “ibuprofen”.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-3">
                {generics.map((generic) => (
                  <button
                    key={generic.name}
                    type="button"
                    onClick={() => {
                      setTab('brands')
                      setClassFilter('')
                      setFormFilter('')
                      setLetter('')
                      setQuery(generic.name)
                    }}
                    className="group flex flex-col gap-2 bg-card p-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-medium group-hover:text-primary">{generic.name}</span>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{compact(generic.brandCount)} brands</span>
                      {generic.priceFrom != null && (
                        <span>
                          {inr(generic.priceFrom)}
                          {generic.priceTo != null && generic.priceTo !== generic.priceFrom
                            ? ` – ${inr(generic.priceTo)}`
                            : ''}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {genericHasMore && (
                <div className="border-t p-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => fetchGenerics(genericPage + 1, true)}
                    disabled={loadingGenerics}
                  >
                    {loadingGenerics && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Show more generics
                    <ChevronDown className="ml-1.5 h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* Medicine detail dialog */}
      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8 text-xl leading-snug">
                  {selected.brandName}
                </DialogTitle>
                <DialogDescription>
                  {selected.composition || selected.genericName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Detail label="Generic" value={selected.genericName} />
                  <Detail
                    label="Form & strength"
                    value={[selected.form, selected.strength].filter(Boolean).join(' · ')}
                  />
                  <Detail label="Pack" value={selected.packSize} />
                  <Detail label="Price" value={inr(selected.price)} />
                  <Detail label="Manufacturer" value={selected.manufacturer} />
                  <Detail label="Class" value={selected.therapeuticClass} />
                </div>

                {selected.composition && (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Composition
                    </p>
                    <p className="mt-1 text-sm">{selected.composition}</p>
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="flex-1" onClick={() => prescribe(selected)}>
                    <Stethoscope className="mr-2 h-4 w-4" />
                    Prescribe this medicine
                  </Button>
                  {selected.inFormulary ? (
                    <Button variant="outline" className="flex-1" disabled>
                      <Check className="mr-2 h-4 w-4" />
                      In formulary
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => addToFormulary(selected)}
                      disabled={addingId === selected.id}
                    >
                      {addingId === selected.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Add to formulary
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom medicine dialog — kept intentionally short */}
      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add a custom medicine</DialogTitle>
            <DialogDescription>
              For compounds or brands that are not in the national catalog.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Brand / medicine name *</Label>
              <Input
                value={custom.name}
                onChange={(event) =>
                  setCustom((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="e.g. Clinic fluoride varnish"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Generic name / composition</Label>
              <Input
                value={custom.genericName}
                onChange={(event) =>
                  setCustom((current) => ({ ...current, genericName: event.target.value }))
                }
                placeholder="e.g. Sodium fluoride 5%"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={custom.category}
                onChange={(event) =>
                  setCustom((current) => ({ ...current, category: event.target.value }))
                }
                placeholder="e.g. Antiseptic"
              />
            </div>
            <div>
              <Label>Form</Label>
              <Select
                value={custom.form || undefined}
                onValueChange={(value) => setCustom((current) => ({ ...current, form: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select form" />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOM_FORMS.map((form) => (
                    <SelectItem key={form} value={form}>
                      {form}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Strength</Label>
              <Input
                value={custom.strength}
                onChange={(event) =>
                  setCustom((current) => ({ ...current, strength: event.target.value }))
                }
                placeholder="e.g. 5%"
              />
            </div>
            <div>
              <Label>Manufacturer</Label>
              <Input
                value={custom.manufacturer}
                onChange={(event) =>
                  setCustom((current) => ({ ...current, manufacturer: event.target.value }))
                }
                placeholder="e.g. ICPA"
              />
            </div>
            <div className="md:col-span-2 border-t pt-4">
              <p className="mb-3 text-sm font-medium">Default prescription</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Dosage</Label>
                  <Input
                    value={custom.defaultDosage}
                    onChange={(event) =>
                      setCustom((current) => ({ ...current, defaultDosage: event.target.value }))
                    }
                    placeholder="1 tablet"
                  />
                </div>
                <div>
                  <Label>Frequency</Label>
                  <Input
                    value={custom.defaultFrequency}
                    onChange={(event) =>
                      setCustom((current) => ({ ...current, defaultFrequency: event.target.value }))
                    }
                    placeholder="Twice daily"
                  />
                </div>
                <div>
                  <Label>Duration</Label>
                  <Input
                    value={custom.defaultDuration}
                    onChange={(event) =>
                      setCustom((current) => ({ ...current, defaultDuration: event.target.value }))
                    }
                    placeholder="5 days"
                  />
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <Label>Notes / contraindications</Label>
              <Textarea
                rows={2}
                value={custom.contraindications}
                onChange={(event) =>
                  setCustom((current) => ({ ...current, contraindications: event.target.value }))
                }
                placeholder="Allergies, interactions, special instructions…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCustom} disabled={savingCustom}>
              {savingCustom && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save medicine
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm">{value || '—'}</p>
    </div>
  )
}
