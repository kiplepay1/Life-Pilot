import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Car, Landmark, TrendingUp, TrendingDown } from 'lucide-react'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import { useSettingsDoc } from '@/services/useSettingsDoc'
import ChartCard from '@/components/ChartCard'
import { LoadingState } from '@/components/States'
import { formatCurrency, classNames } from '@/utils/format'
import { monthKey, aggregateSessions, thisMonthSessions } from '@/utils/grab'
import { computeTargetProgress } from '@/utils/grab'
import { DEFAULT_FINANCIAL_SETTINGS } from '@/types'
import type { Expense, Commitment, GrabSession, Asset, Liability, FinancialSettings } from '@/types'

export default function Dashboard() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'

  const expenses = useCollection<Expense>('expenses', 'date')
  const commitments = useCollection<Commitment>('commitments', 'createdAt')
  const grabSessions = useCollection<GrabSession>('grabSessions', 'date')
  const assets = useCollection<Asset>('assets', 'createdAt')
  const liabilities = useCollection<Liability>('liabilities', 'createdAt')
  const settings = useSettingsDoc<FinancialSettings>('financial', DEFAULT_FINANCIAL_SETTINGS)

  const loading = expenses.loading || commitments.loading || grabSessions.loading || assets.loading || liabilities.loading || settings.loading

  const thisMonth = monthKey(new Date().toISOString())
  const salary = settings.data.monthlySalary

  const totalCommitments = useMemo(() => commitments.data.reduce((s, c) => s + c.amount, 0), [commitments.data])
  const paidCount = useMemo(() => commitments.data.filter((c) => c.lastPaidMonth === thisMonth).length, [commitments.data, thisMonth])
  const commitmentProgress = commitments.data.length > 0 ? (paidCount / commitments.data.length) * 100 : 0

  const variableExpenses = useMemo(
    () => expenses.data.filter((e) => monthKey(e.date) === thisMonth).reduce((s, e) => s + e.amount, 0),
    [expenses.data, thisMonth]
  )

  const monthGrabSessions = useMemo(() => thisMonthSessions(grabSessions.data), [grabSessions.data])
  const grabAgg = useMemo(() => aggregateSessions(monthGrabSessions), [monthGrabSessions])
  const grabProgress = useMemo(() => computeTargetProgress(grabSessions.data, settings.data), [grabSessions.data, settings.data])

  const totalAssets = useMemo(() => assets.data.reduce((s, a) => s + a.currentValue, 0), [assets.data])
  const totalLiabilities = useMemo(() => liabilities.data.reduce((s, l) => s + l.currentBalance, 0), [liabilities.data])
  const netWorth = totalAssets - totalLiabilities

  const totalIncome = salary + grabAgg.totalNet
  const balance = totalIncome - totalCommitments - variableExpenses

  // ── 6-month net balance trend (simple, fixed period — matches the
  // "6-MONTH NET TREND" style of the reference app) ─────────────────
  const trend = useMemo(() => {
    const now = new Date()
    const months: { key: string; label: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: monthKey(d.toISOString()), label: d.toLocaleDateString('en-MY', { month: 'short' }) })
    }
    return months.map(({ key, label }) => {
      const monthVar = expenses.data.filter((e) => monthKey(e.date) === key).reduce((s, e) => s + e.amount, 0)
      const monthGrab = aggregateSessions(grabSessions.data.filter((s) => monthKey(s.date) === key)).totalNet
      // Commitments total is treated as constant (current total) across
      // past months, since individual commitment amounts aren't
      // historically tracked — see README "Known limitations".
      const net = salary + monthGrab - totalCommitments - monthVar
      return { month: label, net: Math.round(net) }
    })
  }, [expenses.data, grabSessions.data, salary, totalCommitments])

  if (loading) return <LoadingState label="Loading your dashboard…" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {profile?.fullName?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Your monthly balance, at a glance.</p>
      </div>

      {/* Monthly Balance — the one number that matters most */}
      <div className="card overflow-hidden bg-gradient-to-br from-emerald-600 to-brand-700 p-6 text-white">
        <p className="text-sm font-medium text-emerald-50">Monthly Balance</p>
        <p className="mt-1 text-4xl font-bold">{formatCurrency(balance, currency)}</p>
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/20 pt-4 text-center">
          <div>
            <p className="text-xs text-emerald-100">Income</p>
            <p className="font-semibold">{formatCurrency(totalIncome, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-100">Commitments</p>
            <p className="font-semibold">{formatCurrency(totalCommitments, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-emerald-100">Expenses</p>
            <p className="font-semibold">{formatCurrency(variableExpenses, currency)}</p>
          </div>
        </div>
      </div>

      {/* Commitment status */}
      <Link to="/commitments" className="card block p-5 transition-shadow hover:shadow-card-hover">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-slate-900">Commitment Status</h3>
          </div>
          <span className="text-sm font-semibold text-brand-700">{paidCount}/{commitments.data.length}</span>
        </div>
        <div className="mt-3 h-2.5 w-full rounded-full bg-slate-100">
          <div className="h-2.5 rounded-full bg-brand-600 transition-all" style={{ width: `${commitmentProgress}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-400">{commitmentProgress.toFixed(0)}% paid this month — tap to manage</p>
      </Link>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Grab snapshot */}
        <Link to="/grab" className="card block p-5 transition-shadow hover:shadow-card-hover">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-slate-900">Grab This Month</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(grabProgress.actualGross, currency)}</p>
          <p className="text-xs text-slate-400">of {formatCurrency(grabProgress.target, currency)} target ({grabProgress.progressPercent.toFixed(0)}%)</p>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${grabProgress.progressPercent}%` }} />
          </div>
        </Link>

        {/* Net worth snapshot */}
        <Link to="/assets" className="card block p-5 transition-shadow hover:shadow-card-hover">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-slate-900">Net Worth</h3>
          </div>
          <p className={classNames('mt-2 text-2xl font-bold', netWorth >= 0 ? 'text-emerald-700' : 'text-red-600')}>
            {formatCurrency(netWorth, currency)}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Assets {formatCurrency(totalAssets, currency)}</span>
            <span className="flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Liabilities {formatCurrency(totalLiabilities, currency)}</span>
          </div>
        </Link>
      </div>

      <ChartCard title="6-Month Net Trend" subtitle="Salary + Grab net − Commitments − Expenses">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
            <Bar dataKey="net" radius={[4, 4, 0, 0]} name="Net balance">
              {trend.map((t, i) => (
                <Cell key={i} fill={t.net >= 0 ? '#22c55e' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
