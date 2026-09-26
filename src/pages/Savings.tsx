import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, PiggyBank, Home } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import { useSettingsDoc } from '@/services/useSettingsDoc'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import CurrencyInput from '@/components/CurrencyInput'
import { TextField, FieldRow } from '@/components/FormField'
import { LoadingState, EmptyState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { formatCurrency, formatDate, daysUntil, classNames } from '@/utils/format'
import { monthKey } from '@/utils/grab'
import { DEFAULT_FINANCIAL_SETTINGS } from '@/types'
import type { SavingsGoal, Commitment, Expense, FinancialSettings } from '@/types'

type Tab = 'goals' | 'scenarios'

const GRAB_GROSS_SCENARIOS = [0, 1000, 1500, 2000, 2500]

function GoalsPanel({ currency }: { currency: string }) {
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
    <div className="space-y-4">
      <div className="flex justify-end">
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

function ScenariosPanel({ currency }: { currency: string }) {
  const commitments = useCollection<Commitment>('commitments', 'createdAt')
  const expenses = useCollection<Expense>('expenses', 'date')
  const settings = useSettingsDoc<FinancialSettings>('financial', DEFAULT_FINANCIAL_SETTINGS)
  const { push } = useToast()
  const [savingFuture, setSavingFuture] = useState(false)
  const [futureForm, setFutureForm] = useState(settings.data.futureScenario)
  useEffect(() => setFutureForm(settings.data.futureScenario), [settings.data.futureScenario])

  const fixedCommitments = useMemo(() => commitments.data.reduce((s, c) => s + c.amount, 0), [commitments.data])
  const thisMonth = monthKey(new Date().toISOString())
  const variableExpenses = useMemo(
    () => expenses.data.filter((e) => monthKey(e.date) === thisMonth).reduce((s, e) => s + e.amount, 0),
    [expenses.data, thisMonth]
  )

  const scenarios = useMemo(() => {
    const salary = settings.data.monthlySalary
    const reservePct = settings.data.maintenanceReservePercent / 100
    return GRAB_GROSS_SCENARIOS.map((grossAssumption) => {
      const grabNet = grossAssumption * (1 - reservePct)
      const monthlySavings = salary - fixedCommitments - variableExpenses + grabNet
      return {
        label: grossAssumption === 0 ? 'No Grab' : `RM${grossAssumption} Grab`,
        monthlySavings,
        annualSavings: monthlySavings * 12,
        threeYearSavings: monthlySavings * 36,
      }
    })
  }, [settings.data, fixedCommitments, variableExpenses])

  async function handleSaveFuture(e: React.FormEvent) {
    e.preventDefault()
    setSavingFuture(true)
    try {
      await settings.save({ futureScenario: futureForm })
      push('Future scenario updated.', 'success')
    } catch (err: any) {
      push(err?.message ?? 'Could not save.', 'error')
    } finally {
      setSavingFuture(false)
    }
  }

  const futureNet = futureForm.rentalIncome - futureForm.newRentPaid - futureForm.securityFee

  if (commitments.loading || expenses.loading || settings.loading) return <LoadingState />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Savings scenarios</h2>
        <p className="mb-4 text-xs text-slate-500">
          Assumes your current salary and commitments, with different levels of Grab gross earnings and your
          configured maintenance reserve %. Nothing here is guaranteed.
        </p>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="px-4 py-3 font-semibold text-slate-500">Scenario</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Monthly savings</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">Annual</th>
                  <th className="px-4 py-3 font-semibold text-slate-500">3-year</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.label} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{s.label}</td>
                    <td className={classNames('px-4 py-3 font-semibold', s.monthlySavings >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {formatCurrency(s.monthlySavings, currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(s.annualSavings, currency)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(s.threeYearSavings, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card mt-4 p-5">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scenarios}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
              <Bar dataKey="monthlySavings" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Monthly savings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card border-amber-100 bg-amber-50/40 p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <Home className="h-4 w-4" /> Future Scenario — house rental
          </h2>
          <label className="flex items-center gap-2 text-xs font-medium text-amber-800">
            <input
              type="checkbox"
              checked={futureForm.enabled}
              onChange={(e) => setFutureForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-amber-300"
            />
            {futureForm.enabled ? 'ON' : 'OFF'}
          </label>
        </div>
        <p className="mb-4 text-xs text-amber-800/80">
          This is a hypothetical plan and is never mixed into your live Dashboard numbers, even when switched on.
        </p>
        <form onSubmit={handleSaveFuture} className="space-y-4">
          <FieldRow>
            <CurrencyInput label="Rental income (renting out current house)" value={futureForm.rentalIncome} onChange={(v) => setFutureForm((f) => ({ ...f, rentalIncome: v }))} currency={currency} />
            <CurrencyInput label="New rent paid (your own place)" value={futureForm.newRentPaid} onChange={(v) => setFutureForm((f) => ({ ...f, newRentPaid: v }))} currency={currency} />
          </FieldRow>
          <CurrencyInput label="Security fee" value={futureForm.securityFee} onChange={(v) => setFutureForm((f) => ({ ...f, securityFee: v }))} currency={currency} />
          {futureForm.enabled && (
            <div className="rounded-lg bg-white/60 p-3 text-sm">
              Net monthly effect: <span className={classNames('font-semibold', futureNet >= 0 ? 'text-emerald-700' : 'text-red-700')}>{formatCurrency(futureNet, currency)}</span>
            </div>
          )}
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={savingFuture} className="btn-secondary">
              {savingFuture ? 'Saving…' : 'Save scenario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Savings() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const [tab, setTab] = useState<Tab>('goals')

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5 text-brand-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Savings</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Goals, what-if scenarios, and a future rental plan.</p>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {([
          ['goals', 'Goals'],
          ['scenarios', 'Scenarios'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={classNames(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'goals' ? <GoalsPanel currency={currency} /> : <ScenariosPanel currency={currency} />}
    </div>
  )
}
