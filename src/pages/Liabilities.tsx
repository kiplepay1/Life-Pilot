import { useState, useMemo } from 'react'
import { Plus, Trash2, Scale } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import DataTable, { Column } from '@/components/DataTable'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import CurrencyInput from '@/components/CurrencyInput'
import { TextField, FieldRow } from '@/components/FormField'
import MetricCard from '@/components/MetricCard'
import { LoadingState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { formatCurrency, formatDate } from '@/utils/format'
import type { Liability } from '@/types'

export default function Liabilities() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const liabilities = useCollection<Liability>('liabilities', 'createdAt')
  const { push } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    originalBalance: 0,
    currentBalance: 0,
    monthlyPayment: 0,
    interestRate: 0,
    startDate: '',
    expectedPayoffDate: '',
    notes: '',
  })

  const totalBalance = useMemo(() => liabilities.data.reduce((s, l) => s + l.currentBalance, 0), [liabilities.data])
  const totalMonthlyPayment = useMemo(() => liabilities.data.reduce((s, l) => s + l.monthlyPayment, 0), [liabilities.data])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    try {
      await liabilities.add(form as any)
      push('Liability added.', 'success')
      setModalOpen(false)
      setForm({ name: '', originalBalance: 0, currentBalance: 0, monthlyPayment: 0, interestRate: 0, startDate: '', expectedPayoffDate: '', notes: '' })
    } catch (err: any) {
      push(err?.message ?? 'Could not add liability.', 'error')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await liabilities.remove(deleteTarget)
      push('Liability removed.', 'success')
    } catch (err: any) {
      push(err?.message ?? 'Could not remove.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns: Column<Liability>[] = [
    { key: 'name', header: 'Liability', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'currentBalance', header: 'Current balance', render: (r) => formatCurrency(r.currentBalance, currency) },
    { key: 'monthlyPayment', header: 'Monthly payment', render: (r) => formatCurrency(r.monthlyPayment, currency) },
    { key: 'interestRate', header: 'Rate', render: (r) => (r.interestRate ? `${r.interestRate}%` : '—') },
    { key: 'expectedPayoffDate', header: 'Payoff', render: (r) => formatDate(r.expectedPayoffDate) },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button onClick={() => setDeleteTarget(r.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-brand-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Liabilities</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Loans and financing — not day-to-day bills.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add liability
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard label="Total outstanding balance" value={formatCurrency(totalBalance, currency)} icon={Scale} accent="red" />
        <MetricCard label="Total monthly payments" value={formatCurrency(totalMonthlyPayment, currency)} icon={Scale} accent="amber" />
      </div>

      {liabilities.loading ? (
        <LoadingState />
      ) : (
        <DataTable columns={columns} rows={liabilities.data} rowKey={(r) => r.id} emptyMessage="No liabilities added yet — try your housing loan or car financing." />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add liability">
        <form onSubmit={handleAdd} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <TextField label="Liability name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required placeholder="e.g. Housing loan, Xpander financing" />
          <FieldRow>
            <CurrencyInput label="Original balance" value={form.originalBalance} onChange={(v) => setForm((f) => ({ ...f, originalBalance: v }))} currency={currency} required />
            <CurrencyInput label="Current balance" value={form.currentBalance} onChange={(v) => setForm((f) => ({ ...f, currentBalance: v }))} currency={currency} required />
          </FieldRow>
          <FieldRow>
            <CurrencyInput label="Monthly payment" value={form.monthlyPayment} onChange={(v) => setForm((f) => ({ ...f, monthlyPayment: v }))} currency={currency} required />
            <TextField label="Interest/profit rate % (optional)" type="number" value={String(form.interestRate)} onChange={(v) => setForm((f) => ({ ...f, interestRate: parseFloat(v) || 0 }))} />
          </FieldRow>
          <FieldRow>
            <TextField label="Start date (optional)" type="date" value={form.startDate} onChange={(v) => setForm((f) => ({ ...f, startDate: v }))} />
            <TextField label="Expected payoff date (optional)" type="date" value={form.expectedPayoffDate} onChange={(v) => setForm((f) => ({ ...f, expectedPayoffDate: v }))} />
          </FieldRow>
          <TextField label="Notes (optional)" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save liability</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove liability"
        message="Are you sure you want to remove this liability?"
        confirmLabel="Remove"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
