'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  PageIntro,
  ResourceState,
  useResource,
  sendJson,
  fieldClass,
} from '@/components/operations/resource'
import { expenseCategories } from '@/lib/parity-validation'
import { formatCurrency } from '@/lib/billing-utils'
type Expense = {
  id: string
  expenseDate: string
  description: string
  category: string
  paymentMode: string
  amount: string
  reference: string | null
  voidedAt: string | null
  voidReason: string | null
}
export default function ExpensesPage() {
  const [from, setFrom] = useState(''),
    [to, setTo] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const { data, loading, error, reload } = useResource<{ expenses: Expense[]; total: number }>(
    `/api/expenses?from=${from}&to=${to}`
  )
  const [saving, setSaving] = useState(false),
    [notice, setNotice] = useState('')
  const [voidId, setVoidId] = useState(''),
    [reason, setReason] = useState('')
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget,
      fields = new FormData(form)
    setSaving(true)
    setNotice('')
    try {
      await sendJson('/api/expenses', 'POST', Object.fromEntries(fields))
      form.reset()
      setExpenseDate('')
      setNotice('Expense recorded.')
      await reload()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setSaving(false)
    }
  }
  async function voidExpense() {
    setSaving(true)
    setNotice('')
    try {
      await sendJson(`/api/expenses/${voidId}`, 'PATCH', { reason })
      setVoidId('')
      setReason('')
      await reload()
    } catch (e) {
      setNotice((e as Error).message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="space-y-8">
      <PageIntro title="Clinic expenses">
        Record salaries, rent, utilities and other operating costs. Inventory purchases already
        appear in financial reports; record each cost once.
      </PageIntro>
      <form
        onSubmit={save}
        className="grid gap-4 rounded-lg border p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="space-y-2">
          <Label htmlFor="expense-description">Description</Label>
          <Input
            id="expense-description"
            name="description"
            required
            minLength={2}
            maxLength={500}
            placeholder="October clinic rent"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-category">Category</Label>
          <select id="expense-category" name="category" className={fieldClass}>
            {expenseCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-amount">Amount (INR)</Label>
          <Input
            id="expense-amount"
            name="amount"
            type="number"
            min="0.01"
            max="99999999.99"
            step="0.01"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-date">Expense date</Label>
          <Input
            id="expense-date"
            name="expenseDate"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-mode">Payment method</Label>
          <select id="expense-mode" name="paymentMode" className={fieldClass}>
            {['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CHEQUE'].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="expense-reference">Receipt or reference (optional)</Label>
          <Input id="expense-reference" name="reference" maxLength={200} />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Record expense'}
        </Button>
      </form>
      {notice && <p role="status">{notice}</p>}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="expense-from">From</Label>
            <Input
              id="expense-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-to">To</Label>
            <Input id="expense-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {data && (
            <p className="ml-auto text-lg font-semibold tabular-nums">
              Active expenses: {formatCurrency(data.total)}
            </p>
          )}
        </div>
        <ResourceState loading={loading} error={error} retry={reload} />
        {!loading && !error && data && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  {['Date', 'Description', 'Category', 'Method', 'Amount', 'Actions'].map((h) => (
                    <th key={h} className="p-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.expenses.map((e) => (
                  <tr key={e.id} className="border-b">
                    <td className="p-3 whitespace-nowrap">{e.expenseDate.slice(0, 10)}</td>
                    <td className="p-3">
                      {e.description}
                      <p className="text-muted-foreground">{e.voidReason || e.reference}</p>
                    </td>
                    <td className="p-3">{e.category}</td>
                    <td className="p-3">{e.paymentMode}</td>
                    <td className="p-3 tabular-nums whitespace-nowrap">
                      {formatCurrency(Number(e.amount))}
                    </td>
                    <td className="p-3">
                      {e.voidedAt ? (
                        'Voided'
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setVoidId(e.id)
                            setReason('')
                          }}
                        >
                          Void expense
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.expenses.length && (
              <p className="py-8 text-center text-muted-foreground">
                No expenses recorded in this period.
              </p>
            )}
          </div>
        )}
      </section>
      {voidId && (
        <section className="space-y-3 rounded-lg border p-5">
          <Label htmlFor="void-reason">Reason for voiding</Label>
          <Input
            id="void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minLength={3}
            maxLength={500}
          />
          <div className="flex gap-3">
            <Button disabled={saving || reason.trim().length < 3} onClick={voidExpense}>
              Confirm void
            </Button>
            <Button variant="outline" onClick={() => setVoidId('')}>
              Keep expense
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
