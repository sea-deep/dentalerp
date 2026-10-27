'use client'

import { useState, useEffect, type FormEvent } from 'react'
import Link from 'next/link'
import { Eye, Pencil, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

interface Supplier {
  id: string
  code: string
  name: string
  contactPerson: string | null
  phone: string
  email: string | null
  city: string | null
  status: string
  itemsSupplied: number
  totalOrders: number
  totalBusiness: number
}

interface SupplierDetail extends Supplier {
  address: string | null
  state: string | null
  pincode: string | null
  gstNumber: string | null
  panNumber: string | null
  paymentTerms: string | null
  creditLimit: string | number | null
  notes: string | null
  completedBusiness: number
  pendingBusiness: number
}

interface SupplierForm {
  code: string
  name: string
  phone: string
  contactPerson: string
  email: string
  address: string
  city: string
  state: string
  pincode: string
  gstNumber: string
  paymentTerms: string
  creditLimit: string
}

const EMPTY_FORM: SupplierForm = {
  code: '',
  name: '',
  phone: '',
  contactPerson: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gstNumber: '',
  paymentTerms: 'Net 30',
  creditLimit: '',
}

export default function SuppliersPage() {
  const { toast } = useToast()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<SupplierForm>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SupplierForm, string>>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [detail, setDetail] = useState<SupplierDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  })

  useEffect(() => {
    fetchSuppliers()
  }, [search, statusFilter, pagination.page])

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      })

      const response = await fetch(`/api/inventory/suppliers?${params}`)
      const data = await response.json()

      if (data.success) {
        setSuppliers(data.data)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setSaveError(null)
    setShowForm(true)
  }

  const openEdit = async (supplier: Supplier) => {
    setEditingId(supplier.id)
    setFieldErrors({})
    setSaveError(null)
    setForm({
      code: supplier.code,
      name: supplier.name,
      phone: supplier.phone,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      address: '',
      city: supplier.city || '',
      state: '',
      pincode: '',
      gstNumber: '',
      paymentTerms: 'Net 30',
      creditLimit: '',
    })
    setShowForm(true)

    // The list payload is trimmed, so pull the full record before editing.
    try {
      const response = await fetch(`/api/inventory/suppliers/${supplier.id}`)
      const data = await response.json()
      if (response.ok && data.success) {
        const full: SupplierDetail = data.data
        setForm({
          code: full.code,
          name: full.name,
          phone: full.phone,
          contactPerson: full.contactPerson || '',
          email: full.email || '',
          address: full.address || '',
          city: full.city || '',
          state: full.state || '',
          pincode: full.pincode || '',
          gstNumber: full.gstNumber || '',
          paymentTerms: full.paymentTerms || 'Net 30',
          creditLimit: full.creditLimit != null ? String(full.creditLimit) : '',
        })
      }
    } catch {
      // Keep the values we already have; the user can still retype them.
    }
  }

  const openDetail = async (supplier: Supplier) => {
    setDetailLoading(true)
    setDetail(null)
    try {
      const response = await fetch(`/api/inventory/suppliers/${supplier.id}`)
      const data = await response.json()
      if (response.ok && data.success) setDetail(data.data)
      else toast({ title: 'Could not load supplier', variant: 'destructive' })
    } catch {
      toast({ title: 'Could not load supplier', variant: 'destructive' })
    } finally {
      setDetailLoading(false)
    }
  }

  const setField = (field: keyof SupplierForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
  }

  const validate = () => {
    const errors: Partial<Record<keyof SupplierForm, string>> = {}
    if (!form.code.trim()) errors.code = 'Enter a supplier code'
    if (!form.name.trim()) errors.name = 'Enter the supplier name'
    if (!form.phone.trim()) errors.phone = 'Enter a phone number'
    else if (!/^[0-9+\-\s()]{6,20}$/.test(form.phone.trim()))
      errors.phone = 'Enter a valid phone number'
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      errors.email = 'Enter a valid email address'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const saveSupplier = async (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return

    setSaving(true)
    setSaveError(null)
    try {
      const response = await fetch(
        editingId ? `/api/inventory/suppliers/${editingId}` : '/api/inventory/suppliers',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            creditLimit: Number(form.creditLimit) || 0,
          }),
        }
      )
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save the supplier')

      toast({
        title: editingId ? 'Supplier updated' : 'Supplier added',
        description: `${form.name} is ready to use on purchase orders.`,
      })
      setShowForm(false)
      await fetchSuppliers()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save the supplier')
    } finally {
      setSaving(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200',
      INACTIVE: 'bg-muted text-foreground',
      BLOCKED: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200',
    }

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[status as keyof typeof badges]}`}
      >
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </span>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Supplier Management</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/inventory"
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
          >
            Back to Inventory
          </Link>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add supplier
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-background rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Search by name, code, contact person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-background rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No suppliers found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="hidden px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider md:table-cell">
                      Code
                    </th>
                    <th className="px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Name
                    </th>
                    <th className="hidden px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider md:table-cell">
                      Contact Person
                    </th>
                    <th className="hidden px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider md:table-cell">
                      Phone
                    </th>
                    <th className="hidden px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider md:table-cell">
                      Email
                    </th>
                    <th className="px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="hidden px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider md:table-cell">
                      Items
                    </th>
                    <th className="hidden px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider md:table-cell">
                      Total Business
                    </th>
                    <th className="px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-muted/50">
                      <td className="hidden px-2 py-4 sm:px-6 whitespace-nowrap text-sm font-medium text-foreground md:table-cell">
                        {supplier.code}
                      </td>
                      <td className="px-2 py-4 sm:px-6 whitespace-nowrap text-sm text-foreground">
                        <div>{supplier.name}</div>
                        <div className="text-xs text-muted-foreground md:hidden">
                          {supplier.code} · {supplier.phone}
                        </div>
                      </td>
                      <td className="hidden px-2 py-4 sm:px-6 whitespace-nowrap text-sm text-muted-foreground md:table-cell">
                        {supplier.contactPerson || '-'}
                      </td>
                      <td className="hidden px-2 py-4 sm:px-6 whitespace-nowrap text-sm text-foreground md:table-cell">
                        {supplier.phone}
                      </td>
                      <td className="hidden px-2 py-4 sm:px-6 whitespace-nowrap text-sm text-muted-foreground md:table-cell">
                        {supplier.email || '-'}
                      </td>
                      <td className="px-2 py-4 sm:px-6 whitespace-nowrap">
                        {getStatusBadge(supplier.status)}
                      </td>
                      <td className="hidden px-2 py-4 sm:px-6 whitespace-nowrap text-sm text-foreground md:table-cell">
                        {supplier.itemsSupplied}
                      </td>
                      <td className="hidden px-2 py-4 sm:px-6 whitespace-nowrap text-sm text-foreground md:table-cell">
                        {formatCurrency(supplier.totalBusiness)}
                      </td>
                      <td className="px-2 py-4 sm:px-6 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(supplier)}>
                            <Eye className="h-3.5 w-3.5 sm:mr-1" />
                            <span className="hidden sm:inline">View</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1"
                            onClick={() => openEdit(supplier)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-background px-4 py-3 flex items-center justify-between border-t border-border sm:px-6">
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-foreground">
                    Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                    <span className="font-medium">{pagination.pages}</span> ({pagination.total}{' '}
                    total suppliers)
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-background text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      disabled={pagination.page === pagination.pages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-background text-sm font-medium text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / edit supplier */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open)
          if (!open) setSaveError(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit supplier' : 'Add supplier'}</DialogTitle>
            <DialogDescription>
              Suppliers appear in the purchase order picker once saved.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={saveSupplier} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Supplier code"
                htmlFor="supplier-code"
                required
                error={fieldErrors.code}
              >
                <Input
                  id="supplier-code"
                  value={form.code}
                  onChange={(event) => setField('code', event.target.value)}
                  placeholder="e.g. SUP-001"
                  autoFocus
                />
              </FormField>
              <FormField
                label="Supplier name"
                htmlFor="supplier-name"
                required
                error={fieldErrors.name}
              >
                <Input
                  id="supplier-name"
                  value={form.name}
                  onChange={(event) => setField('name', event.target.value)}
                  placeholder="e.g. Chennai Dental Supplies"
                />
              </FormField>
              <FormField label="Phone" htmlFor="supplier-phone" required error={fieldErrors.phone}>
                <Input
                  id="supplier-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setField('phone', event.target.value)}
                  placeholder="98765 43210"
                />
              </FormField>
              <FormField label="Contact person" htmlFor="supplier-contact">
                <Input
                  id="supplier-contact"
                  value={form.contactPerson}
                  onChange={(event) => setField('contactPerson', event.target.value)}
                  placeholder="Who do we call?"
                />
              </FormField>
              <FormField label="Email" htmlFor="supplier-email" error={fieldErrors.email}>
                <Input
                  id="supplier-email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setField('email', event.target.value)}
                  placeholder="orders@supplier.com"
                />
              </FormField>
              <FormField label="GSTIN" htmlFor="supplier-gst">
                <Input
                  id="supplier-gst"
                  value={form.gstNumber}
                  onChange={(event) => setField('gstNumber', event.target.value)}
                  placeholder="33AABCU9603R1ZM"
                />
              </FormField>
              <FormField label="City" htmlFor="supplier-city">
                <Input
                  id="supplier-city"
                  value={form.city}
                  onChange={(event) => setField('city', event.target.value)}
                />
              </FormField>
              <FormField label="Payment terms" htmlFor="supplier-terms">
                <Input
                  id="supplier-terms"
                  value={form.paymentTerms}
                  onChange={(event) => setField('paymentTerms', event.target.value)}
                  placeholder="Net 30"
                />
              </FormField>
            </div>

            <FormField label="Address" htmlFor="supplier-address">
              <Textarea
                id="supplier-address"
                value={form.address}
                onChange={(event) => setField('address', event.target.value)}
                placeholder="Street, area, city, PIN"
                rows={2}
              />
            </FormField>

            {saveError && (
              <p role="alert" className="text-sm text-destructive">
                {saveError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add supplier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier detail */}
      <Dialog open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.name ?? 'Supplier'}</DialogTitle>
            <DialogDescription>
              {detail ? `${detail.code} · ${statusLabel(detail.status)}` : 'Loading supplier…'}
            </DialogDescription>
          </DialogHeader>

          {detailLoading && !detail ? (
            <p className="py-6 text-sm text-muted-foreground">Loading supplier…</p>
          ) : detail ? (
            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <DetailItem label="Contact person" value={detail.contactPerson} />
                <DetailItem label="Phone" value={detail.phone} />
                <DetailItem label="Email" value={detail.email} />
                <DetailItem label="City" value={detail.city} />
                <DetailItem label="GSTIN" value={detail.gstNumber} />
                <DetailItem label="Payment terms" value={detail.paymentTerms} />
                <DetailItem
                  label="Credit limit"
                  value={
                    detail.creditLimit != null ? formatCurrency(Number(detail.creditLimit)) : null
                  }
                />
                <DetailItem label="Items supplied" value={String(detail.itemsSupplied)} />
                <DetailItem label="Purchase orders" value={String(detail.totalOrders)} />
                <DetailItem
                  label="Completed business"
                  value={formatCurrency(Number(detail.completedBusiness ?? 0))}
                />
              </dl>
              {detail.address && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Address
                  </p>
                  <p className="mt-1 whitespace-pre-line">{detail.address}</p>
                </div>
              )}
              {detail.notes && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Notes
                  </p>
                  <p className="mt-1 whitespace-pre-line">{detail.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">Supplier could not be loaded.</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>
              Close
            </Button>
            {detail && (
              <Button
                onClick={() => {
                  const supplier = detail
                  setDetail(null)
                  void openEdit(supplier)
                }}
              >
                Edit supplier
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words">{value || '—'}</dd>
    </div>
  )
}

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase()
}
