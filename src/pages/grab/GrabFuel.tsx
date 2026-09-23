import { useState, useMemo } from 'react'
import { Plus, Trash2, Fuel as FuelIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import { useSettingsDoc } from '@/services/useSettingsDoc'
import GrabSubNav from '@/components/GrabSubNav'
import DataTable, { Column } from '@/components/DataTable'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import CurrencyInput from '@/components/CurrencyInput'
import { TextField, FieldRow } from '@/components/FormField'
import MetricCard from '@/components/MetricCard'
import { LoadingState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { formatCurrency, formatDate } from '@/utils/format'
import { monthKey, thisMonthSessions } from '@/utils/grab'
import { DEFAULT_FINANCIAL_SETTINGS } from '@/types'
import type { GrabSession, FuelLog, FinancialSettings } from '@/types'

export default function GrabFuel() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const sessions = useCollection<GrabSession>('grabSessions', 'date')
  const fuelLogs = useCollection<FuelLog>('fuelLogs', 'date')
  const settings = useSettingsDoc<FinancialSettings>('financial', DEFAULT_FINANCIAL_SETTINGS)
  const { push } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), amount: 0, source: 'Shell', notes: '' })

  const monthSessions = useMemo(() => thisMonthSessions(sessions.data), [sessions.data])
  const thisMonthFuelLogs = useMemo(() => {
    const thisMonth = monthKey(new Date().toISOString())
    return fuelLogs.data.filter((f) => monthKey(f.date) === thisMonth)
  }, [fuelLogs.data])

  const sessionFuel = monthSessions.reduce((s, x) => s + x.fuel, 0)
  const extraFuel = thisMonthFuelLogs.reduce((s, x) => s + x.amount, 0)
  const totalUsed = sessionFuel + extraFuel
  const allowance = settings.data.shellFuelAllowance
  const remaining = allowance - totalUsed
  const usedPercent = allowance > 0 ? Math.min(100, (totalUsed / allowance) * 100) : 0

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    try {
      await fuelLogs.add(form)
      push('Fuel log added.', 'success')
      setModalOpen(false)
      setForm({ date: new Date().toISOString().slice(0, 10), amount: 0, source: 'Shell', notes: '' })
    } catch (err: any) {
      push(err?.message ?? 'Could not add fuel log.', 'error')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await fuelLogs.remove(deleteTarget)
    push('Fuel log deleted.', 'success')
    setDeleteTarget(null)
  }

  const columns: Column<FuelLog>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'source', header: 'Source', render: (r) => r.source },
    { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount, currency) },
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

  if (sessions.loading || fuelLogs.loading || settings.loading) return <LoadingState />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FuelIcon className="h-5 w-5 text-brand-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fuel Wallet</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Your Shell fuel benefit is not salary — tracked separately.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Log extra fuel
        </button>
      </div>

      <GrabSubNav />

      <div className="card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Monthly allowance</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(allowance, currency)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Used</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalUsed, currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-500">Remaining</p>
            <p className={`text-2xl font-bold ${remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(remaining, currency)}</p>
          </div>
        </div>
        <div className="mt-4 h-3 w-full rounded-full bg-slate-100">
          <div className={`h-3 rounded-full transition-all ${usedPercent >= 100 ? 'bg-red-500' : 'bg-brand-600'}`} style={{ width: `${usedPercent}%` }} />
        </div>
        {remaining < 0 && (
          <p className="mt-3 text-xs text-red-600">Allowance exhausted — extra fuel spending is being tracked as its own cost below.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard label="Fuel from Grab sessions" value={formatCurrency(sessionFuel, currency)} icon={FuelIcon} accent="brand" />
        <MetricCard label="Extra fuel logged" value={formatCurrency(extraFuel, currency)} icon={FuelIcon} accent="amber" />
      </div>

      <DataTable columns={columns} rows={thisMonthFuelLogs} rowKey={(r) => r.id} emptyMessage="No extra fuel logged this month." />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log extra fuel">
        <form onSubmit={handleAdd} className="space-y-4">
          <FieldRow>
            <TextField label="Date" type="date" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} required />
            <CurrencyInput label="Amount" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} currency={currency} required />
          </FieldRow>
          <TextField label="Source" value={form.source} onChange={(v) => setForm((f) => ({ ...f, source: v }))} placeholder="e.g. Shell, Petronas, Cash" />
          <TextField label="Notes (optional)" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete fuel log"
        message="Delete this fuel log entry?"
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
