'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Package,
  Plus,
  Receipt,
  Stethoscope,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  appointmentStatusConfig,
  appointmentTypeConfig,
  formatTime,
  getDoctorName,
  getPatientName,
} from '@/lib/appointment-utils'
import { cn } from '@/lib/utils'
import { CHART_COLORS } from '@/lib/chart-theme'

interface DashboardStats {
  overview: {
    totalPatients: number
    newPatientsThisMonth: number
    patientGrowth: number
    todayAppointments: number
    thisMonthAppointments: number
    appointmentGrowth: number
    pendingAppointments: number
    completedAppointmentsToday: number
    thisMonthRevenue: number
    todayRevenue: number
    revenueGrowth: number
    pendingPayments: number
    totalRevenue: number
  }
  charts: {
    last7DaysRevenue: Array<{ date: string; revenue: number }>
    last6MonthsRevenue: Array<{ month: string; revenue: number }>
    appointmentsByStatus: Array<{ status: string; count: number }>
    topProcedures: Array<{ name: string; count: number; revenue: number }>
  }
  recentActivity: {
    upcomingAppointments: Array<{
      id: string
      patientName: string
      doctorName: string
      date: string
      type: string
      status: string
    }>
    lowStockItems: Array<{
      id: string
      name: string
      currentStock: number
      minimumStock: number
      unit: string
    }>
  }
}

interface TodayAppointment {
  id: string
  appointmentNo: string
  scheduledTime: string
  duration: number
  status: string
  appointmentType: string
  patient: { firstName: string; lastName: string; phone?: string | null }
  doctor?: { firstName: string; lastName: string } | null
}

interface TodayStats {
  total: number
  waiting: number
  inProgress: number
  upcoming: number
  completed: number
  noShow: number
  cancelled: number
}

const EMPTY_TODAY_STATS: TodayStats = {
  total: 0,
  waiting: 0,
  inProgress: 0,
  upcoming: 0,
  completed: 0,
  noShow: 0,
  cancelled: 0,
}

