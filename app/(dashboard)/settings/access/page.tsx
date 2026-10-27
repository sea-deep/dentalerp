'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PageIntro, ResourceState, useResource, sendJson } from '@/components/operations/resource'
import { modules, roleAccess, ModuleAccess } from '@/lib/permissions'
type Account = { id: string; name: string; role: string; isActive: boolean; access: ModuleAccess }
export default function AccessPage() {
  const { data, loading, error, reload } = useResource<{ users: Account[] }>('/api/access')
  const [selected, setSelected] = useState<Account | null>(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('')
  async function save() {
    if (!selected) return
    setBusy(true)
    try {
      await sendJson(`/api/access/${selected.id}`, 'PUT', selected.access)
      setSelected(null)
      setNotice('Permissions saved. They apply to the next request.')
      await reload()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-6">
      <PageIntro title="Staff module access">
        Roles set each person’s maximum access. Restrict individual modules here. Deactivate an
        account from Staff to end access immediately.
      </PageIntro>
      {notice && <p role="status">{notice}</p>}
      <ResourceState loading={loading} error={error} retry={reload} />
      {!loading && !error && data && (
        <div className="divide-y">
          {data.users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-sm text-muted-foreground">
                  {u.role} · {u.isActive ? 'Active' : 'Inactive'}
                </p>
              </div>
              {u.role !== 'ADMIN' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected({ ...u, access: { ...u.access } })}
                >
                  Edit access
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {selected && (
        <section className="space-y-5 rounded-lg border p-5">
          <h2 className="text-lg font-medium">Access for {selected.name}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules
              .filter((m) => roleAccess(selected.role)[m])
              .map((m) => (
                <label key={m} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!selected.access[m]}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        access: { ...selected.access, [m]: e.target.checked },
                      })
                    }
                  />
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </label>
              ))}
          </div>
          <div className="flex gap-3">
            <Button disabled={busy} onClick={save}>
              Save access
            </Button>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
