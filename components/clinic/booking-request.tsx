'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TimeSlotPicker } from '@/components/appointments/time-slot-picker'
import { sendJson, fieldClass } from '@/components/operations/resource'
export function BookingRequest({
  slug,
  doctors,
}: {
  slug: string
  doctors: { id: string; firstName: string; lastName: string; specialization: string | null }[]
}) {
  const [step, setStep] = useState('CONTACT'),
    [token, setToken] = useState(''),
    [mode, setMode] = useState('BOOKING'),
    [name, setName] = useState(''),
    [phone, setPhone] = useState(''),
    [message, setMessage] = useState(''),
    [consent, setConsent] = useState(false),
    [code, setCode] = useState('')
  const [doctorId, setDoctorId] = useState(''),
    [date, setDate] = useState(''),
    [time, setTime] = useState(''),
    [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]),
    [slotLoading, setSlotLoading] = useState(false),
    [slotError, setSlotError] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const base = `/api/public/${encodeURIComponent(slug)}`
  useEffect(() => {
    setTime('')
    setSlots([])
    setSlotError('')
    if (!doctorId || !date) return
    const abort = new AbortController()
    setSlotLoading(true)
    fetch(`${base}/slots?doctorId=${encodeURIComponent(doctorId)}&date=${date}`, {
      signal: abort.signal,
    })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error)
        setSlots(data.slots)
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setSlotError(e.message)
      })
      .finally(() => {
        if (!abort.signal.aborted) setSlotLoading(false)
      })
    return () => abort.abort()
  }, [doctorId, date, base])
  async function act(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (step === 'CONTACT') {
        const result = await sendJson(`${base}/enquiries`, 'POST', {
          name,
          phone,
          message,
          consent,
          kind: mode,
        })
        if (mode === 'ENQUIRY') {
          setStep('ENQUIRY_SENT')
          return
        }
        setToken(result.token)
        setStep('VERIFY')
        await sendJson(`${base}/verify`, 'POST', { token: result.token })
      } else if (step === 'VERIFY') {
        await sendJson(`${base}/verify`, 'POST', { token, otp: code })
        setStep('SLOT')
      } else {
        await sendJson(`${base}/book`, 'POST', { token, doctorId, date, time })
        setStep('SENT')
      }
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function resend() {
    setBusy(true)
    setError('')
    try {
      await sendJson(`${base}/verify`, 'POST', { token })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  if (['SENT', 'ENQUIRY_SENT'].includes(step))
    return (
      <div role="status" className="space-y-3 bg-muted p-6">
        <h3 className="text-xl font-semibold">
          {step === 'SENT' ? 'Request received' : 'Enquiry received'}
        </h3>
        <p>
          {step === 'SENT'
            ? 'The clinic will contact you to confirm your appointment. Your selected time is a request until approved.'
            : 'The clinic will follow up using the phone number you provided.'}
        </p>
      </div>
    )
  return (
    <form onSubmit={act} className="space-y-5" data-ui>
      {step === 'CONTACT' && (
        <>
          <div className="flex flex-wrap gap-3" role="group" aria-label="Contact purpose">
            <Button
              type="button"
              variant={mode === 'BOOKING' ? 'default' : 'outline'}
              onClick={() => setMode('BOOKING')}
            >
              Request a visit
            </Button>
            <Button
              type="button"
              variant={mode === 'ENQUIRY' ? 'default' : 'outline'}
              onClick={() => setMode('ENQUIRY')}
            >
              Ask a question
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking-name">Your name</Label>
              <Input
                id="booking-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                minLength={2}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-phone">Mobile number</Label>
              <Input
                id="booking-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="10-digit Indian mobile"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="booking-message">
              {mode === 'BOOKING' ? 'Reason for your visit (optional)' : 'Your question'}
            </Label>
            <Textarea
              id="booking-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required={mode === 'ENQUIRY'}
              maxLength={2000}
            />
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              className="mt-1"
            />
            I agree that the clinic may save my details and contact me about this request, including
            if I do not finish booking.
          </label>
        </>
      )}
      {step === 'VERIFY' && (
        <>
          <p>Enter the six-digit code sent to {phone} on WhatsApp.</p>
          <div className="space-y-2">
            <Label htmlFor="booking-code">Verification code</Label>
            <Input
              id="booking-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={6}
            />
          </div>
          <Button type="button" variant="outline" disabled={busy} onClick={resend}>
            Send a new code
          </Button>
        </>
      )}
      {step === 'SLOT' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="booking-doctor">Doctor</Label>
              <select
                id="booking-doctor"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className={fieldClass}
                required
              >
                <option value="">Choose a doctor</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.firstName} {d.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-date">Preferred date</Label>
              <Input
                id="booking-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>
          {slotLoading ? (
            <p role="status">Checking availability…</p>
          ) : slotError ? (
            <p role="alert">{slotError}</p>
          ) : (
            doctorId && date && <TimeSlotPicker slots={slots} value={time} onChange={setTime} />
          )}
          <p className="text-sm text-muted-foreground">
            Reception will review and confirm your requested time.
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <Button disabled={busy || (step === 'SLOT' && (!time || slotLoading))}>
        {busy
          ? 'Please wait…'
          : step === 'CONTACT'
            ? mode === 'BOOKING'
              ? 'Continue with WhatsApp verification'
              : 'Send enquiry'
            : step === 'VERIFY'
              ? 'Verify number'
              : 'Submit appointment request'}
      </Button>
    </form>
  )
}
