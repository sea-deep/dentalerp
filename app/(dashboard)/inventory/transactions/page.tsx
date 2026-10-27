'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

interface Transaction {
  id: number
  type: string
  itemName: string
  sku: string
  quantity: number
  unitPrice: number
  totalPrice: number
  transactionDate: string
  performedByName: string
  supplierName: string
  batchNumber: string
  notes: string
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [items, setItems] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [transactionType, setTransactionType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  })

  const [formData, setFormData] = useState({
    type: 'purchase',
    itemId: '',
    quantity: 0,
    unitPrice: 0,
    transactionDate: new Date().toISOString().split('T')[0],
    supplierId: '',
    notes: '',
  })

  useEffect(() => {
    fetchTransactions()
    fetchItems()
    fetchSuppliers()
  }, [transactionType, startDate, endDate, pagination.page])

  const fetchTransactions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(transactionType && { type: transactionType }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      })

      const response = await fetch(`/api/inventory/transactions?${params}`)
      const data = await response.json()

      if (data.success) {
        setTransactions(data.data)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/inventory/items?status=active&limit=1000')
      const data = await response.json()
      if (data.success) {
        setItems(data.data)
      }
    } catch (error) {
      console.error('Error fetching items:', error)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/inventory/suppliers?status=active')
      const data = await response.json()
      if (data.success) {
        setSuppliers(data.data)
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target

    if (type === 'number') {
      setFormData({ ...formData, [name]: parseFloat(value) || 0 })
    } else {
      setFormData({ ...formData, [name]: value })
    }

    // Auto-fill unit price when item is selected
    if (name === 'itemId' && value) {
      const selectedItem = items.find((item) => item.id === parseInt(value))
      if (selectedItem) {
        setFormData((prev) => ({ ...prev, unitPrice: selectedItem.unitPrice }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const response = await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        alert('Transaction recorded successfully!')
        setShowAddModal(false)
        fetchTransactions()
        // Reset form
        setFormData({
          type: 'purchase',
          itemId: '',
          quantity: 0,
          unitPrice: 0,
          transactionDate: new Date().toISOString().split('T')[0],
          supplierId: '',
          notes: '',
        })
      } else {
        alert(data.error || 'Failed to record transaction')
      }
    } catch (error) {
      console.error('Error recording transaction:', error)
      alert('Failed to record transaction')
    }
  }

  const getTransactionTypeBadge = (type: string) => {
    const badges: any = {
      purchase: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-200',
      sale: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200',
      adjustment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-200',
      return: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200',
      usage: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-200',
      wastage: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200',
      previousStock: 'bg-muted text-foreground',
    }

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[type] || 'bg-muted text-foreground'}`}
      >
        {type.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Stock Transactions</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/inventory"
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
          >
            Back to Inventory
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            + New Transaction
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-background rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="purchase">Purchase</option>
            <option value="sale">Sale</option>
            <option value="adjustment">Adjustment</option>
            <option value="return">Return</option>
            <option value="usage">Usage</option>
            <option value="wastage">Wastage</option>
          </select>

          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[160px]"
            placeholder="Start Date"
          />

          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[160px]"
            placeholder="End Date"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-background rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No transactions found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="hidden px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider md:table-cell">
                      Date
                    </th>
                    <th className="px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Item
                    </th>
                    <th className="hidden px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider sm:table-cell">
                      Quantity
                    </th>
                    <th className="hidden px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider md:table-cell">
                      Unit Price
                    </th>
                    <th className="px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="hidden px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider md:table-cell">
                      Supplier
                    </th>
                    <th className="hidden px-2 py-3 sm:px-6 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider md:table-cell">
                      Performed By
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-background divide-y divide-border">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-muted/50">
                      <td className="hidden px-2 py-4 sm:px-6 whitespace-nowrap text-sm text-foreground md:table-cell">
                        {new Date(transaction.transactionDate).toLocaleDateString()}
                      </td>
                      <td className="px-2 py-4 sm:px-6 whitespace-nowrap">
                        {getTransactionTypeBadge(transaction.type)}
                      </td>
                      <td className="px-2 py-4 text-sm text-foreground sm:px-6">
                        {transaction.itemName}
                        <br />
                        <span className="text-xs text-muted-foreground">{transaction.sku}</span>
                        <div className="text-xs text-muted-foreground md:hidden">
                          {transaction.quantity} units &middot;{' '}
                          {new Date(transaction.transactionDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="hidden px-2 py-4 sm:px-6 whitespace-nowrap text-sm text-foreground sm:table-cell">
                        {transaction.quantity}
                      </td>
                      <td className="hidden px-2 py-4 sm:px-6 whitespace-nowrap text-sm text-foreground md:table-cell">
                        {formatCurrency(transaction.unitPrice)}
                      </td>
                      <td className="px-2 py-4 sm:px-6 whitespace-nowrap text-sm font-medium text-foreground">
                        {formatCurrency(transaction.totalPrice)}
                      </td>
                      <td className="hidden px-2 py-4 sm:px-6 whitespace-nowrap text-sm text-muted-foreground md:table-cell">
                        {transaction.supplierName || '-'}
                      </td>
                      <td className="hidden px-2 py-4 sm:px-6 whitespace-nowrap text-sm text-muted-foreground md:table-cell">
                        {transaction.performedByName}
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
                    total transactions)
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

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">New Stock Transaction</h2>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Transaction Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="purchase">Purchase</option>
                    <option value="adjustment">Adjustment</option>
                    <option value="usage">Usage</option>
                    <option value="wastage">Wastage</option>
                    <option value="return">Return</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Item <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="itemId"
                    value={formData.itemId}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                    step="0.01"
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    name="unitPrice"
                    value={formData.unitPrice}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Transaction Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    name="transactionDate"
                    value={formData.transactionDate}
                    onChange={handleChange}
                    required
                    className="w-full"
                  />
                </div>

                {formData.type === 'purchase' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Supplier
                    </label>
                    <select
                      name="supplierId"
                      value={formData.supplierId}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mt-6 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2 border border-border rounded-lg hover:bg-muted/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Record Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
