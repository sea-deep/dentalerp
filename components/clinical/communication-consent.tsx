'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useResource, sendJson, ResourceState } from '@/components/operations/resource'
export function CommunicationConsent({ patientId }: { patientId: string }) {
  const { data, loading, error, reload } = useResource<{
    whatsappEnabled: boolean
    appointmentReminders: boolean
  }>(`/api/patients/${patientId}/communication-preferences`)
  const [enabled, setEnabled] = useState(false),
    [reminders, setReminders] = useState(true),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('')
  useEffect(() => {
    if (data) {
      setEnabled(data.whatsappEnabled)
      setReminders(data.appointmentReminders)
    }
  }, [data])
  async function save() {
    setBusy(true)
    try {
      await sendJson(`/api/patients/${patientId}/communication-preferences`, 'PUT', {
        whatsappEnabled: enabled,
        appointmentReminders: reminders,
        consentConfirmed: confirmed,
      })
      setConfirmed(false)
      setNotice('Communication preferences saved.')
      await reload()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="space-y-4 rounded-lg border p-5">
      <h2 className="text-lg font-medium">Patient communications</h2>
      <ResourceState loading={loading} error={error} retry={reload} />
      {data && !loading && !error && (
        <>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            WhatsApp appointment updates and documents
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={reminders}
              onChange={(e) => setReminders(e.target.checked)}
            />
            Appointment reminders
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            The patient confirmed these preferences.
          </label>
          <Button variant="outline" disabled={busy || !confirmed} onClick={save}>
            Save communication consent
          </Button>
        </>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  )
}
