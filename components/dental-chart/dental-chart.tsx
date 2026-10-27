'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useId } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  Check,
  ChevronRight,
  History,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Smile,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { cn, formatEnumLabel } from '@/lib/utils'
import type {
  DentalChartEntry,
  DentalChartProps,
  DentitionType,
  NotationSystem,
} from './dental-chart-types'
import { FDI_TO_UNIVERSAL, TOOTH_NAMES } from './anatomic-tooth'
import { DentalArchView } from './dental-arch-view'
import {
  TOOTH_CONDITIONS,
  SURFACES,
  EMPTY_SURFACES,
  groupEntries,
  chartSummary,
} from './chart-model'

export type { DentalChartEntry, DentalChartProps, DentitionType, NotationSystem }
export { TOOTH_NAMES, FDI_TO_UNIVERSAL, TOOTH_CONDITIONS }

export function DentalChart({
  patientId,
  selectedTeeth = [],
  onTeethSelect,
  editable = true,
  entries: propEntries,
}: DentalChartProps) {
  const { toast } = useToast()
  const formId = useId()
  const [loading, setLoading] = useState(propEntries === undefined)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [chartData, setChartData] = useState<Record<number, DentalChartEntry[]>>(() =>
    groupEntries(propEntries || [])
  )
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)
  const [dentition, setDentition] = useState<DentitionType>(
    selectedTeeth.some((tooth) => tooth > 50)
      ? selectedTeeth.some((tooth) => tooth < 50)
        ? 'BOTH'
        : 'PEDIATRIC'
      : 'ADULT'
  )
  const [notation, setNotation] = useState<NotationSystem>('FDI')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [condition, setCondition] = useState('')
  const [severity, setSeverity] = useState('MILD')
  const [notes, setNotes] = useState('')
  const [surfaces, setSurfaces] = useState({ ...EMPTY_SURFACES })
  const [dirty, setDirty] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [feedback, setFeedback] = useState('')
  const request = useRef(0)
  const savingRef = useRef(false)
  const inspectorRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (selectedTooth && window.matchMedia('(max-width: 1279px)').matches) {
      inspectorRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
    }
  }, [selectedTooth])

  const fetchChartData = useCallback(async () => {
    const version = ++request.current
    if (propEntries !== undefined) {
      setChartData(groupEntries(propEntries))
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dental-chart?patientId=${encodeURIComponent(patientId)}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('The dental chart could not be loaded. Please retry.')
      const data = await res.json()
      if (version === request.current)
        setChartData(
          groupEntries(
            data.entries || (Object.values(data.chartData || {}).flat() as DentalChartEntry[])
          )
        )
    } catch (err) {
      if (version === request.current)
        setError(err instanceof Error ? err.message : 'Unable to load the chart.')
    } finally {
      if (version === request.current) setLoading(false)
    }
  }, [patientId, propEntries])

  useEffect(() => {
    setSelectedTooth(null)
    setDirty(false)
    setFeedback('')
    setChartData({})
    void fetchChartData()
    return () => {
      request.current++
    }
  }, [fetchChartData])

  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const guardNavigation = (event: MouseEvent) => {
      if (
        !(event.target instanceof Element) ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const link = event.target.closest('a[href]') as HTMLAnchorElement | null
      const tab = event.target.closest('[role="tab"][aria-selected="false"]')
      if ((!link || link.target === '_blank' || link.getAttribute('href')?.startsWith('#')) && !tab)
        return
      if (savingRef.current || !window.confirm('Discard the unsaved finding?')) {
        event.preventDefault()
        event.stopPropagation()
      } else setDirty(false)
    }
    document.addEventListener('click', guardNavigation, true)
    window.addEventListener('beforeunload', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
      document.removeEventListener('click', guardNavigation, true)
    }
  }, [dirty])

  const resetForm = (entry?: DentalChartEntry) => {
    setFormOpen(!!entry)
    setEditingId(entry?.id || null)
    setCondition(entry?.condition || '')
    setSeverity(entry?.severity || 'MILD')
    setNotes(entry?.notes || '')
    setSurfaces(
      entry
        ? (Object.fromEntries(
            SURFACES.map(({ key }) => [key, entry[key]])
          ) as typeof EMPTY_SURFACES)
        : { ...EMPTY_SURFACES }
    )
    setDirty(false)
  }
  const canLeave = () => !dirty || window.confirm('Discard the unsaved finding?')
  const selectTooth = (number: number) => {
    if (savingRef.current) return
    if (onTeethSelect) {
      onTeethSelect(
        selectedTeeth.includes(number)
          ? selectedTeeth.filter((tooth) => tooth !== number)
          : [...selectedTeeth, number]
      )
      return
    }
    if (number === selectedTooth || !canLeave()) return
    setSelectedTooth(number)
    resetForm()
    setFormOpen(!(chartData[number] || []).some((entry) => !entry.resolvedDate))
    setShowHistory(false)
    setFeedback('')
  }
  const stats = useMemo(() => chartSummary(chartData, dentition), [chartData, dentition])
  const toothEntries = selectedTooth ? chartData[selectedTooth] || [] : []
  const activeEntries = toothEntries.filter((entry) => !entry.resolvedDate)
  const historyEntries = toothEntries.filter((entry) => entry.resolvedDate)
  const activeFindings = Object.values(chartData)
    .flat()
    .filter(
      (entry) =>
        !entry.resolvedDate &&
        entry.condition !== 'HEALTHY' &&
        (dentition === 'BOTH' ||
          (dentition === 'ADULT' ? entry.toothNumber < 50 : entry.toothNumber > 50))
    )
  const total = dentition === 'ADULT' ? 32 : dentition === 'PEDIATRIC' ? 20 : 52
  const displayNumber = (number: number) =>
    notation === 'FDI' ? String(number) : FDI_TO_UNIVERSAL[number]

  const saveFinding = async () => {
    if (!selectedTooth || !condition || !editable || savingRef.current) return
    savingRef.current = true
    setSaving(true)
    setFeedback('')
    const version = request.current
    try {
      const res = await fetch(editingId ? `/api/dental-chart/${editingId}` : '/api/dental-chart', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          toothNumber: selectedTooth,
          condition,
          severity,
          notes: notes.trim() || null,
          ...surfaces,
        }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'The finding was not saved. Try again.')
      if (version !== request.current) return
      // Apply the server-confirmed entry. Preserve unsaved input if the request fails.
      setChartData((previous) => {
        const prior = previous[selectedTooth] || []
        const next = editingId
          ? prior.map((entry) =>
              entry.id === editingId
                ? payload
                : ['MISSING', 'EXTRACTION'].includes(condition) &&
                    activeEntries.find((item) => item.id === editingId)?.condition !== condition &&
                    !entry.resolvedDate
                  ? { ...entry, resolvedDate: new Date().toISOString() }
                  : entry
            )
          : [
              payload,
              ...prior.map((entry) =>
                ['MISSING', 'EXTRACTION'].includes(condition) && !entry.resolvedDate
                  ? { ...entry, resolvedDate: payload.diagnosedDate }
                  : entry
              ),
            ]
        return { ...previous, [selectedTooth]: next }
      })
      resetForm()
      setFeedback(`Finding saved for tooth ${displayNumber(selectedTooth)}.`)
      toast({
        title: 'Finding saved',
        description: `Tooth ${displayNumber(selectedTooth)} · ${formatEnumLabel(condition)}`,
      })
    } catch (err) {
      if (version !== request.current) return
      const message = err instanceof Error ? err.message : 'The finding was not saved.'
      setFeedback(message)
      toast({ variant: 'destructive', title: 'Could not save finding', description: message })
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  const resolveFinding = async (entry: DentalChartEntry) => {
    if (!editable || savingRef.current || !canLeave()) return
    savingRef.current = true
    setSaving(true)
    const version = request.current
    try {
      const res = await fetch(`/api/dental-chart/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolvedDate: new Date().toISOString() }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || 'The finding could not be resolved.')
      if (version !== request.current) return
      setChartData((previous) => ({
        ...previous,
        [entry.toothNumber]: (previous[entry.toothNumber] || []).map((item) =>
          item.id === entry.id ? payload : item
        ),
      }))
      resetForm()
      setFeedback('Finding marked resolved. It remains in the history.')
    } catch (err) {
      if (version === request.current)
        toast({
          variant: 'destructive',
          title: 'Could not resolve finding',
          description: err instanceof Error ? err.message : 'Please retry.',
        })
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  if (loading)
    return (
      <section
        className="space-y-5 rounded-lg border bg-card p-6"
        aria-label="Loading dental chart"
        aria-busy="true"
      >
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-80 w-full" />
      </section>
    )
  if (error)
    return (
      <section
        role="alert"
        className="flex flex-wrap items-center gap-4 rounded-lg border border-destructive/30 bg-card p-6"
      >
        <AlertCircle className="h-5 w-5 text-destructive" />
        <div className="flex-1">
          <h2 className="font-semibold">Chart unavailable</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" onClick={() => void fetchChartData()}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </section>
    )

  return (
    <section
      className="min-w-0 overflow-hidden rounded-lg border bg-card"
      aria-label="Dental chart"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Dental chart</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {onTeethSelect
              ? 'Select teeth to associate with this treatment.'
              : 'Select a tooth to record a finding or review its history.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div
            className="flex rounded-md border bg-muted/40 p-0.5"
            role="group"
            aria-label="Dentition"
          >
            {(
              [
                ['ADULT', 'Permanent'],
                ['PEDIATRIC', 'Primary'],
                ['BOTH', 'Mixed'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={dentition === value}
                disabled={saving}
                onClick={() => {
                  if (canLeave()) {
                    setDentition(value)
                    setSelectedTooth(null)
                    resetForm()
                  }
                }}
                className={cn(
                  'min-h-8 rounded px-3 text-xs font-medium transition-colors',
                  dentition === value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Notation
            <select
              aria-label="Tooth notation"
              value={notation}
              onChange={(event) => setNotation(event.target.value as NotationSystem)}
              className="h-9 rounded-md border bg-background px-2 text-xs font-medium text-foreground"
            >
              <option value="FDI">FDI</option>
              <option value="UNIVERSAL">Universal</option>
            </select>
          </label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2 border-b bg-muted/20 px-5 py-3 text-xs">
        <span>
          <strong className="text-sm tabular-nums">
            {stats.charted}
            <span className="font-normal text-muted-foreground"> / {total}</span>
          </strong>{' '}
          <span className="ml-1 text-muted-foreground">teeth charted</span>
        </span>
        <span>
          <strong className="text-sm tabular-nums">{stats.findings}</strong>{' '}
          <span className="ml-1 text-muted-foreground">active findings</span>
        </span>
        <span>
          <strong className="text-sm tabular-nums">{stats.caries}</strong>{' '}
          <span className="ml-1 text-muted-foreground">with caries</span>
        </span>
        <span>
          <strong className="text-sm tabular-nums">{stats.restored}</strong>{' '}
          <span className="ml-1 text-muted-foreground">with restorations</span>
        </span>
        <span className="ml-auto text-muted-foreground">
          {editable ? 'Clinical record' : 'Read only'}
        </span>
      </div>
      <div className={cn('grid min-w-0', !onTeethSelect && 'xl:grid-cols-[minmax(0,1fr)_320px]')}>
        <div className="min-w-0 p-5 lg:p-6">
          <DentalArchView
            dentition={dentition}
            notation={notation}
            chartData={chartData}
            selectedTeeth={onTeethSelect ? selectedTeeth : selectedTooth ? [selectedTooth] : []}
            onToothClick={selectTooth}
          />
          <div
            className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 text-[11px] text-muted-foreground"
            aria-label="Condition legend"
          >
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full border border-muted-foreground" />
              Not charted
            </span>
            {TOOTH_CONDITIONS.map((item) => (
              <span key={item.value} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
          {onTeethSelect ? (
            <p className="mt-4 text-sm font-medium" role="status">
              {selectedTeeth.length
                ? `Selected: ${selectedTeeth.map(displayNumber).join(', ')}`
                : 'No teeth selected'}
            </p>
          ) : (
            <div className="mt-6 border-t pt-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Recorded findings</h3>
                <span className="text-xs text-muted-foreground">
                  {activeFindings.length} active
                </span>
              </div>
              {activeFindings.length === 0 ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  No active findings recorded for this dentition. Uncharted teeth have not been
                  assessed.
                </p>
              ) : (
                <div className="max-h-48 divide-y overflow-y-auto">
                  {activeFindings.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => selectTooth(entry.toothNumber)}
                      className="flex w-full items-center gap-3 rounded px-1 py-2.5 text-left text-xs hover:bg-muted"
                    >
                      <span className="w-7 font-semibold tabular-nums text-primary">
                        {displayNumber(entry.toothNumber)}
                      </span>
                      <span className="flex-1 font-medium">
                        {formatEnumLabel(entry.condition)}
                        <span className="ml-2 font-normal text-muted-foreground">
                          {SURFACES.filter(({ key }) => entry[key])
                            .map(({ short }) => short)
                            .join(' · ')}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        {formatEnumLabel(entry.severity)}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {!onTeethSelect && (
          <aside
            ref={inspectorRef}
            className="min-w-0 border-t bg-muted/20 p-5 xl:border-l xl:border-t-0"
            aria-label="Tooth finding details"
          >
            {!selectedTooth ? (
              <div className="flex h-full min-h-80 flex-col items-center justify-center px-3 text-center">
                <Smile className="mb-4 h-9 w-9 text-primary" strokeWidth={1.3} />
                <h3 className="font-semibold">Start with a tooth</h3>
                <p className="mt-2 max-w-60 text-sm leading-relaxed text-muted-foreground">
                  Select any tooth to review findings, record affected surfaces, and keep clinical
                  notes together.
                </p>
                <p className="mt-5 text-xs text-muted-foreground">
                  Click with your mouse, or use
                  <br />
                  arrow keys and Enter.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <button
                  type="button"
                  className="text-xs font-medium text-primary xl:hidden"
                  onClick={() =>
                    document
                      .querySelector<HTMLButtonElement>(`[data-tooth="${selectedTooth}"]`)
                      ?.focus()
                  }
                >
                  Back to chart
                </button>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">Tooth {displayNumber(selectedTooth)}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {TOOTH_NAMES[selectedTooth]}
                    </p>
                  </div>
                  <Badge variant="outline">{notation}</Badge>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold">
                    Current record{' '}
                    <span className="font-normal text-muted-foreground">
                      ({activeEntries.length})
                    </span>
                  </h4>
                  {activeEntries.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No findings recorded for this tooth.
                    </p>
                  )}
                  {activeEntries.map((entry) => (
                    <div key={entry.id} className="border-b py-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{formatEnumLabel(entry.condition)}</span>
                        <span className="text-muted-foreground">
                          {formatEnumLabel(entry.severity)}
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="mt-1 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                          {entry.notes}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {SURFACES.filter(({ key }) => entry[key])
                          .map(({ short }) => short)
                          .join(' · ') || 'No surfaces specified'}{' '}
                        · {new Date(entry.diagnosedDate).toLocaleDateString('en-IN')}
                      </p>
                      {editable && (
                        <div className="mt-2 flex gap-4">
                          <button
                            type="button"
                            disabled={saving}
                            className="font-medium text-primary underline-offset-4 hover:underline"
                            onClick={() => {
                              if (canLeave()) resetForm(entry)
                            }}
                          >
                            Edit finding
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            className="text-muted-foreground underline-offset-4 hover:underline"
                            onClick={() => void resolveFinding(entry)}
                          >
                            Mark resolved
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {editable && !formOpen && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      resetForm()
                      setFormOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add finding
                  </Button>
                )}
                {editable && formOpen && (
                  <form
                    className="space-y-4 border-t pt-4"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void saveFinding()
                    }}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                        event.preventDefault()
                        void saveFinding()
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                        {editingId ? (
                          <Save className="h-3.5 w-3.5" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        {editingId ? 'Edit finding' : 'New finding'}
                      </h4>
                      {dirty && <span className="text-[11px] text-muted-foreground">Unsaved</span>}
                    </div>
                    <fieldset disabled={saving} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor={`${formId}-condition`} className="text-xs">
                          Condition
                        </Label>
                        <select
                          id={`${formId}-condition`}
                          required
                          value={condition}
                          onChange={(event) => {
                            setCondition(event.target.value)
                            setDirty(true)
                          }}
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="" disabled>
                            Select a condition
                          </option>
                          {TOOTH_CONDITIONS.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`${formId}-severity`} className="text-xs">
                          Severity
                        </Label>
                        <select
                          id={`${formId}-severity`}
                          value={severity}
                          onChange={(event) => {
                            setSeverity(event.target.value)
                            setDirty(true)
                          }}
                          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                          <option value="MILD">Mild</option>
                          <option value="MODERATE">Moderate</option>
                          <option value="SEVERE">Severe</option>
                        </select>
                      </div>
                      <fieldset>
                        <legend className="mb-2 text-xs font-medium">Affected surfaces</legend>
                        <div className="flex flex-wrap gap-1.5">
                          {SURFACES.map(({ key, short, label }) => (
                            <button
                              key={key}
                              type="button"
                              aria-label={label}
                              aria-pressed={surfaces[key]}
                              title={label}
                              onClick={() => {
                                setSurfaces((previous) => ({ ...previous, [key]: !previous[key] }))
                                setDirty(true)
                              }}
                              className={cn(
                                'flex h-10 min-w-10 items-center justify-center rounded-md border px-2 text-xs font-semibold transition-colors',
                                surfaces[key]
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'bg-background hover:bg-muted'
                              )}
                            >
                              {short}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                          M mesial · D distal · O/I occlusal/incisal
                          <br />
                          B/F buccal/facial · L/P lingual/palatal
                        </p>
                      </fieldset>
                      <div className="space-y-1.5">
                        <Label htmlFor={`${formId}-notes`} className="text-xs">
                          Clinical notes
                        </Label>
                        <Textarea
                          id={`${formId}-notes`}
                          value={notes}
                          onChange={(event) => {
                            setNotes(event.target.value)
                            setDirty(true)
                          }}
                          rows={3}
                          placeholder="Observations, symptoms, and examination notes…"
                          className="resize-y bg-background text-sm"
                        />
                      </div>
                      {condition && ['MISSING', 'EXTRACTION'].includes(condition) && (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Saving this status resolves existing active findings for this tooth. They
                          remain in history.
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          disabled={!condition || !dirty || saving}
                          className="flex-1 gap-2"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          {saving ? 'Saving…' : editingId ? 'Save changes' : 'Save finding'}
                        </Button>
                        {(dirty || editingId) && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              if (canLeave()) resetForm()
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                      <p className="text-center text-[11px] text-muted-foreground">
                        Ctrl / ⌘ + Enter to save
                      </p>
                    </fieldset>
                  </form>
                )}
                <p
                  className="text-xs leading-relaxed text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  {feedback}
                </p>
                {historyEntries.length > 0 && (
                  <div className="border-t pt-3">
                    <button
                      type="button"
                      aria-expanded={showHistory}
                      className="flex items-center gap-2 text-xs font-medium"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      <History className="h-3.5 w-3.5" />
                      Resolved history ({historyEntries.length})
                    </button>
                    {showHistory && (
                      <div className="mt-3 space-y-3">
                        {historyEntries.map((entry) => (
                          <div key={entry.id} className="text-xs">
                            <span className="font-medium">{formatEnumLabel(entry.condition)}</span>
                            <p className="mt-1 text-muted-foreground">
                              Resolved {new Date(entry.resolvedDate!).toLocaleDateString('en-IN')}
                            </p>
                            {entry.notes && (
                              <p className="mt-1 text-muted-foreground">{entry.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {editable && (
                  <Link
                    href={`/treatments/new?patientId=${encodeURIComponent(patientId)}&teeth=${selectedTooth}`}
                    className="flex items-center gap-2 border-t pt-4 text-xs font-medium text-primary"
                    onClick={(event) => {
                      if (saving) event.preventDefault()
                    }}
                  >
                    Record a treatment
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </section>
  )
}
