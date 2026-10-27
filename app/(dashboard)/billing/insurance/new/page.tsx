'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/billing-utils'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FileText,
  Loader2,
  Search,
  Shield,
  User,
  X,
} from 'lucide-react'

interface PatientOption {
  id: string
  patientId: string
  firstName: string
  lastName: string
  phone: string
  email: string | null
  city: string | null
}

interface InvoiceOption {
  id: string
  invoiceNo: string
  invoiceDate: string
  totalAmount: string | number
  balanceAmount: string | number
  status: string
  insuranceClaim: { id: string; claimNumber: string; status: string } | null
}

interface PatientPolicy {
  id: string
  policyNumber: string
  isActive: boolean
  provider: { id: string; name: string; code: string | null }
}

export default function NewInsuranceClaimPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [results, setResults] = useState<PatientOption[]>([])
  const [searching, setSearching] = useState(false)
  const [patient, setPatient] = useState<PatientOption | null>(null)

  const [policies, setPolicies] = useState<PatientPolicy[]>([])
  const [invoices, setInvoices] = useState<InvoiceOption[]>([])
  const [loadingContext, setLoadingContext] = useState(false)

  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])
  const [provider, setProvider] = useState('')
  const [policyNumber, setPolicyNumber] = useState('')
  const [claimAmount, setClaimAmount] = useState('')
  const [amountTouched, setAmountTouched] = useState(false)
  const [notes, setNotes] = useState('')

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Search patients once the user has typed enough to be specific.
  useEffect(() => {
    if (patient) return
    const query = search.trim()
    if (query.length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    let cancelled = false
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(query)}&limit=8`)
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        if (!cancelled) setResults(data.patients || [])
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [search, patient])

  const selectPatient = async (next: PatientOption) => {
    setPatient(next)
    setSearch('')
    setResults([])
    setSelectedInvoices([])
    setProvider('')
    setPolicyNumber('')
    setClaimAmount('')
    setAmountTouched(false)
    setFormError(null)
    setLoadingContext(true)

    try {
      const [policiesRes, invoicesRes] = await Promise.all([
        fetch(`/api/patients/${next.id}/insurance`),
        fetch(`/api/invoices?patientId=${next.id}&limit=50`),
      ])

      if (policiesRes.ok) {
        const policyData = await policiesRes.json()
        const list: PatientPolicy[] = Array.isArray(policyData) ? policyData : []
        setPolicies(list)
        const active = list.find((policy) => policy.isActive) || list[0]
        if (active) {
          setProvider(active.provider.name)
          setPolicyNumber(active.policyNumber)
        }
      }

      if (invoicesRes.ok) {
        const invoiceData = await invoicesRes.json()
        setInvoices(invoiceData.invoices || [])
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not load patient records',
        description: 'You can still enter the claim details manually.',
      })
    } finally {
      setLoadingContext(false)
    }
  }

  const clearPatient = () => {
    setPatient(null)
    setPolicies([])
    setInvoices([])
    setSelectedInvoices([])
    setProvider('')
    setPolicyNumber('')
    setClaimAmount('')
    setAmountTouched(false)
  }

  const selectedTotal = useMemo(() => {
    return invoices
      .filter((invoice) => selectedInvoices.includes(invoice.id))
      .reduce((sum, invoice) => sum + Number(invoice.balanceAmount || 0), 0)
  }, [invoices, selectedInvoices])

  useEffect(() => {
    if (!amountTouched && selectedTotal > 0) {
      setClaimAmount(selectedTotal.toFixed(2))
    }
  }, [selectedTotal, amountTouched])

  const toggleInvoice = (invoice: InvoiceOption) => {
    if (invoice.insuranceClaim) return
    setSelectedInvoices((current) =>
      current.includes(invoice.id)
        ? current.filter((id) => id !== invoice.id)
        : [...current, invoice.id]
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError(null)

    if (!patient) {
      setFormError('Select a patient before creating a claim.')
      return
    }
    if (!provider.trim()) {
      setFormError('Enter the insurance provider.')
      return
    }
    if (!policyNumber.trim()) {
      setFormError('Enter the policy number.')
      return
    }
    const amount = Number(claimAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter a claim amount greater than zero.')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/insurance-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          insuranceProvider: provider.trim(),
          policyNumber: policyNumber.trim(),
          claimAmount: amount,
          invoiceIds: selectedInvoices,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to create insurance claim')

      toast({
        title: 'Claim created',
        description: `${data.claimNumber} saved as a draft. Submit it when the documents are ready.`,
      })
      router.push('/billing/insurance')
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/billing/insurance"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to insurance claims
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">New insurance claim</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Claims are created as drafts. Review the documents, then submit them to the insurer.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>Patient</CardTitle>
              <CardDescription>
                Search by name, patient ID, phone or email. Existing policies fill in automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {patient ? (
                <div className="flex items-start justify-between gap-3 rounded-lg border bg-muted/40 p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {patient.firstName} {patient.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {patient.patientId} · {patient.phone}
                        {patient.city ? ` · ${patient.city}` : ''}
                      </p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={clearPatient}>
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Change
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search patients…"
                    aria-label="Search patients"
                    className="pl-9"
                    autoComplete="off"
                  />
                  {search.trim().length >= 2 && (
                    <div className="mt-2 overflow-hidden rounded-lg border">
                      {searching ? (
                        <div className="space-y-2 p-3">
                          <Skeleton className="h-5 w-2/3" />
                          <Skeleton className="h-5 w-1/2" />
                        </div>
                      ) : results.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">
                          No patients match “{search.trim()}”. Check the spelling or register the
                          patient first.
                        </p>
                      ) : (
                        <ul className="divide-y">
                          {results.map((option) => (
                            <li key={option.id}>
                              <button
                                type="button"
                                onClick={() => selectPatient(option)}
                                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                              >
                                <span>
                                  <span className="block text-sm font-medium">
                                    {option.firstName} {option.lastName}
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    {option.patientId} · {option.phone}
                                  </span>
                                </span>
                                <Check className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              {policies.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Policy on file:</span>
                  {policies.map((policy) => (
                    <Badge key={policy.id} variant="outline" className="font-normal">
                      {policy.provider.name} · {policy.policyNumber}
                      {policy.isActive ? '' : ' (inactive)'}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Claim details</CardTitle>
              <CardDescription>Match these values to the insurer&apos;s paperwork.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="provider">Insurance provider *</Label>
                <Input
                  id="provider"
                  value={provider}
                  onChange={(event) => setProvider(event.target.value)}
                  placeholder="e.g. Star Health"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policy">Policy number *</Label>
                <Input
                  id="policy"
                  value={policyNumber}
                  onChange={(event) => setPolicyNumber(event.target.value)}
                  placeholder="e.g. SH-2026-4471"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Claim amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={claimAmount}
                  onChange={(event) => {
                    setAmountTouched(true)
                    setClaimAmount(event.target.value)
                  }}
                  placeholder="0.00"
                  required
                />
                {selectedTotal > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Selected invoices total {formatCurrency(selectedTotal)}.
                  </p>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes for the insurer</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Treatment summary, pre-authorization reference, or supporting context."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attach invoices</CardTitle>
              <CardDescription>
                Optional. Attaching invoices links the claim to the billed treatment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!patient ? (
                <p className="text-sm text-muted-foreground">
                  Select a patient to see their invoices.
                </p>
              ) : loadingContext ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((index) => (
                    <Skeleton key={index} className="h-10 w-full" />
                  ))}
                </div>
              ) : invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This patient has no invoices yet. You can create the claim without one.
                </p>
              ) : (
                <ul className="divide-y rounded-lg border">
                  {invoices.map((invoice) => {
                    const claimed = Boolean(invoice.insuranceClaim)
                    const selected = selectedInvoices.includes(invoice.id)
                    return (
                      <li key={invoice.id}>
                        <label
                          className={`flex items-center gap-3 px-3 py-2.5 ${
                            claimed
                              ? 'cursor-not-allowed opacity-60'
                              : 'cursor-pointer hover:bg-muted/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input accent-primary"
                            checked={selected || claimed}
                            disabled={claimed}
                            onChange={() => toggleInvoice(invoice)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2 text-sm font-medium">
                              {invoice.invoiceNo}
                              <Badge variant="outline" className="text-[10px] font-normal">
                                {invoice.status}
                              </Badge>
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              Billed {formatCurrency(Number(invoice.totalAmount))} · Balance{' '}
                              {formatCurrency(Number(invoice.balanceAmount))}
                            </span>
                          </span>
                          {claimed && invoice.insuranceClaim && (
                            <span className="text-xs text-muted-foreground">
                              Claim {invoice.insuranceClaim.claimNumber}
                            </span>
                          )}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle>Claim summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Patient</span>
                <span className="text-right font-medium">
                  {patient ? `${patient.firstName} ${patient.lastName}` : 'Not selected'}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Provider</span>
                <span className="text-right font-medium">{provider || '—'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Invoices</span>
                <span className="font-medium tabular-nums">{selectedInvoices.length}</span>
              </div>
              <div className="flex justify-between gap-3 border-t pt-3">
                <span className="text-muted-foreground">Claim amount</span>
                <span className="font-semibold tabular-nums">
                  {claimAmount ? formatCurrency(Number(claimAmount)) : '—'}
                </span>
              </div>

              {formError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{formError}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={saving || !patient}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                {saving ? 'Creating claim…' : 'Create draft claim'}
              </Button>
              <p className="text-xs text-muted-foreground">
                The claim is saved as a draft so you can review it before submitting.
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
