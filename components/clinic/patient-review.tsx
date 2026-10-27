'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { sendJson, fieldClass } from '@/components/operations/resource'
export function PatientReview({ slug }: { slug: string }) {
  const [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [needsSignIn, setNeedsSignIn] = useState(false),
    [rating, setRating] = useState('5'),
    [body, setBody] = useState('')
  const draftKey = `clinic-review:${slug}`
  const returnTo = `/clinic/${encodeURIComponent(slug)}#patient-review`
  const loginHref = `/portal/login?clinic=${encodeURIComponent(slug)}&returnTo=${encodeURIComponent(returnTo)}`
  useEffect(() => {
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null')
      if (draft && typeof draft.body === 'string' && Date.now() - draft.savedAt < 1800000) {
        setBody(draft.body.slice(0, 2000))
        if (['1', '2', '3', '4', '5'].includes(draft.rating)) setRating(draft.rating)
      } else {
        sessionStorage.removeItem(draftKey)
      }
    } catch {
      // The form still works when browser storage is unavailable.
    }
  }, [draftKey])
  function rememberDraft() {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ rating, body, savedAt: Date.now() }))
    } catch {
      // Storage restrictions must not prevent signing in.
    }
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget,
      values = Object.fromEntries(new FormData(form))
    setBusy(true)
    setNeedsSignIn(false)
    try {
      const result = await sendJson(`/api/public/${slug}/reviews`, 'POST', {
        rating: Number(values.rating),
        body: values.body,
        consent: values.consent === 'on',
      })
      setNotice(result.message)
      setBody('')
      setRating('5')
      try {
        sessionStorage.removeItem(draftKey)
      } catch {}
      form.reset()
    } catch (e) {
      const unauthorized = (e as Error).message === 'Unauthorized'
      if (unauthorized) rememberDraft()
      setNeedsSignIn(unauthorized)
      setNotice(
        unauthorized
          ? 'Sign in to submit your review. Your draft will be here when you return.'
          : (e as Error).message
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <form
      id="patient-review"
      onSubmit={save}
      className="mt-8 max-w-xl scroll-mt-8 space-y-4"
      data-ui
    >
      <h3 className="text-xl font-medium">Share your experience</h3>
      <p className="text-sm">
        <Link href={loginHref} onClick={rememberDraft} className="underline underline-offset-4">
          Sign in to the patient portal
        </Link>{' '}
        to submit a review. Reviews are checked by the clinic before they appear here.
      </p>
      <div className="space-y-2">
        <Label htmlFor="review-rating">Your rating</Label>
        <select
          id="review-rating"
          name="rating"
          className={fieldClass}
          value={rating}
          onChange={(e) => setRating(e.target.value)}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} out of 5
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="review-body">Your review</Label>
        <Textarea
          id="review-body"
          name="body"
          required
          minLength={5}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="consent" required className="mt-1" />I permit the clinic to
        publish this review with my patient name.
      </label>
      <Button disabled={busy}>{busy ? 'Submitting…' : 'Submit review'}</Button>
      {notice && <p role="status">{notice}</p>}
      {needsSignIn && (
        <Link
          href={loginHref}
          onClick={rememberDraft}
          className="inline-block underline underline-offset-4"
        >
          Sign in and return to your review
        </Link>
      )}
    </form>
  )
}
