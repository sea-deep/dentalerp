'use client'
import { useState } from 'react'
import Link from 'next/link'
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
type Enquiry = {
  id: string
  name: string
  phone: string
  message: string | null
  kind: string
  status: string
  requestedDate: string | null
  requestedTime: string | null
  reason: string | null
  followUpAt: string | null
  verifiedAt: string | null
  appointmentId: string | null
  createdAt: string
}
export default function RequestsPage() {
  const [filter, setFilter] = useState(''),
    [selected, setSelected] = useState<Enquiry | null>(null),
    [action, setAction] = useState('CONTACTED'),
    [reason, setReason] = useState(''),
    [date, setDate] = useState(''),
    [time, setTime] = useState(''),
    [followUpAt, setFollowUpAt] = useState('')
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('')
  const { data, loading, error, reload } = useResource<{
    enquiries: Enquiry[]
    counts: { status: string; _count: number }[]
    analytics: { started: number; approved: number; visited: number; visitConversion: number }
  }>(`/api/enquiries?status=${filter}`)
  function choose(row: Enquiry, next: string) {
    setSelected(row)
    setAction(next)
    setReason('')
    setDate(row.requestedDate?.slice(0, 10) || '')
    setTime(row.requestedTime || '')
    setFollowUpAt('')
    setNotice('')
  }
  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setBusy(true)
    setNotice('')
    try {
      await sendJson(`/api/enquiries/${selected.id}`, 'PATCH', {
        action,
        reason,
        date,
        time,
        followUpAt,
      })
      setSelected(null)
      setNotice('Enquiry updated.')
      await reload()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-6">
      <PageIntro title="Requests and enquiries">
        Approve verified online bookings, return missed enquiries and record the next follow-up. A
        requested time is confirmed only after approval.
      </PageIntro>
      <div className="flex flex-wrap items-center gap-4">
        <Label htmlFor="request-status">Show</Label>
        <select
          id="request-status"
          className={`${fieldClass} max-w-xs`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All enquiries</option>
          {['REQUESTED', 'DRAFT', 'NEW', 'CONTACTED', 'APPROVED', 'REJECTED', 'CLOSED'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {data && (
          <p className="text-sm text-muted-foreground">
            {data.counts.find((c) => c.status === 'REQUESTED')?._count || 0} awaiting approval
          </p>
        )}
      </div>
      {data && (
        <p className="text-sm text-muted-foreground">
          {data.analytics.started} bookings started · {data.analytics.approved} approved ·{' '}
          {data.analytics.visited} completed visits · {data.analytics.visitConversion}% converted to
          visits
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <ResourceState loading={loading} error={error} retry={reload} />
      {!loading && !error && data && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                {['Patient / contact', 'Request', 'Status', 'Follow-up', 'Actions'].map((h) => (
                  <th key={h} className="p-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.enquiries.map((row) => (
                <tr key={row.id} className="border-b align-top">
                  <td className="p-3">
                    <p className="font-medium">{row.name}</p>
                    <a href={`tel:${row.phone}`} className="underline underline-offset-4">
                      {row.phone}
                    </a>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {row.verifiedAt ? 'Phone verified' : 'Phone unverified'}
                    </p>
                  </td>
                  <td className="p-3 max-w-xs">
                    <p>
                      {row.requestedDate?.slice(0, 10)} {row.requestedTime}
                    </p>
                    <p className="whitespace-pre-wrap break-words">
                      {row.message ||
                        (row.status === 'DRAFT'
                          ? 'Booking started, not submitted'
                          : 'General enquiry')}
                    </p>
                    {row.reason && <p className="mt-2 text-muted-foreground">{row.reason}</p>}
                  </td>
                  <td className="p-3">{row.status}</td>
                  <td className="p-3 whitespace-nowrap">
                    {row.followUpAt ? new Date(row.followUpAt).toLocaleString('en-IN') : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {row.appointmentId ? (
                        <Link className="underline" href={`/appointments/${row.appointmentId}`}>
                          Open appointment
                        </Link>
                      ) : (
                        !['CLOSED', 'REJECTED'].includes(row.status) && (
                          <>
                            {row.kind === 'BOOKING' &&
                              row.verifiedAt &&
                              ['REQUESTED', 'CONTACTED'].includes(row.status) && (
                                <>
                                  <Button size="sm" onClick={() => choose(row, 'APPROVE')}>
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => choose(row, 'RESCHEDULE')}
                                  >
                                    Change time
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => choose(row, 'REJECTED')}
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => choose(row, 'CONTACTED')}
                            >
                              Record contact
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => choose(row, 'CLOSED')}>
                              Close
                            </Button>
                          </>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.enquiries.length && (
            <p className="py-8 text-center text-muted-foreground">No enquiries in this view.</p>
          )}
        </div>
      )}
      {selected && (
        <form onSubmit={save} className="space-y-4 rounded-lg border p-5">
          <h2 className="text-lg font-medium">
            {action.replaceAll('_', ' ')} · {selected.name}
          </h2>
          {action === 'APPROVE' && (
            <p>
              Confirm the requested appointment on {date} at {time}. Availability will be checked
              again.
            </p>
          )}
          {action === 'RESCHEDULE' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="request-date">New date</Label>
                <Input
                  id="request-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-time">New time</Label>
                <Input
                  id="request-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
          {action !== 'APPROVE' && (
            <div className="space-y-2">
              <Label htmlFor="request-reason">
                {action === 'CONTACTED' ? 'Contact notes' : 'Reason'}
              </Label>
              <Input
                id="request-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required={['RESCHEDULE', 'REJECTED'].includes(action)}
                minLength={3}
                maxLength={2000}
              />
            </div>
          )}
          {action === 'CONTACTED' && (
            <div className="space-y-2">
              <Label htmlFor="follow-up">Next follow-up (optional)</Label>
              <Input
                id="follow-up"
                type="datetime-local"
                value={followUpAt}
                onChange={(e) => setFollowUpAt(e.target.value)}
              />
            </div>
          )}
          <div className="flex gap-3">
            <Button disabled={busy}>{busy ? 'Saving…' : 'Confirm action'}</Button>
            <Button type="button" variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
