'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Clock, Copy, Mail, MailCheck, RefreshCw, Send, UserPlus, X } from 'lucide-react'

interface StaffInvite {
  id: string
  email: string
  name: string | null
  role: string
  status: string
  expiresAt: string
  createdAt: string
  acceptedAt: string | null
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  DOCTOR: 'Doctor',
  RECEPTIONIST: 'Receptionist',
  LAB_TECH: 'Lab Tech',
  ACCOUNTANT: 'Accountant',
}

const INVITE_ROLES = [
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'LAB_TECH', label: 'Lab Technician' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
]

const STATUS_STYLES: Record<string, string> = {
  PENDING:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
  ACCEPTED:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
  EXPIRED: 'border-border bg-muted text-muted-foreground',
  CANCELLED: 'border-border bg-muted text-muted-foreground',
}

function isExpired(invite: StaffInvite) {
  return invite.status === 'PENDING' && new Date(invite.expiresAt).getTime() < Date.now()
}

export default function StaffInvitesPage() {
  const { toast } = useToast()
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  const [invites, setInvites] = useState<StaffInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [devInviteLink, setDevInviteLink] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'RECEPTIONIST' })

  const fetchInvites = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/staff-invites')
      if (!res.ok) throw new Error('Failed to load invitations')
      const data = await res.json()
      setInvites(data.invites || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  const counts = useMemo(() => {
    return invites.reduce(
      (acc, invite) => {
        if (invite.status === 'PENDING' && !isExpired(invite)) acc.pending++
        else if (invite.status === 'ACCEPTED') acc.accepted++
        else acc.closed++
        return acc
      },
      { pending: 0, accepted: 0, closed: 0 }
    )
  }, [invites])

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      const res = await fetch('/api/staff-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        const detail = data.details?.fieldErrors
          ? Object.values(data.details.fieldErrors).flat().join(' ')
          : null
        throw new Error(detail || data.error || 'Failed to send invitation')
      }

      toast({ title: 'Invitation created', description: data.message })
      setDevInviteLink(data.inviteLink || null)
      setForm({ name: '', email: '', role: 'RECEPTIONIST' })
      setDialogOpen(false)
      await fetchInvites()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Could not send invitation',
        description: err.message,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async (invite: StaffInvite) => {
    try {
      setBusyId(invite.id)
      const res = await fetch(`/api/staff-invites/${invite.id}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to resend invitation')
      toast({ title: 'Invitation resent', description: data.message })
      await fetchInvites()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not resend', description: err.message })
    } finally {
      setBusyId(null)
    }
  }

  const handleCancel = async (invite: StaffInvite) => {
    const ok = await confirm({
      title: 'Cancel invitation?',
      description: `${invite.name || invite.email} will no longer be able to use this invite link. You can send a new one later.`,
      confirmLabel: 'Cancel invitation',
    })
    if (!ok) return

    try {
      setBusyId(invite.id)
      const res = await fetch(`/api/staff-invites/${invite.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel invitation')
      toast({ title: 'Invitation cancelled', description: data.message })
      await fetchInvites()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Could not cancel', description: err.message })
    } finally {
      setBusyId(null)
    }
  }

  const copyInviteLink = async () => {
    if (!devInviteLink) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${devInviteLink}`)
      toast({ title: 'Link copied' })
    } catch {
      toast({ variant: 'destructive', title: 'Could not copy the link' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/staff"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to staff
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">Staff invitations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite doctors and front-desk staff. Links expire after 7 days.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite staff
        </Button>
      </div>

      {devInviteLink && (
        <Card className="border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/30">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-sky-900 dark:text-sky-200">
              Email delivery is not configured, so share this link with the invitee directly:
              <code className="ml-1 break-all rounded bg-white/70 px-1.5 py-0.5 text-xs dark:bg-slate-900/60">
                {devInviteLink}
              </code>
            </p>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" onClick={copyInviteLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDevInviteLink(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Pending',
            value: counts.pending,
            icon: Clock,
            tone: 'text-amber-600 dark:text-amber-400',
          },
          {
            label: 'Accepted',
            value: counts.accepted,
            icon: MailCheck,
            tone: 'text-emerald-600 dark:text-emerald-400',
          },
          { label: 'Closed', value: counts.closed, icon: X, tone: 'text-muted-foreground' },
        ].map((metric) => (
          <Card key={metric.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{metric.value}</p>
              </div>
              <metric.icon className={`h-5 w-5 ${metric.tone}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" onClick={fetchInvites}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </div>
          ) : invites.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No invitations yet"
              description="Invite a doctor or team member and they will receive a link to set up their account."
              actionLabel="Invite staff"
              onAction={() => setDialogOpen(true)}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invitee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((invite) => {
                  const expired = isExpired(invite)
                  const status = expired ? 'EXPIRED' : invite.status
                  const pending = invite.status === 'PENDING'
                  return (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <p className="font-medium">{invite.name || invite.email.split('@')[0]}</p>
                        <p className="text-xs text-muted-foreground">{invite.email}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ROLE_LABELS[invite.role] || invite.role}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_STYLES[status] || STATUS_STYLES.CANCELLED}
                        >
                          {status.charAt(0) + status.slice(1).toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {format(new Date(invite.createdAt), 'd MMM yyyy')}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {invite.acceptedAt
                          ? `Accepted ${format(new Date(invite.acceptedAt), 'd MMM yyyy')}`
                          : pending && !expired
                            ? formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })
                            : format(new Date(invite.expiresAt), 'd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        {pending ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResend(invite)}
                              disabled={busyId === invite.id}
                            >
                              <Send className="mr-1.5 h-3.5 w-3.5" />
                              {expired ? 'Renew' : 'Resend'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleCancel(invite)}
                              disabled={busyId === invite.id}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
            <DialogDescription>
              They will receive an email with a link to create their account. The link expires after
              7 days.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Full name</Label>
              <Input
                id="invite-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Dr. Meera Iyer"
                required
                minLength={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Work email</Label>
              <Input
                id="invite-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="meera@clinic.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={form.role} onValueChange={(role) => setForm({ ...form, role })}>
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITE_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                <Mail className="mr-2 h-4 w-4" />
                {submitting ? 'Sending…' : 'Send invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {ConfirmDialogComponent}
    </div>
  )
}
