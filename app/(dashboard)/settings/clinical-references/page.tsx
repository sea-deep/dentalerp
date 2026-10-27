'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  PageIntro,
  ResourceState,
  useResource,
  sendJson,
  fieldClass,
} from '@/components/operations/resource'
export default function ClinicalReferencesPage() {
  const { data, loading, error, reload } = useResource<{
    references: { id: string; kind: string; label: string }[]
  }>('/api/clinical-references')
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('')
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setBusy(true)
    try {
      await sendJson('/api/clinical-references', 'POST', Object.fromEntries(new FormData(form)))
      form.reset()
      await reload()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function remove(id: string) {
    setBusy(true)
    try {
      await sendJson(`/api/clinical-references/${id}`, 'DELETE')
      await reload()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-6">
      <PageIntro title="Clinical reference lists">
        Save the complaints, findings, diagnoses and advice your clinic uses. These choices appear
        while writing treatment notes and prescriptions.
      </PageIntro>
      <form
        onSubmit={save}
        className="grid gap-4 rounded-lg border p-5 sm:grid-cols-[12rem_1fr_auto]"
      >
        <div className="space-y-2">
          <Label htmlFor="reference-kind">Category</Label>
          <select id="reference-kind" name="kind" className={fieldClass}>
            {['COMPLAINT', 'FINDING', 'DIAGNOSIS', 'ADVICE'].map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="reference-label">Saved text</Label>
          <Input id="reference-label" name="label" minLength={2} maxLength={190} required />
        </div>
        <Button className="self-end" disabled={busy}>
          Add to list
        </Button>
      </form>
      {notice && <p role="status">{notice}</p>}
      <ResourceState loading={loading} error={error} retry={reload} />
      {!loading && !error && data && (
        <div className="divide-y">
          {data.references.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{r.label}</p>
                <p className="text-sm text-muted-foreground">{r.kind}</p>
              </div>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => remove(r.id)}>
                Remove
              </Button>
            </div>
          ))}
          {!data.references.length && (
            <p className="py-6 text-muted-foreground">
              No saved entries yet. Add the text your clinic uses most often.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
