'use client'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
export async function sendJson(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Could not complete this action. Try again.')
  return data
}
export function useResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await sendJson(url, 'GET'))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [url])
  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    sendJson(url, 'GET')
      .then((d) => {
        if (active) setData(d)
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [url])
  return { data, loading, error, reload }
}
export function ResourceState({
  loading,
  error,
  retry,
}: {
  loading: boolean
  error: string
  retry: () => void
}) {
  if (error)
    return (
      <div role="alert" className="space-y-3 rounded-lg border p-4">
        <p>{error}</p>
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      </div>
    )
  if (loading)
    return (
      <p role="status" className="py-6 text-muted-foreground">
        Loading records…
      </p>
    )
  return null
}
export function PageIntro({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <header className="space-y-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="max-w-3xl text-muted-foreground">{children}</p>
    </header>
  )
}
export const fieldClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
