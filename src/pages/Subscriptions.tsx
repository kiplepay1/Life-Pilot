import { useState, useMemo } from 'react'
import { Plus, Trash2, Repeat } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import DataTable, { Column } from '@/components/DataTable'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import CurrencyInput from '@/components/CurrencyInput'
import { SelectField, TextField, FieldRow } from '@/components/FormField'
import MetricCard from '@/components/MetricCard'
import { LoadingState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { formatCurrency, formatDate } from '@/utils/format'
import { Wallet, Calendar, TrendingDown } from 'lucide-react'
import type { Subscription, BillingCycle } from '@/types'

export default function Subscriptions() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const subs = useCollection<Subscription>('subscriptions', 'nextBillingDate')
  const { push } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const [form, setForm] = useState({
    service: '',
    amount: 0,
    billingCycle: 'monthly' as BillingCycle,
    nextBillingDate: new Date().toISOString().slice(0, 10),
    category: 'Entertainment',
    notes: '',
  })

  const monthlyCost = useMemo(
    () => subs.data.reduce((s, sub) => s + (sub.billingCycle === 'yearly' ? sub.amount / 12 : sub.amount), 0),
    [subs.data]
  )
  const annualCost = monthlyCost * 12
  const upcomingRenewals = subs.data.filter((s) => {
    const days = Math.round((new Date(s.nextBillingDate).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 14
  }).length

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    try {
      await subs.add(form)
      push('Subscription added.', 'success')
      setModalOpen(false)
      setForm({ service: '', amount: 0, billingCycle: 'monthly', nextBillingDate: new Date().toISOString().slice(0, 10), category: 'Entertainment', notes: '' })
    } catch (err: any) {
      push(err?.message ?? 'Could not add subscription.', 'error')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await subs.remove(deleteTarget)
      push('Subscription removed.', 'success')
    } catch (err: any) {
      push(err?.message ?? 'Could not remove.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns: Column<Subscription>[] = [
    { key: 'service', header: 'Service', render: (r) => <span className="font-medium text-slate-900">{r.service}</span> },
    { key: 'category', header: 'Category', render: (r) => r.category },
    { key: 'amount', header: 'Amount', render: (r) => `${formatCurrency(r.amount, currency)} / ${r.billingCycle === 'yearly' ? 'yr' : 'mo'}` },
    { key: 'nextBillingDate', header: 'Next billing', render: (r) => formatDate(r.nextBillingDate) },
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
            <Repeat className="h-5 w-5 text-brand-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscriptions</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Keep track of every recurring service.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add subscription
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard label="Monthly cost" value={formatCurrency(monthlyCost, currency)} icon={Wallet} accent="brand" />
        <MetricCard label="Annual cost" value={formatCurrency(annualCost, currency)} icon={TrendingDown} accent="amber" />
        <MetricCard label="Renewing in 14 days" value={String(upcomingRenewals)} icon={Calendar} accent="green" />
      </div>

      {subs.loading ? (
        <LoadingState />
      ) : (
        <DataTable columns={columns} rows={subs.data} rowKey={(r) => r.id} emptyMessage="No subscriptions tracked yet." />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add subscription">
        <form onSubmit={handleAdd} className="space-y-4">
          <TextField label="Service" value={form.service} onChange={(v) => setForm((f) => ({ ...f, service: v }))} required placeholder="e.g. Netflix, Spotify" />
          <FieldRow>
            <CurrencyInput label="Amount" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} currency={currency} required />
            <SelectField label="Billing cycle" value={form.billingCycle} onChange={(v) => setForm((f) => ({ ...f, billingCycle: v as BillingCycle }))} options={['monthly', 'yearly']} />
          </FieldRow>
          <FieldRow>
            <TextField label="Next billing date" type="date" value={form.nextBillingDate} onChange={(v) => setForm((f) => ({ ...f, nextBillingDate: v }))} required />
            <TextField label="Category" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} placeholder="e.g. Entertainment" />
          </FieldRow>
          <TextField label="Notes (optional)" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save subscription</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove subscription"
        message="Are you sure you want to remove this subscription?"
        confirmLabel="Remove"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
