import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, ChevronDown, ChevronUp, ScanLine, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import GrabSubNav from '@/components/GrabSubNav'
import CurrencyInput from '@/components/CurrencyInput'
import { TextField, FieldRow } from '@/components/FormField'
import { useToast } from '@/components/Toast'
import { dayTypeFromDate, computeSessionMetrics } from '@/utils/grab'
import { formatCurrency, formatDate } from '@/utils/format'
import { recognizeImageText } from '@/utils/ocr'
import { parseGrabScreenshot } from '@/utils/grabScreenshotParser'
import type { ScreenshotParseResult, ScannedDaySession } from '@/utils/grabScreenshotParser'
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScreenshotParseResult | null>(null)

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

  async function handleScanFile(file: File) {
    setScanning(true)
    setScanResult(null)
    try {
      const text = await recognizeImageText(file)
      const result = parseGrabScreenshot(text)
      setScanResult(result)
      if (result.type === 'unrecognized') {
        push("Couldn't read that screenshot clearly — try a clearer photo, or fill in the details manually below.", 'info')
      }
    } catch (err: any) {
      push('Scan failed — you can still fill in the details manually below.', 'error')
      setScanResult({ type: 'unrecognized' })
    } finally {
      setScanning(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function applyDaySession(day: ScannedDaySession) {
    setForm((f) => ({ ...f, date: day.date, trips: day.trips, grossEarnings: day.grossEarnings }))
    push('Filled in from the screenshot — review the numbers below before saving.', 'success')
  }

  function applyDailyDetail(detail: Extract<ScreenshotParseResult, { type: 'daily' }>['detail']) {
    setForm((f) => ({
      ...f,
      date: detail.date ?? f.date,
      trips: detail.trips ?? f.trips,
      grossEarnings: detail.grossEarnings ?? f.grossEarnings,
      bonus: detail.bonus ?? f.bonus,
    }))
    if (detail.tollsReimbursed) setShowAdvanced(true)
    push('Filled in from the screenshot — review the numbers below before saving.', 'success')
  }

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
        drivingHours: form.drivingHours,
        trips: form.trips,
        totalKm: form.totalKm,
        grossEarnings: form.grossEarnings,
        tips: form.tips,
        bonus: form.bonus,
        fuel: form.fuel,
        toll: form.toll,
        parking: form.parking,
        otherExpenses: form.otherExpenses,
        notes: form.notes,
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

      {/* Screenshot scanner — free, on-device OCR (Tesseract.js). The
          image never leaves your browser; nothing is uploaded. Always
          shown as a suggestion to review, never auto-saved. */}
      <div className="card space-y-3 p-5">
        <div className="flex items-center gap-2">
          <ScanLine className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold text-slate-900">Scan a Grab earnings screenshot</h2>
        </div>
        <p className="text-xs text-slate-500">
          Works with the weekly summary or the daily "Yesterday's Earnings" screen. Reads it right on your phone —
          nothing is uploaded anywhere. Always double-check the numbers before saving.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleScanFile(file)
          }}
          className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
        />

        {scanning && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading screenshot… (first scan takes a bit longer)
          </div>
        )}

        {scanResult?.type === 'weekly' && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Found {scanResult.days.length} day(s) — pick one to fill the form:</p>
            {scanResult.days.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => applyDaySession(d)}
                className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-xs hover:border-brand-300 hover:bg-brand-50/50"
              >
                <span className="text-slate-700">{d.label}</span>
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-slate-300" />
              </button>
            ))}
          </div>
        )}

        {scanResult?.type === 'daily' && (
          <div className="space-y-2 rounded-lg border border-slate-200 p-3">
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                <p className="text-slate-400">Date</p>
                <p className="font-medium text-slate-700">{scanResult.detail.date ? formatDate(scanResult.detail.date) : 'Not shown — keep current'}</p>
              </div>
              <div>
                <p className="text-slate-400">Trips</p>
                <p className="font-medium text-slate-700">{scanResult.detail.trips ?? '—'}</p>
              </div>
              <div>
                <p className="text-slate-400">Gross</p>
                <p className="font-medium text-slate-700">{scanResult.detail.grossEarnings !== null ? formatCurrency(scanResult.detail.grossEarnings, currency) : '—'}</p>
              </div>
              <div>
                <p className="text-slate-400">Bonus</p>
                <p className="font-medium text-slate-700">{scanResult.detail.bonus !== null ? formatCurrency(scanResult.detail.bonus, currency) : '—'}</p>
              </div>
            </div>
            {scanResult.detail.tollsReimbursed !== null && (
              <p className="text-xs text-amber-600">
                Tolls {formatCurrency(scanResult.detail.tollsReimbursed, currency)} shown as reimbursed by Grab — not added as a cost.
              </p>
            )}
            <button type="button" onClick={() => applyDailyDetail(scanResult.detail)} className="btn-secondary w-full !py-1.5 text-xs">
              Use these numbers
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-5">
        <TextField label="Date" type="date" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} required />
        <FieldRow>
          <TextField label="Start" type="time" value={form.startTime} onChange={(v) => setForm((f) => ({ ...f, startTime: v }))} required />
          <TextField label="End" type="time" value={form.endTime} onChange={(v) => setForm((f) => ({ ...f, endTime: v }))} required />
        </FieldRow>
        <p className="-mt-2 text-xs text-slate-400">
          Online hours: <span className="font-medium text-slate-600">{onlineHours.toFixed(2)}h</span> · {dayTypeFromDate(form.date)}
          {' · '}not read from screenshots — Grab doesn't show them, so set your actual start/end here.
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
