'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useResource, sendJson, ResourceState, fieldClass } from '@/components/operations/resource'
const measurements = [
  ['weightKg', 'Weight (kg)', 0.1, 700],
  ['heightCm', 'Height (cm)', 0.1, 300],
  ['systolicBP', 'Systolic BP (mmHg)', 1, 350],
  ['diastolicBP', 'Diastolic BP (mmHg)', 1, 250],
  ['pulse', 'Pulse (bpm)', 1, 300],
  ['temperatureC', 'Temperature (°C)', 0.1, 45],
] as const
type Profile = {
  assignedDoctorId: string | null
  pastSurgeries: string | null
  measuredAt?: string | null
} & Record<(typeof measurements)[number][0], number | null>
const blank: Profile = {
  assignedDoctorId: null,
  pastSurgeries: null,
  weightKg: null,
  heightCm: null,
  systolicBP: null,
  diastolicBP: null,
  pulse: null,
  temperatureC: null,
}
export function PatientCareProfile({ patientId }: { patientId: string }) {
  const { data, loading, error, reload } = useResource<{ profile: Profile | null }>(
    `/api/patients/${patientId}/care-profile`
  )
  const doctors = useResource<{ doctors: { id: string; firstName: string; lastName: string }[] }>(
    '/api/staff/doctors'
  )
  const [profile, setProfile] = useState(blank),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('')
  useEffect(() => {
    if (data) setProfile(data.profile || blank)
  }, [data])
  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await sendJson(`/api/patients/${patientId}/care-profile`, 'PUT', profile)
      setNotice('Care profile saved.')
      await reload()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="space-y-4 rounded-lg border p-5">
      <h2 className="text-lg font-medium">Primary dentist and recorded vitals</h2>
      <ResourceState loading={loading} error={error} retry={reload} />
      {!loading && !error && (
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primary-dentist">Assigned dentist</Label>
            <select
              id="primary-dentist"
              className={`${fieldClass} max-w-sm`}
              value={profile.assignedDoctorId || ''}
              onChange={(e) => setProfile({ ...profile, assignedDoctorId: e.target.value || null })}
            >
              <option value="">Unassigned</option>
              {doctors.data?.doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.firstName} {d.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {measurements.map(([key, label, step, max]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`vital-${key}`}>{label}</Label>
                <Input
                  id={`vital-${key}`}
                  type="number"
                  step={step}
                  max={max}
                  value={profile[key] ?? ''}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      [key]: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="Not recorded"
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="past-surgeries">Past surgeries</Label>
            <Textarea
              id="past-surgeries"
              value={profile.pastSurgeries || ''}
              onChange={(e) => setProfile({ ...profile, pastSurgeries: e.target.value || null })}
              maxLength={10000}
              placeholder="Record the patient's reported surgical history"
            />
          </div>
          {profile.measuredAt && (
            <p className="text-sm text-muted-foreground">
              Last recorded {new Date(profile.measuredAt).toLocaleString('en-IN')}
            </p>
          )}
          <Button variant="outline" disabled={busy}>
            Save care profile
          </Button>
        </form>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  )
}
