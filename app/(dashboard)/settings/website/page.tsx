'use client'
import { useState } from 'react'
import Link from 'next/link'
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
type Entry = {
  id: string
  kind: string
  title: string
  body: string | null
  imageUrl: string | null
  afterUrl: string | null
  rating: number | null
  published: boolean
}
export default function WebsiteSettingsPage() {
  const { data, loading, error, reload } = useResource<{
    entries: Entry[]
    clinic: { slug: string; patientPortalEnabled: boolean }
  }>('/api/website')
  const [kind, setKind] = useState('GALLERY'),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [deleteId, setDeleteId] = useState('')
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget,
      values = Object.fromEntries(new FormData(form))
    setBusy(true)
    setNotice('')
    try {
      await sendJson('/api/website', 'POST', {
        ...values,
        kind,
        consent: values.consent === 'on',
        published: false,
        ...(kind === 'REVIEW' ? { rating: Number(values.rating) } : {}),
        imageUrl: values.imageUrl || undefined,
        afterUrl: values.afterUrl || undefined,
      })
      form.reset()
      await reload()
      setNotice('Saved as a draft. Publish it when ready.')
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    setBusy(true)
    setNotice('')
    try {
      const response = await fetch('/api/website/upload', {
        method: 'POST',
        body: new FormData(form),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Upload failed')
      form.reset()
      await reload()
      setNotice('Photos uploaded as a draft. Publish when ready.')
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  async function update(id: string, method: string, body?: unknown) {
    setBusy(true)
    setNotice('')
    try {
      await sendJson(`/api/website/${id}`, method, body)
      setDeleteId('')
      await reload()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-8">
      <PageIntro title="Clinic website">
        Your clinic details, opening hours, procedures and doctors update from the workspace.
        Publish only photos and reviews with recorded permission.
      </PageIntro>
      {data && (
        <div className="flex flex-wrap gap-4">
          <Button asChild variant="outline">
            <Link href={`/clinic/${data.clinic.slug}`} target="_blank">
              Preview clinic page
            </Link>
          </Button>
          <Link href="/settings/clinic" className="self-center underline">
            Edit clinic details and booking access
          </Link>
          {!data.clinic.patientPortalEnabled && (
            <p className="self-center text-sm text-muted-foreground">
              Enable patient portal access to make the clinic page available.
            </p>
          )}
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      <ResourceState loading={loading} error={error} retry={reload} />
      <form onSubmit={upload} className="max-w-3xl space-y-4 rounded-lg border p-5">
        <h2 className="text-lg font-medium">Upload clinic photos</h2>
        <p className="text-sm text-muted-foreground">
          PNG, JPEG or WebP, up to 5 MB each. Add an after photo to create a comparison slider.
        </p>
        <div className="space-y-2">
          <Label htmlFor="upload-title">Photo title</Label>
          <Input id="upload-title" name="title" minLength={2} maxLength={150} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="upload-caption">Caption</Label>
          <Textarea id="upload-caption" name="body" maxLength={2000} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="upload-before">Image / before photo</Label>
            <Input
              id="upload-before"
              name="before"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="upload-after">After photo (optional)</Label>
            <Input
              id="upload-after"
              name="after"
              type="file"
              accept="image/png,image/jpeg,image/webp"
            />
          </div>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="consent" required className="mt-1" />
          The patient has permitted these photos to be published.
        </label>
        <Button disabled={busy}>{busy ? 'Uploading…' : 'Upload photos as draft'}</Button>
      </form>
      <form onSubmit={save} className="max-w-3xl space-y-4 rounded-lg border p-5">
        <h2 className="text-lg font-medium">Add website content</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="entry-kind">Content type</Label>
            <select
              id="entry-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className={fieldClass}
            >
              <option value="GALLERY">Gallery / before and after</option>
              <option value="REVIEW">Patient review</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="entry-title">
              {kind === 'REVIEW' ? 'Patient display name' : 'Photo title'}
            </Label>
            <Input id="entry-title" name="title" required minLength={2} maxLength={150} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="entry-body">{kind === 'REVIEW' ? 'Review text' : 'Caption'}</Label>
          <Textarea id="entry-body" name="body" maxLength={2000} required={kind === 'REVIEW'} />
        </div>
        {kind === 'GALLERY' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="entry-image">Image / before photo URL</Label>
              <Input id="entry-image" name="imageUrl" type="url" placeholder="https://…" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="entry-after">After photo URL (optional)</Label>
              <Input id="entry-after" name="afterUrl" type="url" placeholder="https://…" />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="entry-rating">Rating</Label>
            <select id="entry-rating" name="rating" className={`${fieldClass} max-w-xs`}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} out of 5
                </option>
              ))}
            </select>
          </div>
        )}
        <label className="flex items-start gap-3 text-sm">
          <input name="consent" type="checkbox" required className="mt-1" />
          The patient has permitted this content and display name to be published on the clinic
          website.
        </label>
        <Button disabled={busy}>Save draft</Button>
      </form>
      {!loading && !error && data && (
        <section className="divide-y">
          <h2 className="pb-4 text-lg font-medium">Drafts and published content</h2>
          {data.entries.map((entry) => (
            <div key={entry.id} className="flex flex-wrap items-start justify-between gap-4 py-5">
              <div className="max-w-2xl space-y-1">
                <p className="font-medium">
                  {entry.title} {entry.rating ? `· ${entry.rating}/5` : ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  {entry.kind} · {entry.published ? 'Published' : 'Draft'}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm">{entry.body}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => update(entry.id, 'PATCH', { published: !entry.published })}
                >
                  {entry.published ? 'Unpublish' : 'Publish'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setDeleteId(entry.id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
          {!data.entries.length && (
            <p className="py-6 text-muted-foreground">No gallery photos or reviews yet.</p>
          )}
        </section>
      )}
      {deleteId && (
        <div className="space-y-3 rounded-lg border p-4">
          <p>
            Delete this content permanently? Unpublish it instead if you want to keep the draft.
          </p>
          <div className="flex gap-3">
            <Button disabled={busy} onClick={() => update(deleteId, 'DELETE')}>
              Delete content
            </Button>
            <Button variant="outline" onClick={() => setDeleteId('')}>
              Keep content
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
