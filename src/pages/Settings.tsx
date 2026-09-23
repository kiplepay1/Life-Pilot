import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, ShieldCheck, KeyRound, Wallet } from 'lucide-react'
import { doc, updateDoc } from 'firebase/firestore'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth, db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useSettingsDoc } from '@/services/useSettingsDoc'
import { TextField, SelectField, FieldRow } from '@/components/FormField'
import CurrencyInput from '@/components/CurrencyInput'
import { useToast } from '@/components/Toast'
import { DEFAULT_FINANCIAL_SETTINGS } from '@/types'
import type { FinancialSettings } from '@/types'

const CURRENCIES = ['MYR', 'USD', 'SGD', 'EUR', 'GBP']

export default function Settings() {
  const { profile, firebaseUser, refreshProfile, logout } = useAuth()
  const { push } = useToast()
  const [form, setForm] = useState({
    fullName: profile?.fullName ?? '',
    phone: profile?.phone ?? '',
    country: profile?.country ?? '',
    currency: profile?.currency ?? 'MYR',
  })
  const [saving, setSaving] = useState(false)

  const financial = useSettingsDoc<FinancialSettings>('financial', DEFAULT_FINANCIAL_SETTINGS)
  const [financialForm, setFinancialForm] = useState(financial.data)
  const [savingFinancial, setSavingFinancial] = useState(false)
  useEffect(() => setFinancialForm(financial.data), [financial.data])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!firebaseUser) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), form)
      await refreshProfile()
      push('Profile updated.', 'success')
    } catch (err: any) {
      push(err?.message ?? 'Could not update profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveFinancial(e: React.FormEvent) {
    e.preventDefault()
    setSavingFinancial(true)
    try {
      await financial.save(financialForm)
      push('Financial settings updated.', 'success')
    } catch (err: any) {
      push(err?.message ?? 'Could not save financial settings.', 'error')
    } finally {
      setSavingFinancial(false)
    }
  }

  async function handlePasswordReset() {
    if (!profile?.email) return
    try {
      await sendPasswordResetEmail(auth, profile.email)
      push('Password reset email sent.', 'success')
    } catch (err: any) {
      push(err?.message ?? 'Could not send reset email.', 'error')
    }
  }

  const currency = profile?.currency ?? 'MYR'

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-brand-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Manage your profile, financial defaults, and account security.</p>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <TextField label="Full name" value={form.fullName} onChange={(v) => setForm((f) => ({ ...f, fullName: v }))} required />
          <TextField label="Email" value={profile?.email ?? ''} onChange={() => undefined} type="email" />
          <FieldRow>
            <TextField label="Phone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="+60 12-345 6789" />
            <TextField label="Country" value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v }))} placeholder="Malaysia" />
          </FieldRow>
          <SelectField label="Currency" value={form.currency} onChange={(v) => setForm((f) => ({ ...f, currency: v }))} options={CURRENCIES} />
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Wallet className="h-4 w-4" /> Financial Settings
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          Drives your Dashboard's Salary and Fixed Commitments figures, and the Fuel Wallet allowance. Nothing here
          is hardcoded — these are your own configurable defaults.
        </p>
        <form onSubmit={handleSaveFinancial} className="space-y-4">
          <FieldRow>
            <CurrencyInput
              label="Monthly salary"
              value={financialForm.monthlySalary}
              onChange={(v) => setFinancialForm((f) => ({ ...f, monthlySalary: v }))}
              currency={currency}
            />
            <CurrencyInput
              label="Shell fuel allowance / month"
              value={financialForm.shellFuelAllowance}
              onChange={(v) => setFinancialForm((f) => ({ ...f, shellFuelAllowance: v }))}
              currency={currency}
            />
          </FieldRow>
          <p className="text-xs text-slate-400">
            Grab target, planned sessions, and maintenance reserve are configured on the Grab Targets page.
          </p>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={savingFinancial} className="btn-primary">
              {savingFinancial ? 'Saving…' : 'Save financial settings'}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <KeyRound className="h-4 w-4" /> Security
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          We'll email you a secure link to set a new password.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={handlePasswordReset} className="btn-secondary">
            Send password reset email
          </button>
          <button onClick={logout} className="btn-secondary">
            Log out
          </button>
        </div>
      </div>

      <div className="card border-emerald-100 bg-emerald-50/50 p-6">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <ShieldCheck className="h-4 w-4" /> Privacy
        </h2>
        <p className="text-sm text-emerald-800/80">
          Your personal data — money, bills, subscriptions, savings, Grab sessions, assets, liabilities, financial
          settings, tasks, vehicles, documents and AI conversations — is private and belongs to you. Administrators
          can approve, suspend or reactivate your account, but they cannot see any of your personal records. This is
          enforced at the database level, not just hidden in the interface.
        </p>
      </div>
    </div>
  )
}
