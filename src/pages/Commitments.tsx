import { useState, useMemo } from 'react'
import { Plus, Trash2, Receipt, CheckCircle2, Undo2, Pencil } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import CurrencyInput from '@/components/CurrencyInput'
import { SelectField, TextField, FieldRow } from '@/components/FormField'
import { LoadingState, EmptyState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { formatCurrency, classNames } from '@/utils/format'
import { monthKey } from '@/utils/grab'
import { COMMITMENT_CATEGORIES } from '@/types'
import type { Commitment, CommitmentCategory } from '@/types'

const emptyForm = {
  title: '',
  category: 'Other' as CommitmentCategory,
  amount: 0,
  paymentDay: 1,
  notes: '',
}

export default function Commitments() {
  const { profile, firebaseUser } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const commitments = useCollection<Commitment>('commitments', 'createdAt')
  const { push } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Commitment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const thisMonth = monthKey(new Date().toISOString())

  const rows = useMemo(
    () =>
      [...commitments.data].sort((a, b) => a.paymentDay - b.paymentDay).map((c) => ({
        ...c,
        isPaid: c.lastPaidMonth === thisMonth,
      })),
    [commitments.data, thisMonth]
  )

  const totalAmount = useMemo(() => commitments.data.reduce((s, c) => s + c.amount, 0), [commitments.data]);
  const paidCount = rows.filter((r) => r.isPaid).length
  const paidAmount = rows.filter((r) => r.isPaid).reduce((s, r) => s + r.amount, 0)
  const progressPercent = rows.length > 0 ? (paidCount / rows.length) * 100 : 0

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(c: Commitment) {
    setEditing(c)
    setForm({ title: c.title, category: c.category, amount: c.amount, paymentDay: c.paymentDay, notes: c.notes })
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (editing) {
        await commitments.update(editing.id, form)
        push('Commitment updated.', 'success')
      } else {
        await commitments.add(form)
        push('Commitment added.', 'success')
      }
      setModalOpen(false)
    } catch (err: any) {
      push(err?.message ?? 'Could not save commitment.', 'error')
    }
  }

  async function markPaid(c: Commitment) {
    if (!firebaseUser) return
    try {
      await commitments.update(c.id, { lastPaidMonth: thisMonth, lastPaidDate: new Date().toISOString() } as Partial<Commitment>)
    } catch (err: any) {
      push(err?.message ?? 'Could not update.', 'error')
    }
  }

  async function undoPaid(c: Commitment) {
    try {
      await commitments.update(c.id, { lastPaidMonth: '', lastPaidDate: '' } as Partial<Commitment>)
    } catch (err: any) {
      push(err?.message ?? 'Could not update.', 'error')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await commitments.remove(deleteTarget)
      push('Commitment deleted.', 'success')
    } catch (err: any) {
      push(err?.message ?? 'Could not delete.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  if (commitments.loading) return <LoadingState />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-brand-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Commitments</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Everything you pay every month, in one place.</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="h-4 w-4" /> Add commitment
        </button>
      </div>

      {rows.length > 0 && (
        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-slate-500">This month</p>
              <p className="text-xl font-bold text-slate-900">
                {paidCount}/{rows.length} paid · {formatCurrency(paidAmount, currency)} of {formatCurrency(totalAmount, currency)}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2.5 w-full rounded-full bg-slate-100">
            <div className="h-2.5 rounded-full bg-brand-600 transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState title="No commitments yet" description="Add your house loan, car, subscriptions, insurance — anything you pay monthly." />
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <div key={c.id} className={classNames('card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between', c.isPaid && 'border-emerald-200 bg-emerald-50/40')}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-slate-900">{c.title}</p>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{c.category}</span>
                </div>
                <p className="text-xs text-slate-400">
                  Due day {c.paymentDay} of month
                  {c.isPaid && c.lastPaidDate ? ` · Paid ${new Date(c.lastPaidDate).toLocaleDateString('en-MY', { day: '2-digit', month: 'short' })}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 sm:gap-4">
                <p className="text-lg font-bold text-slate-900">{formatCurrency(c.amount, currency)}</p>
                {c.isPaid ? (
                  <button onClick={() => undoPaid(c)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50">
                    <Undo2 className="h-3.5 w-3.5" /> Undo
                  </button>
                ) : (
                  <button onClick={() => markPaid(c)} className="btn-primary !px-3 !py-1.5 text-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                  </button>
                )}
                <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-brand-600" aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setDeleteTarget(c.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit commitment' : 'Add commitment'}>
        <form onSubmit={handleSave} className="space-y-4">
          <TextField label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} required placeholder="e.g. House Loan, Netflix" />
          <FieldRow>
            <CurrencyInput label="Amount" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} currency={currency} required />
            <TextField
              label="Payment day (1-31)"
              type="number"
              value={String(form.paymentDay)}
              onChange={(v) => setForm((f) => ({ ...f, paymentDay: Math.min(31, Math.max(1, parseInt(v) || 1)) }))}
              required
            />
          </FieldRow>
          <SelectField label="Category" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v as CommitmentCategory }))} options={COMMITMENT_CATEGORIES} />
          <TextField label="Notes (optional)" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <p className="text-xs text-slate-400">
            The amount can be different next month — just edit it here anytime. Paid status automatically resets each new month.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Save changes' : 'Save commitment'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete commitment"
        message="Are you sure you want to delete this commitment? This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
