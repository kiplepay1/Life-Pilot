import { useState, useMemo } from 'react'
import { Plus, Trash2, Receipt, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import DataTable, { Column } from '@/components/DataTable'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import CurrencyInput from '@/components/CurrencyInput'
import { SelectField, TextField, FieldRow } from '@/components/FormField'
import StatusBadge from '@/components/StatusBadge'
import { LoadingState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { formatCurrency, formatDate, daysUntil } from '@/utils/format'
import type { Bill, BillFrequency } from '@/types'

export default function Bills() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const bills = useCollection<Bill>('bills', 'dueDate')
  const { push } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    amount: 0,
    dueDate: new Date().toISOString().slice(0, 10),
    frequency: 'monthly' as BillFrequency,
    autoPayment: false,
    notes: '',
  })

  // Auto-derive overdue status from due date, but respect a manual "paid" mark.
  const rows = useMemo(
    () =>
      bills.data.map((b) => {
        if (b.status === 'paid') return b
        const days = daysUntil(b.dueDate)
        return { ...b, status: days !== null && days < 0 ? 'overdue' : 'upcoming' } as Bill
      }),
    [bills.data]
  )

  const upcoming = rows.filter((b) => b.status === 'upcoming').length
  const overdue = rows.filter((b) => b.status === 'overdue').length

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    try {
      await bills.add({ ...form, status: 'upcoming' })
      push('Bill added.', 'success')
      setModalOpen(false)
      setForm({ name: '', amount: 0, dueDate: new Date().toISOString().slice(0, 10), frequency: 'monthly', autoPayment: false, notes: '' })
    } catch (err: any) {
      push(err?.message ?? 'Could not add bill.', 'error')
    }
  }

  async function markPaid(id: string) {
    try {
      await bills.update(id, { status: 'paid' } as Partial<Bill>)
      push('Marked as paid.', 'success')
    } catch (err: any) {
      push(err?.message ?? 'Could not update bill.', 'error')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await bills.remove(deleteTarget)
      push('Bill deleted.', 'success')
    } catch (err: any) {
      push(err?.message ?? 'Could not delete.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns: Column<Bill>[] = [
    { key: 'name', header: 'Bill', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount, currency) },
    { key: 'dueDate', header: 'Due date', render: (r) => formatDate(r.dueDate) },
    { key: 'frequency', header: 'Frequency', render: (r) => <span className="capitalize">{r.frequency}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex items-center gap-2">
          {r.status !== 'paid' && (
            <button onClick={() => markPaid(r.id)} className="text-slate-400 hover:text-emerald-600" aria-label="Mark as paid">
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => setDeleteTarget(r.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-brand-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bills</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {upcoming} upcoming · {overdue} overdue
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add bill
        </button>
      </div>

      {bills.loading ? (
        <LoadingState />
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage="No bills yet. Add your first recurring or one-off bill." />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add bill">
        <form onSubmit={handleAdd} className="space-y-4">
          <TextField label="Bill name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required placeholder="e.g. Electricity, Internet" />
          <FieldRow>
            <CurrencyInput label="Amount" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} currency={currency} required />
            <TextField label="Due date" type="date" value={form.dueDate} onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))} required />
          </FieldRow>
          <FieldRow>
            <SelectField
              label="Frequency"
              value={form.frequency}
              onChange={(v) => setForm((f) => ({ ...f, frequency: v as BillFrequency }))}
              options={['one-off', 'weekly', 'monthly', 'quarterly', 'yearly']}
            />
            <SelectField
              label="Auto-payment"
              value={form.autoPayment ? 'Yes' : 'No'}
              onChange={(v) => setForm((f) => ({ ...f, autoPayment: v === 'Yes' }))}
              options={['No', 'Yes']}
            />
          </FieldRow>
          <TextField label="Notes (optional)" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save bill</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete bill"
        message="Are you sure you want to delete this bill? This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
