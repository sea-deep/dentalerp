'use client'

import { ReferencePicks } from '@/components/clinical/reference-picks'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'

interface Patient {
  id: string
  patientId: string
  firstName: string
  lastName: string
  phone: string
  dateOfBirth: string | null
  allergies: string | null
}

interface MedicationOption {
  id: string
  brandName: string
  genericName: string
  composition: string | null
  form: string | null
  strength: string | null
  manufacturer: string | null
}

interface MedicationRow {
  key: number
  catalogId: string | null
  medicationId: string | null
  medicationName: string
  genericName: string
  form: string | null
  dosage: string
  frequency: string
  duration: string
  route: string
  timing: string
  quantity: string
  instructions: string
}

const ROUTES = [
  'Oral',
  'Topical',
  'Sublingual',
  'Buccal',
  'IV',
  'IM',
  'Subcutaneous',
  'Inhalation',
  'Nasal',
  'Otic',
  'Ophthalmic',
  'Rectal',
  'Vaginal',
]
const TIMINGS = [
  'Before food',
  'After food',
  'With food',
  'Empty stomach',
  'At bedtime',
  'As needed',
  'Morning',
  'Evening',
  'Morning & Evening',
]

// One-click prescription defaults — the doctor only has to pick the medicine.
function defaultsFor(form: string | null | undefined, strength: string | null | undefined) {
  const value = (form || '').toLowerCase()
  const dose = strength ? `${strength}` : ''

  if (value.includes('syrup') || value.includes('suspension'))
    return {
      dosage: '5 ml',
      frequency: 'Twice daily',
      duration: '5 days',
      route: 'Oral',
      timing: 'After food',
      quantity: '100',
    }
  if (value.includes('mouthwash') || value.includes('gargle'))
    return {
      dosage: '10 ml',
      frequency: 'Twice daily',
      duration: '7 days',
      route: 'Oral',
      timing: 'After food',
      quantity: '1',
    }
  if (value.includes('drop'))
    return {
      dosage: '2 drops',
      frequency: 'Twice daily',
      duration: '5 days',
      route: 'Ophthalmic',
      timing: 'After food',
      quantity: '1',
    }
  if (value.includes('cream') || value.includes('ointment') || value.includes('gel'))
    return {
      dosage: 'Apply thin layer',
      frequency: 'Twice daily',
      duration: '7 days',
      route: 'Topical',
      timing: '',
      quantity: '1',
    }
  if (value.includes('injection') || value.includes('infusion'))
    return {
      dosage: '1 dose',
      frequency: 'Once daily',
      duration: '1 day',
      route: 'IM',
      timing: '',
      quantity: '1',
    }
  if (value.includes('inhaler') || value.includes('respule'))
    return {
      dosage: '2 puffs',
      frequency: 'Twice daily',
      duration: '7 days',
      route: 'Inhalation',
      timing: '',
      quantity: '1',
    }
  if (value.includes('capsule'))
    return {
      dosage: '1 capsule',
      frequency: 'Twice daily',
      duration: '5 days',
      route: 'Oral',
      timing: 'After food',
      quantity: '10',
    }
  if (value.includes('tablet'))
    return {
      dosage: '1 tablet',
      frequency: 'Twice daily',
      duration: '5 days',
      route: 'Oral',
      timing: 'After food',
      quantity: '10',
    }
  return {
    dosage: dose || '1 unit',
    frequency: 'Twice daily',
    duration: '5 days',
    route: 'Oral',
    timing: 'After food',
    quantity: '1',
  }
}

function dosageChoices(form: string | null | undefined) {
  const value = (form || '').toLowerCase()
  if (value.includes('syrup') || value.includes('suspension')) return ['5 ml', '10 ml', '15 ml']
  if (value.includes('mouthwash') || value.includes('gargle')) return ['10 ml', '15 ml', '20 ml']
  if (value.includes('drop')) return ['1 drop', '2 drops', '5 drops']
  if (value.includes('cream') || value.includes('ointment') || value.includes('gel'))
    return ['Apply thin layer', 'Apply generously']
  if (value.includes('injection') || value.includes('infusion')) return ['1 dose', '1 vial']
  if (value.includes('inhaler') || value.includes('respule')) return ['1 puff', '2 puffs']
  if (value.includes('capsule')) return ['1 capsule', '2 capsules']
  return ['1 tablet', '2 tablets', '1/2 tablet']
}

