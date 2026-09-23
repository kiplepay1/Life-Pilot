import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import GrabSubNav from '@/components/GrabSubNav'
import CurrencyInput from '@/components/CurrencyInput'
import { TextField, FieldRow } from '@/components/FormField'
import { useToast } from '@/components/Toast'
import { dayTypeFromDate, computeSessionMetrics } from '@/utils/grab'
import { formatCurrency } from '@/utils/format'
import type { GrabSession } from '@/types'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function hoursBetween(start: string, end: string): number {
  if (!start || !end) return 0
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0
  let minutes = eh * 60 + em - (sh * 60 + sm)
  if (minutes < 0) minutes += 24 * 60 // overnight session
  return Math.round((minutes / 60) * 100) / 100
}

export default function GrabSessionForm() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const sessions = useCollection<GrabSession>('grabSessions', 'date')
  const { push } = useToast()
  const navigate = useNavigate()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    date: todayIso(),
    startTime: '08:00',
    endTime: '16:00',
    trips: 0,
    totalKm: 0,
    grossEarnings: 0,
    tips: 0,
    bonus: 0,
    fuel: 0,
    toll: 0,
    parking: 0,
    otherExpenses: 0,
    drivingHours: 0,
    notes: '',
  })

  const onlineHours = useMemo(() => hoursBetween(form.startTime, form.endTime), [form.startTime, form.endTime])
  const preview = useMemo(
    () =>
      computeSessionMetrics({
        grossEarnings: form.grossEarnings,
        tips: form.tips,
        bonus: form.bonus,
        fuel: form.fuel,
        toll: form.toll,
        parking: form.parking,
        otherExpenses: form.otherExpenses,
        onlineHours,
        totalKm: form.totalKm,
        trips: form.trips,
      }),
    [form, onlineHours]
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await sessions.add({
        date: form.date,
        dayType: dayTypeFromDate(form.date),
        startTime: form.startTime,
        endTime: form.endTime,
        onlineHours,
        drivingHours: form.drivingHours || undefined,
        trips: form.trips,
        totalKm: form.totalKm,
        grossEarnings: form.grossEarnings,
        tips: form.tips,
        bonus: form.bonus,
        fuel: form.fuel,
        toll: form.toll,
        parking: form.parking,
        otherExpenses: form.otherExpenses,
        notes: form.notes || undefined,
      })
      push('Session saved.', 'success')
      navigate('/grab/history')
    } catch (err: any) {
      push(err?.message ?? 'Could not save session.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-brand-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Grab Session</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Log a session in under 30 seconds — fuel, tolls and notes are optional.</p>
      </div>

      <GrabSubNav />

      <form onSubmit={handleSubmit} className="card space-y-4 p-5">
        <TextField label="Date" type="date" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} required />
        <FieldRow>
          <TextField label="Start" type="time" value={form.startTime} onChange={(v) => setForm((f) => ({ ...f, startTime: v }))} required />
          <TextField label="End" type="time" value={form.endTime} onChange={(v) => setForm((f) => ({ ...f, endTime: v }))} required />
        </FieldRow>
        <p className="-mt-2 text-xs text-slate-400">
          Online hours: <span className="font-medium text-slate-600">{onlineHours.toFixed(2)}h</span> · {dayTypeFromDate(form.date)}
        </p>

        <FieldRow>
          <TextField label="Trips" type="number" value={String(form.trips)} onChange={(v) => setForm((f) => ({ ...f, trips: parseInt(v) || 0 }))} required />
          <TextField label="Total KM" type="number" value={String(form.totalKm)} onChange={(v) => setForm((f) => ({ ...f, totalKm: parseFloat(v) || 0 }))} required />
        </FieldRow>
        <CurrencyInput label="Gross earnings" value={form.grossEarnings} onChange={(v) => setForm((f) => ({ ...f, grossEarnings: v }))} currency={currency} required />

        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-dashed border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 hover:border-slate-300"
        >
          Advanced (fuel, toll, parking, bonus, notes)
          {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {showAdvanced && (
          <div className="space-y-4 rounded-lg bg-slate-50 p-3">
            <FieldRow>
              <CurrencyInput label="Fuel" value={form.fuel} onChange={(v) => setForm((f) => ({ ...f, fuel: v }))} currency={currency} />
              <CurrencyInput label="Toll" value={form.toll} onChange={(v) => setForm((f) => ({ ...f, toll: v }))} currency={currency} />
            </FieldRow>
            <FieldRow>
              <CurrencyInput label="Parking" value={form.parking} onChange={(v) => setForm((f) => ({ ...f, parking: v }))} currency={currency} />
              <CurrencyInput label="Tips" value={form.tips} onChange={(v) => setForm((f) => ({ ...f, tips: v }))} currency={currency} />
            </FieldRow>
            <FieldRow>
              <CurrencyInput label="Bonus/incentive" value={form.bonus} onChange={(v) => setForm((f) => ({ ...f, bonus: v }))} currency={currency} />
              <CurrencyInput label="Other expenses" value={form.otherExpenses} onChange={(v) => setForm((f) => ({ ...f, otherExpenses: v }))} currency={currency} />
            </FieldRow>
            <TextField label="Driving hours (optional)" type="number" value={String(form.drivingHours)} onChange={(v) => setForm((f) => ({ ...f, drivingHours: parseFloat(v) || 0 }))} />
            <TextField label="Notes" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-center text-xs">
          <div>
            <p className="text-slate-400">Net income</p>
            <p className="font-semibold text-slate-800">{formatCurrency(preview.netIncome, currency)}</p>
          </div>
          <div>
            <p className="text-slate-400">RM/hour</p>
            <p className="font-semibold text-slate-800">{formatCurrency(preview.rmPerHour, currency)}</p>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving…' : 'Save session'}
        </button>
      </form>
    </div>
  )
}
