import { useMemo, useState } from 'react'
import { Wallet, Receipt, TrendingDown, Car, PiggyBank, Landmark, Sparkles, DollarSign } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import { useSettingsDoc } from '@/services/useSettingsDoc'
import MetricCard from '@/components/MetricCard'
import ChartCard from '@/components/ChartCard'
import { LoadingState } from '@/components/States'
import { formatCurrency, classNames, monthlyEquivalent } from '@/utils/format'
import { monthKey, aggregateSessions, thisMonthSessions } from '@/utils/grab'
import { DEFAULT_FINANCIAL_SETTINGS } from '@/types'
import type { Expense, Bill, SavingsGoal, GrabSession, Asset, Liability, FinancialSettings } from '@/types'



export default function Dashboard() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'

  const expenses = useCollection<Expense>('expenses', 'date')
  const bills = useCollection<Bill>('bills', 'dueDate')
  const savingsGoals = useCollection<SavingsGoal>('savings', 'targetDate')
  const grabSessions = useCollection<GrabSession>('grabSessions', 'date')
  const assets = useCollection<Asset>('assets', 'createdAt')
  const liabilities = useCollection<Liability>('liabilities', 'createdAt')
  const settings = useSettingsDoc<FinancialSettings>('financial', DEFAULT_FINANCIAL_SETTINGS)

  const [period, setPeriod] = useState<3 | 6 | 12>(6)
  const [trendMetric, setTrendMetric] = useState<'availableCash' | 'netWorth' | 'grabNet' | 'savings'>('availableCash')

  const loading = expenses.loading || bills.loading || savingsGoals.loading || grabSessions.loading || assets.loading || liabilities.loading || settings.loading

  const thisMonth = monthKey(new Date().toISOString())

  const fixedCommitments = useMemo(
    () => bills.data.reduce((s, b) => s + monthlyEquivalent(b.amount, b.frequency), 0),
    [bills.data]
  )
  const variableExpenses = useMemo(
    () => expenses.data.filter((e) => monthKey(e.date) === thisMonth).reduce((s, e) => s + e.amount, 0),
    [expenses.data, thisMonth]
  )
  const monthGrabSessions = useMemo(() => thisMonthSessions(grabSessions.data), [grabSessions.data])
  const grabAgg = useMemo(() => aggregateSessions(monthGrabSessions), [monthGrabSessions])
  const totalSavings = useMemo(() => savingsGoals.data.reduce((s, g) => s + g.currentAmount, 0), [savingsGoals.data])
  const totalAssets = useMemo(() => assets.data.reduce((s, a) => s + a.currentValue, 0), [assets.data])
  const totalLiabilities = useMemo(() => liabilities.data.reduce((s, l) => s + l.currentBalance, 0), [liabilities.data])
  const netWorth = totalAssets - totalLiabilities

  const salary = settings.data.monthlySalary
  const availableCash = salary - fixedCommitments - variableExpenses + grabAgg.totalNet

  // ── 6/3/12-month trend ──────────────────────────────────────────
  const months = useMemo(() => {
    const now = new Date()
    const list: { key: string; label: string }[] = []
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      list.push({ key: monthKey(d.toISOString()), label: d.toLocaleDateString('en-MY', { month: 'short' }) })
    }
    return list
  }, [period])

  const incomeExpenseTrend = useMemo(
    () =>
      months.map(({ key, label }) => {
        const monthBills = fixedCommitments // treated as constant recurring commitment across months for now
        const monthVar = expenses.data.filter((e) => monthKey(e.date) === key).reduce((s, e) => s + e.amount, 0)
        const monthGrabGross = grabSessions.data.filter((s) => monthKey(s.date) === key).reduce((s, x) => s + x.grossEarnings, 0)
        return {
          month: label,
          salary,
          expenses: monthBills + monthVar,
          grab: monthGrabGross,
        }
      }),
    [months, expenses.data, grabSessions.data, fixedCommitments, salary]
  )

  const metricTrend = useMemo(
    () =>
      months.map(({ key, label }) => {
        const monthVar = expenses.data.filter((e) => monthKey(e.date) === key).reduce((s, e) => s + e.amount, 0)
        const monthGrabSess = grabSessions.data.filter((s) => monthKey(s.date) === key)
        const monthGrabNet = aggregateSessions(monthGrabSess).totalNet
        const cash = salary - fixedCommitments - monthVar + monthGrabNet
        const values: Record<string, number> = {
          availableCash: cash,
          netWorth, // net worth is a point-in-time snapshot; shown flat across the period since we don't keep history
          grabNet: monthGrabNet,
          savings: totalSavings,
        }
        return { month: label, value: Math.round(values[trendMetric]) }
      }),
    [months, expenses.data, grabSessions.data, fixedCommitments, salary, netWorth, totalSavings, trendMetric]
  )

  const insight = useMemo(() => {
    if (salary === 0) return 'Set your monthly salary in Settings to unlock a full dashboard summary.'
    const cashNote = availableCash >= 0 ? `You have ${formatCurrency(availableCash, currency)} available this month.` : `You're ${formatCurrency(Math.abs(availableCash), currency)} short this month.`
    const grabNote = grabAgg.count > 0 ? ` Grab added ${formatCurrency(grabAgg.totalNet, currency)} net from ${grabAgg.count} session(s).` : ' No Grab sessions logged yet this month.'
    return cashNote + grabNote
  }, [salary, availableCash, grabAgg, currency])

  if (loading) return <LoadingState label="Loading your dashboard…" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {profile?.fullName?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Your finances and Grab driving, at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Monthly Salary" value={formatCurrency(salary, currency)} icon={Wallet} accent="green" />
        <MetricCard label="Fixed Commitments" value={formatCurrency(fixedCommitments, currency)} icon={Receipt} accent="red" />
        <MetricCard label="Variable Expenses" value={formatCurrency(variableExpenses, currency)} icon={TrendingDown} accent="amber" />
        <MetricCard label="Grab Net" value={formatCurrency(grabAgg.totalNet, currency)} icon={Car} accent="brand" />
        <MetricCard label="Grab Gross" value={formatCurrency(grabAgg.totalGross, currency)} icon={Car} accent="brand" />
        <MetricCard
          label="Available Cash"
          value={formatCurrency(availableCash, currency)}
          icon={DollarSign}
          accent={availableCash >= 0 ? 'green' : 'red'}
        />
        <MetricCard label="Savings" value={formatCurrency(totalSavings, currency)} icon={PiggyBank} accent="brand" />
        <MetricCard label="Net Worth" value={formatCurrency(netWorth, currency)} icon={Landmark} accent={netWorth >= 0 ? 'green' : 'red'} />
      </div>

      <div className="card flex items-start gap-3 border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5">
        <div className="rounded-xl bg-brand-600 p-2">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Monthly Insight</p>
          <p className="mt-1 text-sm text-slate-600">{insight}</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1">
        {([3, 6, 12] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={classNames(
              'rounded-full px-3 py-1 text-xs font-medium',
              period === p ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {p}mo
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Salary vs Expenses vs Grab" subtitle={`Last ${period} months`}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={incomeExpenseTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
              <Bar dataKey="salary" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Salary" />
              <Bar dataKey="expenses" fill="#fca5a5" radius={[4, 4, 0, 0]} name="Commitments + Expenses" />
              <Bar dataKey="grab" fill="#22c55e" radius={[4, 4, 0, 0]} name="Grab Gross" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Trend"
          subtitle={`Last ${period} months`}
          action={
            <select
              value={trendMetric}
              onChange={(e) => setTrendMetric(e.target.value as typeof trendMetric)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600"
            >
              <option value="availableCash">Available Cash</option>
              <option value="grabNet">Grab Net</option>
              <option value="savings">Savings</option>
              <option value="netWorth">Net Worth</option>
            </select>
          }
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={metricTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
              <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          {(trendMetric === 'netWorth' || trendMetric === 'savings') && (
            <p className="mt-2 text-center text-xs text-slate-400">
              Shown as a current snapshot across the period — historical net worth/savings tracking isn't kept yet.
            </p>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
