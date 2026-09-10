import { useState } from 'react'
import { Plus, Trash2, PiggyBank } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import CurrencyInput from '@/components/CurrencyInput'
import { TextField, FieldRow } from '@/components/FormField'
import { LoadingState, EmptyState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { formatCurrency, formatDate, daysUntil } from '@/utils/format'
import type { SavingsGoal } from '@/types'

export default function Savings() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const goals = useCollection<SavingsGoal>('savings', 'targetDate')
  const { push } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [form, setForm] = useState({ goal: '', targetAmount: 0, currentAmount: 0, targetDate: new Date().toISOString().slice(0, 10) })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    try {
      await goals.add(form)
      push('Savings goal added.', 'success')
      setModalOpen(false)
      setForm({ goal: '', targetAmount: 0, currentAmount: 0, targetDate: new Date().toISOString().slice(0, 10) })
    } catch (err: any) {
      push(err?.message ?? 'Could not add goal.', 'error')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await goals.remove(deleteTarget)
      push('Goal deleted.', 'success')
    } catch (err: any) {
      push(err?.message ?? 'Could not delete.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-brand-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Savings</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Set goals and track your progress toward them.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add goal
        </button>
      </div>

      {goals.loading ? (
        <LoadingState />
      ) : goals.data.length === 0 ? (
        <EmptyState title="No savings goals yet" description="Create your first goal to start tracking progress." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.data.map((g) => {
            const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0
            const remaining = Math.max(0, g.targetAmount - g.currentAmount)
            const days = daysUntil(g.targetDate)
            return (
              <div key={g.id} className="card p-5">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-slate-900">{g.goal}</h3>
                  <button onClick={() => setDeleteTarget(g.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 h-2.5 w-full rounded-full bg-slate-100">
                  <div className="h-2.5 rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold text-brand-700">{pct.toFixed(0)}%</span>
                  <span className="text-slate-500">
                    {formatCurrency(g.currentAmount, currency)} / {formatCurrency(g.targetAmount, currency)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span>{formatCurrency(remaining, currency)} remaining</span>
                  <span>
                    Target {formatDate(g.targetDate)}
                    {days !== null && days >= 0 ? ` (${days}d)` : ''}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add savings goal">
        <form onSubmit={handleAdd} className="space-y-4">
          <TextField label="Goal name" value={form.goal} onChange={(v) => setForm((f) => ({ ...f, goal: v }))} required placeholder="e.g. Emergency fund" />
          <FieldRow>
            <CurrencyInput label="Target amount" value={form.targetAmount} onChange={(v) => setForm((f) => ({ ...f, targetAmount: v }))} currency={currency} required />
            <CurrencyInput label="Current amount" value={form.currentAmount} onChange={(v) => setForm((f) => ({ ...f, currentAmount: v }))} currency={currency} />
          </FieldRow>
          <TextField label="Target date" type="date" value={form.targetDate} onChange={(v) => setForm((f) => ({ ...f, targetDate: v }))} required />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save goal</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete goal"
        message="Are you sure you want to delete this savings goal?"
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
