import { useState, useEffect } from 'react'
import { Target } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import { useSettingsDoc } from '@/services/useSettingsDoc'
import GrabSubNav from '@/components/GrabSubNav'
import CurrencyInput from '@/components/CurrencyInput'
import { TextField, FieldRow } from '@/components/FormField'
import { LoadingState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { formatCurrency } from '@/utils/format'
import { computeTargetProgress } from '@/utils/grab'
import { DEFAULT_FINANCIAL_SETTINGS } from '@/types'
import type { GrabSession, FinancialSettings } from '@/types'

export default function GrabTargets() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const sessions = useCollection<GrabSession>('grabSessions', 'date')
  const settings = useSettingsDoc<FinancialSettings>('financial', DEFAULT_FINANCIAL_SETTINGS)
  const { push } = useToast()
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState(settings.data)
  useEffect(() => setForm(settings.data), [settings.data])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await settings.save(form)
      push('Grab targets updated.', 'success')
    } catch (err: any) {
      push(err?.message ?? 'Could not save settings.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const progress = computeTargetProgress(sessions.data, form)
  const plannedSessionsTotal = form.plannedSaturdaysPerMonth + form.plannedSundaysPerMonth
  const plannedHoursTotal = plannedSessionsTotal * form.plannedHoursPerSession
  const requiredPerWeek = form.grabMonthlyTargetGross / 4.33
  const requiredPerSaturday = form.plannedSaturdaysPerMonth > 0 ? form.grabMonthlyTargetGross * (form.plannedSaturdaysPerMonth / plannedSessionsTotal) / form.plannedSaturdaysPerMonth : 0
  const requiredPerSunday = form.plannedSundaysPerMonth > 0 ? form.grabMonthlyTargetGross * (form.plannedSundaysPerMonth / plannedSessionsTotal) / form.plannedSundaysPerMonth : 0
  const requiredPerHour = plannedHoursTotal > 0 ? form.grabMonthlyTargetGross / plannedHoursTotal : 0

  if (settings.loading) return <LoadingState />

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-brand-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Grab Targets</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Configure your monthly Grab plan — nothing here is guaranteed income.</p>
      </div>

      <GrabSubNav />

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Monthly planner breakdown</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 text-center">
          <div>
            <p className="text-xs text-slate-400">Per month</p>
            <p className="font-semibold text-slate-800">{formatCurrency(form.grabMonthlyTargetGross, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Per week</p>
            <p className="font-semibold text-slate-800">{formatCurrency(requiredPerWeek, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Per Saturday</p>
            <p className="font-semibold text-slate-800">{formatCurrency(requiredPerSaturday, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Per Sunday</p>
            <p className="font-semibold text-slate-800">{formatCurrency(requiredPerSunday, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Per hour</p>
            <p className="font-semibold text-slate-800">{formatCurrency(requiredPerHour, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Remaining now</p>
            <p className="font-semibold text-amber-600">{formatCurrency(progress.remaining, currency)}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-slate-900">Settings</h2>
        <FieldRow>
          <CurrencyInput label="Monthly Grab target (gross)" value={form.grabMonthlyTargetGross} onChange={(v) => setForm((f) => ({ ...f, grabMonthlyTargetGross: v }))} currency={currency} />
          <CurrencyInput label="Target RM/hour" value={form.grabTargetRatePerHour} onChange={(v) => setForm((f) => ({ ...f, grabTargetRatePerHour: v }))} currency={currency} />
        </FieldRow>
        <FieldRow>
          <TextField label="Planned Saturdays/month" type="number" value={String(form.plannedSaturdaysPerMonth)} onChange={(v) => setForm((f) => ({ ...f, plannedSaturdaysPerMonth: parseInt(v) || 0 }))} />
          <TextField label="Planned Sundays/month" type="number" value={String(form.plannedSundaysPerMonth)} onChange={(v) => setForm((f) => ({ ...f, plannedSundaysPerMonth: parseInt(v) || 0 }))} />
        </FieldRow>
        <FieldRow>
          <TextField label="Planned hours/session" type="number" value={String(form.plannedHoursPerSession)} onChange={(v) => setForm((f) => ({ ...f, plannedHoursPerSession: parseFloat(v) || 0 }))} />
          <TextField label="Maintenance reserve %" type="number" value={String(form.maintenanceReservePercent)} onChange={(v) => setForm((f) => ({ ...f, maintenanceReservePercent: parseFloat(v) || 0 }))} />
        </FieldRow>
        <div className="flex justify-end pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save targets'}
          </button>
        </div>
      </form>
    </div>
  )
}
