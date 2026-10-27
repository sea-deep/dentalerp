'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageIntro, ResourceState, useResource, sendJson } from '@/components/operations/resource'
import Link from 'next/link'
const events = [
  'WELCOME',
  'CONFIRMED',
  'RESCHEDULED',
  'CANCELLED',
  'REMINDER_24H',
  'REMINDER_2H',
  'PRESCRIPTION',
  'INVOICE',
  'OTP',
]
type Config = {
  enabled: boolean
  phoneNumberId: string
  accessToken: string
  hasAccessToken?: boolean
  apiVersion: string
  language: string
  templates: Record<string, string>
}
export default function WhatsAppSettingsPage() {
  const { data, loading, error, reload } = useResource<Config>('/api/settings/whatsapp')
  const [config, setConfig] = useState<Config | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('')
  useEffect(() => {
    if (data) setConfig(data)
  }, [data])
  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setNotice('')
    try {
      await sendJson('/api/settings/whatsapp', 'PUT', config)
      setNotice('WhatsApp settings saved.')
      await reload()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="max-w-4xl space-y-6">
      <PageIntro title="WhatsApp Business">
        Connect your clinic’s official Meta account. Use approved templates, enable patients’
        communication consent, and schedule the reminder worker to send queued messages.
      </PageIntro>
      <Link href="/communications/whatsapp" className="inline-block underline underline-offset-4">
        View message log
      </Link>
      <ResourceState loading={loading} error={error} retry={reload} />
      {notice && <p role="status">{notice}</p>}
      {config && !loading && !error && (
        <form onSubmit={save} className="space-y-6">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
            />
            Enable automated WhatsApp messages
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            {(['phoneNumberId', 'accessToken', 'apiVersion', 'language'] as const).map((key) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`wa-${key}`}>
                  {
                    {
                      phoneNumberId: 'Meta phone number ID',
                      accessToken: 'Access token',
                      apiVersion: 'Graph API version',
                      language: 'Template language',
                    }[key]
                  }
                </Label>
                <Input
                  id={`wa-${key}`}
                  type={key === 'accessToken' ? 'password' : 'text'}
                  autoComplete="off"
                  value={config[key]}
                  placeholder={
                    key === 'accessToken' && config.hasAccessToken
                      ? 'Saved · leave blank to retain'
                      : ''
                  }
                  onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <section className="space-y-4">
            <h2 className="text-lg font-medium">Approved template names</h2>
            <p className="text-sm text-muted-foreground">
              Appointment body parameters: patient name, clinic name, date, time, doctor,
              appointment number. Welcome: patient name, clinic name, patient ID. Documents: patient
              name with a PDF document header. OTP: authentication template with a copy-code button.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {events.map((event) => (
                <div key={event} className="space-y-2">
                  <Label htmlFor={`template-${event}`}>{event.replaceAll('_', ' ')}</Label>
                  <Input
                    id={`template-${event}`}
                    value={config.templates[event] || ''}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        templates: { ...config.templates, [event]: e.target.value },
                      })
                    }
                    placeholder="Approved template name"
                    pattern="[a-z0-9_]*"
                  />
                </div>
              ))}
            </div>
          </section>
          <Button disabled={busy}>{busy ? 'Saving…' : 'Save WhatsApp settings'}</Button>
        </form>
      )}
    </div>
  )
}
