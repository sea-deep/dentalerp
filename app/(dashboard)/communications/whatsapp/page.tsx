'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PageIntro, ResourceState, useResource, sendJson } from '@/components/operations/resource'
import Link from 'next/link'
type Message = {
  id: string
  event: string
  phone: string
  status: string
  attempts: number
  error: string | null
  createdAt: string
  sentAt: string | null
}
export default function WhatsAppLogPage() {
  const { data, loading, error, reload } = useResource<{ messages: Message[] }>(
    '/api/communications/whatsapp'
  )
  const [retryId, setRetryId] = useState(''),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('')
  async function retry() {
    setBusy(true)
    try {
      await sendJson(`/api/communications/whatsapp/${retryId}`, 'PATCH', { confirmRetry: true })
      setRetryId('')
      await reload()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-6">
      <PageIntro title="WhatsApp message log">
        Review queued, accepted and failed sends. “Sent” means Meta accepted the message; handset
        delivery is not confirmed here.
      </PageIntro>
      <div className="flex gap-4">
        <Button variant="outline" onClick={reload}>
          Refresh log
        </Button>
        <Link className="self-center underline" href="/settings/whatsapp">
          Connection settings
        </Link>
      </div>
      {notice && <p role="status">{notice}</p>}
      <ResourceState loading={loading} error={error} retry={reload} />
      {!loading && !error && data && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                {['Created', 'Event', 'Recipient', 'Status', 'Details', 'Action'].map((h) => (
                  <th key={h} className="p-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.messages.map((m) => (
                <tr key={m.id} className="border-b">
                  <td className="p-3 whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3">{m.event}</td>
                  <td className="p-3">{m.phone}</td>
                  <td className="p-3">{m.status}</td>
                  <td className="p-3">{m.error || `${m.attempts} attempt(s)`}</td>
                  <td className="p-3">
                    {m.status === 'FAILED' && (
                      <Button variant="outline" size="sm" onClick={() => setRetryId(m.id)}>
                        Review retry
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.messages.length && (
            <p className="py-8 text-center text-muted-foreground">
              No messages yet. Enable the clinic connection and patient consent to begin.
            </p>
          )}
        </div>
      )}
      {retryId && (
        <section className="space-y-3 rounded-lg border p-5">
          <h2 className="font-medium">Retry this message</h2>
          <p className="text-sm">
            A connection failure can happen after Meta accepts a message. Check the recipient and
            provider logs first; retrying may send a duplicate. Only an administrator can retry.
          </p>
          <div className="flex gap-3">
            <Button disabled={busy} onClick={retry}>
              Queue retry
            </Button>
            <Button variant="outline" onClick={() => setRetryId('')}>
              Cancel
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
