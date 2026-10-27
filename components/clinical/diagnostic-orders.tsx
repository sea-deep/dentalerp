'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  PageIntro,
  ResourceState,
  useResource,
  sendJson,
  fieldClass,
} from '@/components/operations/resource'
type Order = {
  id: string
  patientId: string
  kind: string
  testName: string
  instructions: string | null
  status: string
  result: string | null
  documentId: string | null
  createdAt: string
  patient?: { firstName: string; lastName: string; patientId: string }
}
export function DiagnosticOrders({ patientId }: { patientId?: string }) {
  const { data: session } = useSession()
  const { data, loading, error, reload } = useResource<{ orders: Order[] }>(
    `/api/diagnostics${patientId ? `?patientId=${patientId}` : ''}`
  )
  const [search, setSearch] = useState(''),
    [selectedPatient, setSelectedPatient] = useState(patientId || ''),
    [doctor, setDoctor] = useState('')
  const patients = useResource<{
    patients: { id: string; firstName: string; lastName: string; patientId: string }[]
  }>(`/api/patients?limit=20&search=${encodeURIComponent(search)}`)
  const doctors = useResource<{ doctors: { id: string; firstName: string; lastName: string }[] }>(
    '/api/staff/doctors'
  )
  const [selected, setSelected] = useState<Order | null>(null),
    [status, setStatus] = useState('COLLECTED'),
    [result, setResult] = useState(''),
    [documentId, setDocumentId] = useState(''),
    [documents, setDocuments] = useState<{ id: string; originalName: string }[]>([])
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('')
  useEffect(() => {
    if (session?.user?.staffId) setDoctor(session.user.staffId)
  }, [session])
  useEffect(() => {
    setDocuments([])
    if (!selected) return
    let active = true
    sendJson(`/api/patients/${selected.patientId}/documents`, 'GET')
      .then((d) => {
        if (active) setDocuments(d.documents || d.data || [])
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [selected])
  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setBusy(true)
    setNotice('')
    try {
      await sendJson('/api/diagnostics', 'POST', {
        ...Object.fromEntries(new FormData(form)),
        patientId: selectedPatient,
        doctorId: doctor,
      })
      form.reset()
      await reload()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setBusy(true)
    setNotice('')
    try {
      await sendJson(`/api/diagnostics/${selected.id}`, 'PATCH', {
        status,
        result,
        documentId: documentId || undefined,
      })
      setSelected(null)
      await reload()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-6">
      <PageIntro title="Tests and radiographs">
        Order pathology tests or dental imaging, record results and link reports from the patient’s
        uploaded documents.
      </PageIntro>
      {session?.user?.role !== 'LAB_TECH' && (
        <form onSubmit={create} className="space-y-4 rounded-lg border p-5">
          <h2 className="text-lg font-medium">New diagnostic order</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {!patientId && (
              <div className="space-y-2">
                <Label htmlFor="diagnostic-search">Find patient</Label>
                <Input
                  id="diagnostic-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, phone or patient ID"
                />
                <Label htmlFor="diagnostic-patient">Patient</Label>
                <select
                  id="diagnostic-patient"
                  value={selectedPatient}
                  onChange={(e) => setSelectedPatient(e.target.value)}
                  className={fieldClass}
                  required
                >
                  <option value="">Choose patient</option>
                  {patients.data?.patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} · {p.patientId}
                    </option>
                  ))}
                </select>
                {patients.error && <p role="alert">{patients.error}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="diagnostic-doctor">Ordering doctor</Label>
              <select
                id="diagnostic-doctor"
                value={doctor}
                onChange={(e) => setDoctor(e.target.value)}
                className={fieldClass}
                required
              >
                <option value="">Choose doctor</option>
                {doctors.data?.doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.firstName} {d.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="diagnostic-kind">Test type</Label>
              <select id="diagnostic-kind" name="kind" className={fieldClass}>
                <option value="PATHOLOGY">Pathology</option>
                <option value="RADIOGRAPH">Radiograph / X-ray</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="diagnostic-name">Test / imaging name</Label>
              <Input
                id="diagnostic-name"
                name="testName"
                minLength={2}
                maxLength={190}
                required
                placeholder="CBC, OPG, IOPA…"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="diagnostic-instructions">Instructions (optional)</Label>
            <Textarea id="diagnostic-instructions" name="instructions" maxLength={2000} />
          </div>
          <Button disabled={busy || !!doctors.error || !selectedPatient}>
            {busy ? 'Saving…' : 'Create order'}
          </Button>
        </form>
      )}
      {notice && <p role="status">{notice}</p>}
      <ResourceState loading={loading} error={error} retry={reload} />
      {!loading && !error && data && (
        <div className="divide-y">
          {data.orders.map((o) => (
            <div key={o.id} className="flex flex-wrap justify-between gap-4 py-5">
              <div className="space-y-1">
                <h2 className="font-medium">
                  {o.testName} · {o.status}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {o.patient?.firstName} {o.patient?.lastName} · {o.kind} ·{' '}
                  {o.createdAt.slice(0, 10)}
                </p>
                <p className="text-sm whitespace-pre-wrap">{o.instructions}</p>
                {o.result && <p className="text-sm whitespace-pre-wrap">Result: {o.result}</p>}
                {o.documentId && (
                  <a
                    href={`/api/patients/${o.patientId}/documents/${o.documentId}?download=true`}
                    className="text-sm underline"
                  >
                    Open linked report
                  </a>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelected(o)
                  setStatus(o.status)
                  setResult(o.result || '')
                  setDocumentId(o.documentId || '')
                }}
              >
                Update report
              </Button>
            </div>
          ))}
          {!data.orders.length && (
            <p className="py-6 text-muted-foreground">No tests or radiographs ordered yet.</p>
          )}
        </div>
      )}
      {selected && (
        <form onSubmit={save} className="space-y-4 rounded-lg border p-5">
          <h2 className="text-lg font-medium">Update {selected.testName}</h2>
          <div className="space-y-2">
            <Label htmlFor="diagnostic-status">Status</Label>
            <select
              id="diagnostic-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={fieldClass}
            >
              {['ORDERED', 'COLLECTED', 'REPORTED', 'CANCELLED'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="diagnostic-result">Result / report</Label>
            <Textarea
              id="diagnostic-result"
              value={result}
              onChange={(e) => setResult(e.target.value)}
              maxLength={10000}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="diagnostic-document">Attach a patient document</Label>
            <select
              id="diagnostic-document"
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
              className={fieldClass}
            >
              <option value="">No linked document</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.originalName}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground">
              Upload files in the patient’s Documents tab first.
            </p>
          </div>
          <div className="flex gap-3">
            <Button disabled={busy}>Save report</Button>
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
