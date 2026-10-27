'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Edit,
  FlaskConical,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Package,
  Truck,
  Users,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ExportMenu } from '@/components/ui/export-menu'

interface LabOrder {
  id: string
  orderNumber: string
  patientId: string
  patientName: string
  patientPhone: string
  labVendorId: string
  vendorName: string
  vendorPhone: string
  workType: string
  description: string
  toothNumbers: string
  shadeGuide: string
  orderDate: string
  expectedDate: string
  sentDate: string | null
  receivedDate: string | null
  deliveredDate: string | null
  estimatedCost: number
  actualCost: number | null
  status: string
  qualityCheck: string
  qualityNotes: string | null
  priority: string
  notes: string
  createdByName: string
  createdAt: string
}

interface LabVendor {
  id: string
  name: string
  code: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

interface Stats {
  total: number
  created: number
  sentToLab: number
  inProgress: number
  ready: number
  delivered: number
  cancelled: number
}

export default function LabWorkPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<LabOrder[]>([])
  const [vendors, setVendors] = useState<LabVendor[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    total: 0,
    created: 0,
    sentToLab: 0,
    inProgress: 0,
    ready: 0,
    delivered: 0,
    cancelled: 0,
  })
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  })

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [vendorFilter, setVendorFilter] = useState('all')
  const [workTypeFilter, setWorkTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/lab-vendors?status=active')
      if (!response.ok) throw new Error('Failed to fetch vendors')
      const data = await response.json()
      setVendors(data.data)
    } catch (error) {
      console.error('Error fetching vendors:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (search) params.append('search', search)
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
      if (vendorFilter && vendorFilter !== 'all') params.append('vendorId', vendorFilter)
      if (workTypeFilter && workTypeFilter !== 'all') params.append('workType', workTypeFilter)
      if (priorityFilter && priorityFilter !== 'all') params.append('priority', priorityFilter)

      const response = await fetch(`/api/lab-orders?${params}`)
      if (!response.ok) throw new Error('Failed to fetch lab orders')

      const data = await response.json()
      setOrders(data.data)
      setPagination(data.pagination)

      // Calculate stats
      calculateStats(data.data)
    } catch (error) {
      console.error('Error fetching lab orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (orders: LabOrder[]) => {
    const newStats = {
      total: orders.length,
      created: orders.filter((o) => o.status === 'CREATED').length,
      sentToLab: orders.filter((o) => o.status === 'SENT_TO_LAB').length,
      inProgress: orders.filter((o) => o.status === 'IN_PROGRESS').length,
      ready: orders.filter((o) => o.status === 'READY').length,
      delivered: orders.filter((o) => o.status === 'DELIVERED').length,
      cancelled: orders.filter((o) => o.status === 'CANCELLED').length,
    }
    setStats(newStats)
  }

  useEffect(() => {
    fetchVendors()
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [pagination.page, search, statusFilter, vendorFilter, workTypeFilter, priorityFilter])

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string; icon: any }> = {
      CREATED: {
        label: 'Created',
        className: 'bg-muted text-foreground',
        icon: Package,
      },
      SENT_TO_LAB: {
        label: 'Sent to Lab',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200',
        icon: Truck,
      },
      IN_PROGRESS: {
        label: 'In Progress',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-200',
        icon: Clock,
      },
      QUALITY_CHECK: {
        label: 'Quality Check',
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200',
        icon: FlaskConical,
      },
      READY: {
        label: 'Ready',
        className: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200',
        icon: CheckCircle,
      },
      DELIVERED: {
        label: 'Delivered',
        className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
        icon: CheckCircle,
      },
      FITTED: {
        label: 'Fitted',
        className: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200',
        icon: CheckCircle,
      },
      REMAKE_REQUIRED: {
        label: 'Remake Required',
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200',
        icon: AlertCircle,
      },
      CANCELLED: {
        label: 'Cancelled',
        className: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200',
        icon: XCircle,
      },
    }

    const config = configs[status] || configs.CREATED
    const Icon = config.icon

    return (
      <Badge className={config.className}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      normal: { label: 'Normal', className: 'bg-muted text-foreground' },
      urgent: {
        label: 'Urgent',
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200',
      },
      rush: {
        label: 'Rush',
        className: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200',
      },
    }

    const config = configs[priority] || configs.normal
    return <Badge className={config.className}>{config.label}</Badge>
  }

  // workType is the LabWorkType enum (NIGHT_GUARD, ...), so lower-case the
  // tail rather than leaving it shouting.
  const formatWorkType = (workType: string) => {
    return workType
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lab Work Management</h1>
          <p className="text-muted-foreground">
            Manage lab orders, vendors, and track work progress
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportMenu
            filename="lab-orders"
            getData={() =>
              orders.map((o) => ({
                'Order No': o.orderNumber,
                Patient: o.patientName,
                'Patient Phone': o.patientPhone,
                Vendor: o.vendorName,
                'Work Type': formatWorkType(o.workType),
                Description: o.description || '',
                'Tooth Numbers': o.toothNumbers || '',
                'Shade Guide': o.shadeGuide || '',
                'Order Date': formatDate(o.orderDate),
                'Expected Date': formatDate(o.expectedDate),
                'Sent Date': formatDate(o.sentDate),
                'Received Date': formatDate(o.receivedDate),
                'Delivered Date': formatDate(o.deliveredDate),
                'Estimated Cost': o.estimatedCost,
                'Actual Cost': o.actualCost || '',
                Status: o.status,
                Priority: o.priority,
                'Quality Check': o.qualityCheck,
                Notes: o.notes || '',
              }))
            }
          />
          <Button variant="outline" onClick={() => router.push('/lab/vendors')}>
            <Users className="mr-2 h-4 w-4" />
            Manage Vendors
          </Button>
          <Button onClick={() => router.push('/lab/orders/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Lab Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent to Lab</CardTitle>
            <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sentToLab}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ready}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.created}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders, patients..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="CREATED">Created</SelectItem>
                <SelectItem value="SENT_TO_LAB">Sent to Lab</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="QUALITY_CHECK">Quality Check</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="FITTED">Fitted</SelectItem>
                <SelectItem value="REMAKE_REQUIRED">Remake Required</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={workTypeFilter} onValueChange={setWorkTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Work Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Work Types</SelectItem>
                <SelectItem value="CROWN">Crown</SelectItem>
                <SelectItem value="BRIDGE">Bridge</SelectItem>
                <SelectItem value="DENTURE">Denture</SelectItem>
                <SelectItem value="PARTIAL_DENTURE">Partial Denture</SelectItem>
                <SelectItem value="IMPLANT_CROWN">Implant Crown</SelectItem>
                <SelectItem value="VENEER">Veneer</SelectItem>
                <SelectItem value="INLAY_ONLAY">Inlay/Onlay</SelectItem>
                <SelectItem value="NIGHT_GUARD">Night Guard</SelectItem>
                <SelectItem value="RETAINER">Retainer</SelectItem>
                <SelectItem value="ALIGNER">Aligner</SelectItem>
                <SelectItem value="MODEL">Model</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="rush">Rush</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <FlaskConical className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No lab orders found</h3>
              <p className="text-muted-foreground">Get started by creating your first lab order</p>
              <Button className="mt-4" onClick={() => router.push('/lab/orders/new')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Lab Order
              </Button>
            </div>
          ) : (
            <>
              <div className="divide-y md:hidden">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => router.push(`/lab/orders/${order.id}`)}
                    className="block w-full p-4 text-left transition-colors active:bg-muted/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{order.patientName}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {order.orderNumber} · {formatWorkType(order.workType)}
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{order.vendorName}</span>
                      <span>Expected {formatDate(order.expectedDate)}</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(order.estimatedCost)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="hidden md:table-cell">Order No.</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Work Type</TableHead>
                      <TableHead className="hidden md:table-cell">Vendor</TableHead>
                      <TableHead className="hidden md:table-cell">Order Date</TableHead>
                      <TableHead className="hidden md:table-cell">Expected</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Priority</TableHead>
                      <TableHead className="hidden md:table-cell">Cost</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="hidden font-medium md:table-cell">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.patientName}</div>
                            <div className="text-sm text-muted-foreground">
                              {order.patientPhone}
                            </div>
                            <div className="text-xs text-muted-foreground md:hidden">
                              {order.orderNumber}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatWorkType(order.workType)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div>
                            <div className="font-medium">{order.vendorName}</div>
                            <div className="text-sm text-muted-foreground">{order.vendorPhone}</div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatDate(order.orderDate)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatDate(order.expectedDate)}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {getPriorityBadge(order.priority)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCurrency(order.estimatedCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/lab/orders/${order.id}`)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/lab/orders/${order.id}/edit`)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Order
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} orders
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page === pagination.pages}
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