const FREQUENCY_CHOICES = [
  'Once daily',
  'Twice daily',
  '3 times a day',
  '4 times a day',
  'As needed',
]
const DURATION_CHOICES = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days']

let rowKey = 0

function emptyRow(): MedicationRow {
  return {
    key: ++rowKey,
    catalogId: null,
    medicationId: null,
    medicationName: '',
    genericName: '',
    form: null,
    dosage: '',
    frequency: '',
    duration: '',
    route: 'Oral',
    timing: '',
    quantity: '',
    instructions: '',
  }
}

export default function NewPrescriptionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [saving, setSaving] = useState(false)

  // Patient selection
  const [patientSearch, setPatientSearch] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [searchingPatients, setSearchingPatients] = useState(false)

  // Medication search
  const [medSearch, setMedSearch] = useState('')
  const [medOptions, setMedOptions] = useState<MedicationOption[]>([])
  const [searchingMeds, setSearchingMeds] = useState(false)
  const [activeMedRow, setActiveMedRow] = useState<number | null>(null)

  // Form data
  const [diagnosis, setDiagnosis] = useState('')
  const [notes, setNotes] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [medications, setMedications] = useState<MedicationRow[]>([emptyRow()])

  const applyMedicineToRow = useCallback((med: MedicationOption, rowIndex: number) => {
    const defaults = defaultsFor(med.form, med.strength)
    setMedications((prev) =>
      prev.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              catalogId: med.id,
              medicationId: null,
              medicationName: med.brandName,
              genericName: med.genericName,
              form: med.form,
              ...defaults,
            }
          : row
      )
    )
    setMedSearch('')
    setMedOptions([])
    setActiveMedRow(null)
  }, [])

  // Pre-fill patient and medicine from query params
  useEffect(() => {
    const pid = searchParams.get('patientId')
    if (pid) {
      fetch(`/api/patients/${pid}`)
        .then((r) => r.json())
        .then((result) => {
          if (result.success || result.data || result.id) {
            const p = result.data || result
            setSelectedPatient(p)
          }
        })
        .catch(() => {})
    }

    const medicineId = searchParams.get('medicineId')
    if (medicineId) {
      fetch(`/api/medicines/${medicineId}`)
        .then((r) => r.json())
        .then((result) => {
          if (result.success && result.data) applyMedicineToRow(result.data, 0)
        })
        .catch(() => {})
    }
  }, [searchParams, applyMedicineToRow])

  // Patient search
  useEffect(() => {
    if (patientSearch.length < 2) {
      setPatients([])
      return
    }
    const timer = setTimeout(async () => {
      setSearchingPatients(true)
      try {
        const res = await fetch(
          `/api/patients?search=${encodeURIComponent(patientSearch)}&limit=10`
        )
        const result = await res.json()
        setPatients(result.data || result.patients || [])
      } catch {
        /* ignore */
      }
      setSearchingPatients(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [patientSearch])

  // Medication search across the full Indian catalog
  useEffect(() => {
    if (medSearch.length < 2) {
      setMedOptions([])
      return
    }
    const timer = setTimeout(async () => {
      setSearchingMeds(true)
      try {
        const res = await fetch(`/api/medicines?search=${encodeURIComponent(medSearch)}&limit=12`)
        const result = await res.json()
        setMedOptions(result.data || [])
      } catch {
        /* ignore */
      }
      setSearchingMeds(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [medSearch])

  const updateMedRow = (index: number, field: keyof MedicationRow, value: string) => {
    setMedications((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  const addMedRow = () => {
    setMedications((prev) => [...prev, emptyRow()])
  }

  const removeMedRow = (index: number) => {
    if (medications.length <= 1) return
    setMedications((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!selectedPatient) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a patient' })
      return
    }

    const validMeds = medications.filter(
      (m) => m.medicationName && m.dosage && m.frequency && m.duration
    )
    if (validMeds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Add at least one medication with dosage, frequency, and duration',
      })
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          diagnosis,
          notes,
          validUntil: validUntil || null,
          medications: validMeds.map((m) => ({
            catalogId: m.catalogId,
            medicationId: m.medicationId,
            medicationName: m.medicationName,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            route: m.route,
            timing: m.timing || null,
            quantity: m.quantity ? parseInt(m.quantity) : null,
            instructions: m.instructions || null,
          })),
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      toast({
        title: 'Prescription created',
        description: `${result.data.prescriptionNo} saved successfully`,
      })
      router.push(`/prescriptions/${result.data.id}`)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const allergyWarning = useMemo(() => {
    if (!selectedPatient?.allergies) return null
    const allergies = selectedPatient.allergies
      .split(/[,;/]/)
      .map((item) => item.trim().toLowerCase())
      .filter((item) => item.length > 2)
    if (allergies.length === 0) return null
    const matches = medications
      .filter((med) => med.medicationName)
      .filter((med) => {
        const haystack = `${med.medicationName} ${med.genericName}`.toLowerCase()
        return allergies.some((allergy) => haystack.includes(allergy))
      })
      .map((med) => med.medicationName)
    return matches.length > 0 ? matches : null
  }, [selectedPatient, medications])

  const readyCount = medications.filter((med) => med.medicationName).length

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button variant="ghost" className="mb-4" onClick={() => router.push('/prescriptions')}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Prescriptions
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="h-8 w-8" />
          New Prescription
        </h1>
        <p className="text-muted-foreground">Create a new e-prescription for a patient</p>
      </div>

      <div className="space-y-6">
        {/* Patient Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Patient</CardTitle>
            <CardDescription>Select the patient for this prescription</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedPatient.patientId} · {selectedPatient.phone}
                    {selectedPatient.allergies && (
                      <span className="text-destructive ml-2">
                        Allergies: {selectedPatient.allergies}
                      </span>
                    )}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedPatient(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patient by name, ID, or phone..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="pl-9"
                />
                {(patients.length > 0 || searchingPatients) && (
                  <div className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-md max-h-60 overflow-y-auto">
                    {searchingPatients ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        Searching...
                      </div>
                    ) : (
                      patients.map((p) => (
                        <button
                          key={p.id}
                          className="w-full px-3 py-2 text-left hover:bg-accent text-sm"
                          onClick={() => {
                            setSelectedPatient(p)
                            setPatientSearch('')
                            setPatients([])
                          }}
                        >
                          <span className="font-medium">
                            {p.firstName} {p.lastName}
                          </span>
                          <span className="text-muted-foreground ml-2">
                            {p.patientId} · {p.phone}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Diagnosis */}
        <Card>
          <CardHeader>
            <CardTitle>Diagnosis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Diagnosis / Condition</Label>
              <ReferencePicks
                kind="DIAGNOSIS"
                onPick={(value) => setDiagnosis((prev) => (prev ? `${prev}; ${value}` : value))}
              />
              <Input
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g., Dental caries, Periodontal disease"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  datePresets="validity"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Medications */}
        <Card>
          <CardHeader>
            <CardTitle>Medications</CardTitle>
            <CardDescription>
              Search 2.5 lakh Indian brands or type a medicine manually. Dosage, frequency and
              duration are filled in when you pick a medicine.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {allergyWarning && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">Allergy check</p>
                  <p className="text-muted-foreground">
                    This patient is recorded as allergic to {allergyWarning.join(', ')}. Review the
                    selected medicine before prescribing.
                  </p>
                </div>
              </div>
            )}

            {medications.map((med, index) => (
              <div key={med.key} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Medication {index + 1}
                  </span>
                  {medications.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeMedRow(index)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {/* Medication name with search */}
                <div className="relative">
                  <Label>Medication Name *</Label>
                  <Input
                    value={activeMedRow === index ? medSearch : med.medicationName}
                    onChange={(e) => {
                      if (activeMedRow !== index) setActiveMedRow(index)
                      setMedSearch(e.target.value)
                      updateMedRow(index, 'medicationName', e.target.value)
                      updateMedRow(index, 'medicationId', '')
                      updateMedRow(index, 'catalogId', '')
                    }}
                    onFocus={() => setActiveMedRow(index)}
                    placeholder="Search from catalog or type name..."
                  />
                  {activeMedRow === index && medOptions.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                      {searchingMeds && (
                        <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching the Indian
                          catalog…
                        </div>
                      )}
                      {medOptions.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                          onClick={() => applyMedicineToRow(m, index)}
                        >
                          <span className="font-medium">{m.brandName}</span>
                          {m.strength && (
                            <span className="ml-1 text-muted-foreground">{m.strength}</span>
                          )}
                          {m.form && <span className="ml-1 text-muted-foreground">({m.form})</span>}
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {m.composition || m.genericName}
                            {m.manufacturer ? ` · ${m.manufacturer}` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {activeMedRow === index &&
                    medOptions.length === 0 &&
                    !searchingMeds &&
                    medSearch.length >= 2 && (
                      <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover px-3 py-2 text-xs text-muted-foreground shadow-md">
                        No match. Keep typing to prescribe manually or use the custom medicine page.
                      </div>
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <Label>Dosage *</Label>
                    <Input
                      value={med.dosage}
                      onChange={(e) => updateMedRow(index, 'dosage', e.target.value)}
                      placeholder="1 tablet"
                    />
                    <QuickChips
                      options={dosageChoices(med.form)}
                      value={med.dosage}
                      onSelect={(value) => updateMedRow(index, 'dosage', value)}
                    />
                  </div>
                  <div>
                    <Label>Frequency *</Label>
                    <Input
                      value={med.frequency}
                      onChange={(e) => updateMedRow(index, 'frequency', e.target.value)}
                      placeholder="3 times a day"
                    />
                    <QuickChips
                      options={FREQUENCY_CHOICES}
                      value={med.frequency}
                      onSelect={(value) => updateMedRow(index, 'frequency', value)}
                    />
                  </div>
                  <div>
                    <Label>Duration *</Label>
                    <Input
                      value={med.duration}
                      onChange={(e) => updateMedRow(index, 'duration', e.target.value)}
                      placeholder="5 days"
                    />
                    <QuickChips
                      options={DURATION_CHOICES}
                      value={med.duration}
                      onSelect={(value) => updateMedRow(index, 'duration', value)}
                    />
                  </div>
                  <div>
                    <Label>Route</Label>
                    <Select
                      value={med.route}
                      onValueChange={(v) => updateMedRow(index, 'route', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROUTES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Timing</Label>
                    <Select
                      value={med.timing || undefined}
                      onValueChange={(v) => updateMedRow(index, 'timing', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMINGS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={med.quantity}
                      onChange={(e) => updateMedRow(index, 'quantity', e.target.value)}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Special Instructions</Label>
                  <Input
                    value={med.instructions}
                    onChange={(e) => updateMedRow(index, 'instructions', e.target.value)}
                    placeholder="Take with warm water, avoid dairy..."
                  />
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addMedRow} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Another Medication
            </Button>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReferencePicks
              kind="ADVICE"
              onPick={(value) => setNotes((prev) => (prev ? `${prev}; ${value}` : value))}
            />
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="General advice, follow-up instructions..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="mt-2 flex flex-col gap-3 rounded-xl border bg-background/95 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {readyCount} medicine{readyCount === 1 ? '' : 's'} ready
            {selectedPatient
              ? ` for ${selectedPatient.firstName} ${selectedPatient.lastName}`
              : ' · select a patient to continue'}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push('/prescriptions')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving} size="lg">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Prescription
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickChips({
  options,
  value,
  onSelect,
}: {
  options: string[]
  value: string
  onSelect: (value: string) => void
}) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(option)}
          className={
            value === option
              ? 'rounded-full border border-primary bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary'
              : 'rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground'
          }
        >
          {option}
        </button>
      ))}
    </div>
  )
}