const STATUS_TONES: Record<string, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300',
  CONFIRMED: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
  CHECKED_IN: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  IN_PROGRESS: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  COMPLETED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  CANCELLED: 'bg-muted text-muted-foreground',
  NO_SHOW: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [today, setToday] = useState<{
    appointments: TodayAppointment[]
    stats?: TodayStats
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsResponse, todayResponse] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/appointments/today'),
      ])

      if (!statsResponse.ok) throw new Error('Failed to fetch dashboard statistics')
      const statsPayload = await statsResponse.json()
      // The API wraps the payload in `data`; tolerate a bare payload for older deployments.
      setStats(statsPayload.data ?? statsPayload)

      if (todayResponse.ok) {
        const todayPayload = await todayResponse.json()
        setToday({ appointments: todayPayload.appointments || [], stats: todayPayload.stats })
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)

  const growth = (value: number) => {
    if (!Number.isFinite(value) || value === 0) return null
    const positive = value > 0
    return (
      <span
        className={cn(
          'inline-flex items-center gap-0.5 text-xs font-medium',
          positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        )}
      >
        {positive ? (
          <ArrowUpRight className="h-3.5 w-3.5" />
        ) : (
          <ArrowDownRight className="h-3.5 w-3.5" />
        )}
        {Math.abs(value).toFixed(1)}%
      </span>
    )
  }

  const schedule = useMemo(() => (today?.appointments || []).slice(0, 6), [today])

  const attention = useMemo(() => {
    const items: Array<{
      id: string
      title: string
      detail: string
      href: string
      icon: typeof AlertTriangle
      tone: string
    }> = []

    const queue = today?.stats
    const liveQueue = (queue?.waiting ?? 0) + (queue?.inProgress ?? 0)
    if (liveQueue > 0) {
      items.push({
        id: 'queue',
        title: `${liveQueue} patient${liveQueue === 1 ? '' : 's'} in the chair or waiting`,
        detail: 'Open the front-desk queue to keep the day moving.',
        href: '/appointments/queue',
        icon: Activity,
        tone: 'text-amber-600 dark:text-amber-400',
      })
    }

    const lowStock = stats?.recentActivity?.lowStockItems?.length ?? 0
    if (lowStock > 0) {
      items.push({
        id: 'stock',
        title: `${lowStock} item${lowStock === 1 ? '' : 's'} at or below minimum stock`,
        detail: 'Order consumables before the next clinical session.',
        href: '/inventory',
        icon: Package,
        tone: 'text-rose-600 dark:text-rose-400',
      })
    }

    if ((stats?.overview.pendingPayments || 0) > 0) {
      items.push({
        id: 'payments',
        title: `${formatMoney(stats!.overview.pendingPayments)} outstanding`,
        detail: 'Review unpaid invoices and record collections.',
        href: '/billing/invoices',
        icon: Receipt,
        tone: 'text-sky-600 dark:text-sky-400',
      })
    }

    return items
  }, [stats, today])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-5">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-7">
            <CardContent className="h-[360px] animate-pulse" />
          </Card>
          <Card className="lg:col-span-5">
            <CardContent className="h-[360px] animate-pulse" />
          </Card>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Practice overview</h1>
          <p className="text-sm text-destructive">Failed to load dashboard data</p>
        </div>
        <Card className="border-destructive/30">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-medium">{error || 'An unexpected error occurred'}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your data is safe. Check the server logs if this persists.
              </p>
            </div>
            <Button onClick={fetchDashboard}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const todayStats = today?.stats ?? EMPTY_TODAY_STATS
  const todayAppointments = todayStats.total || stats.overview.todayAppointments
  const completedToday = todayStats.completed || stats.overview.completedAppointmentsToday
  const revenueData = (stats.charts.last7DaysRevenue ?? []).map((item) => ({
    date: format(new Date(item.date), 'EEE'),
    revenue: Number(item.revenue),
  }))
  const hasRevenue = revenueData.some((point) => point.revenue > 0)
  const statusData = (stats.charts.appointmentsByStatus ?? []).map((item) => ({
    name: appointmentStatusConfig[item.status]?.label || item.status,
    value: item.count,
  }))

  return (
    <div className="space-y-6">
      {/* Day header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {format(new Date(), 'EEEE, d MMMM yyyy')}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Practice overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {todayAppointments > 0
              ? `${todayAppointments} appointment${todayAppointments === 1 ? '' : 's'} on today's list · ${completedToday} completed`
              : 'No appointments booked for today yet.'}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Button variant="outline" asChild>
            <Link href="/patients/new" className="whitespace-nowrap">
              <Plus className="mr-2 h-4 w-4" />
              New patient
            </Link>
          </Button>
          <Button asChild>
            <Link href="/appointments/new" className="whitespace-nowrap">
              <Calendar className="mr-2 h-4 w-4" />
              Book appointment
            </Link>
          </Button>
        </div>
      </div>

      {/* Headline metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Patients</p>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {stats.overview.totalPatients.toLocaleString('en-IN')}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              {growth(stats.overview.patientGrowth)}
              <span>{stats.overview.newPatientsThisMonth} new this month</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Today&apos;s schedule</p>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{todayAppointments}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {completedToday} completed ·{' '}
              {today?.stats?.upcoming ?? Math.max(todayAppointments - completedToday, 0)} still to
              come
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Collected today</p>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {formatMoney(stats.overview.todayRevenue)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatMoney(stats.overview.thisMonthRevenue)} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Receivables</p>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </div>
            <p
              className={cn(
                'mt-2 text-3xl font-semibold tracking-tight',
                stats.overview.pendingPayments > 0 && 'text-rose-600 dark:text-rose-400'
              )}
            >
              {formatMoney(stats.overview.pendingPayments)}
            </p>
            <Link
              href="/billing/invoices"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Review invoices <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Today + attention */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Today&apos;s schedule</CardTitle>
              <CardDescription>
                {todayStats.waiting
                  ? `${todayStats.waiting} waiting · ${todayStats.inProgress} in progress`
                  : 'Your clinical day at a glance'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/appointments/queue">
                Front desk <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {schedule.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-3 font-medium">No appointments today</p>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  The schedule is clear. Book a visit or review tomorrow&apos;s list.
                </p>
                <Button className="mt-4" size="sm" asChild>
                  <Link href="/appointments/new">Book appointment</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y">
                {schedule.map((appointment) => {
                  const status = appointmentStatusConfig[appointment.status]
                  return (
                    <li key={appointment.id}>
                      <Link
                        href={`/appointments/${appointment.id}`}
                        className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60"
                      >
                        <div className="w-16 shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums">
                          {formatTime(appointment.scheduledTime)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {getPatientName(appointment.patient)}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {appointment.doctor ? getDoctorName(appointment.doctor) : 'Unassigned'}{' '}
                            ·{' '}
                            {appointmentTypeConfig[appointment.appointmentType]?.label ||
                              appointment.appointmentType}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium',
                            STATUS_TONES[appointment.status] || 'bg-muted text-muted-foreground'
                          )}
                        >
                          {status?.label || appointment.status}
                        </span>
                        <span className="hidden w-14 shrink-0 text-right text-xs text-muted-foreground sm:block">
                          {appointment.duration} min
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
            {today && today.appointments.length > schedule.length && (
              <Button variant="ghost" className="mt-2 w-full" asChild>
                <Link href="/appointments">
                  View all {today.appointments.length} appointments
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>Items that will block or delay care</CardDescription>
          </CardHeader>
          <CardContent>
            {attention.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                <p className="mt-3 font-medium">All clear</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Stock, collections and the queue are in good shape.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {attention.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
                    >
                      <item.icon className={cn('mt-0.5 h-5 w-5 shrink-0', item.tone)} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{item.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {item.detail}
                        </span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2 border-t pt-4">
              {[
                { label: 'Waiting', value: todayStats.waiting },
                { label: 'In chair', value: todayStats.inProgress },
                { label: 'Done', value: todayStats.completed },
              ].map((metric) => (
                <div key={metric.label} className="rounded-lg bg-muted/50 px-3 py-2 text-center">
                  <p className="text-lg font-semibold tabular-nums">{metric.value}</p>
                  <p className="text-[11px] text-muted-foreground">{metric.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Revenue, last 7 days</CardTitle>
            <CardDescription>Completed payments by day</CardDescription>
          </CardHeader>
          <CardContent>
            {hasRevenue ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    width={64}
                    tickFormatter={(value) => formatMoney(Number(value))}
                  />
                  <Tooltip
                    formatter={(value) => formatMoney(Number(value))}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))',
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2.5}
                    dot={{ r: 3, strokeWidth: 0, fill: 'hsl(var(--chart-1))' }}
                    activeDot={{ r: 5 }}
                    name="Collected"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] flex-col items-center justify-center text-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-medium">No payments in the last 7 days</p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Record a payment on any invoice and the trend will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle>Appointment mix</CardTitle>
            <CardDescription>This month by status</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {statusData.map((_: unknown, index: number) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))',
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] flex-col items-center justify-center text-center">
                <Stethoscope className="h-8 w-8 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-medium">No appointments this month</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The mix appears once visits are booked.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Top procedures</CardTitle>
            <CardDescription>Most performed this month</CardDescription>
          </CardHeader>
          <CardContent>
            {(stats.charts.topProcedures?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={(stats.charts.topProcedures ?? []).map((procedure) => ({
                    name:
                      procedure.name.length > 18
                        ? `${procedure.name.slice(0, 18)}…`
                        : procedure.name,
                    count: Number(procedure.count),
                    revenue: Number(procedure.revenue),
                  }))}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted) / 0.5)' }}
                    contentStyle={{
                      borderRadius: 8,
                      border: '1px solid hsl(var(--border))',
                      background: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))',
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--chart-1))"
                    radius={[4, 4, 0, 0]}
                    name="Procedures"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[260px] flex-col items-center justify-center text-center">
                <Stethoscope className="h-8 w-8 text-muted-foreground/60" />
                <p className="mt-3 text-sm font-medium">No procedures recorded</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Completed treatments will show up here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Stock watchlist</CardTitle>
              <CardDescription>Items at or below minimum</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/inventory">Inventory</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {(stats.recentActivity?.lowStockItems?.length ?? 0) === 0 ? (
              <div className="flex h-[260px] flex-col items-center justify-center text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="mt-3 text-sm font-medium">Stock levels are healthy</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Nothing is below its reorder point.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {(stats.recentActivity?.lowStockItems ?? []).map((item) => (
                  <li key={item.id}>
                    <Link
                      href="/inventory"
                      className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Reorder at {item.minimumStock} {item.unit}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                      >
                        {item.currentStock} {item.unit}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary actions */}
      <div className="flex flex-wrap gap-2">
        {[
          { href: '/treatments/new', label: 'Record treatment', icon: Stethoscope },
          { href: '/billing', label: 'Create invoice', icon: Receipt },
          { href: '/reports', label: 'Open reports', icon: TrendingUp },
          { href: '/inventory', label: 'Inventory', icon: Package },
        ].map((action) => (
          <Button key={action.href} variant="outline" size="sm" asChild>
            <Link href={action.href}>
              <action.icon className="mr-2 h-4 w-4" />
              {action.label}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  )
}
