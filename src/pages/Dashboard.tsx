import { useMemo } from 'react'
import { Wallet, TrendingDown, Receipt, PiggyBank, Repeat, ListChecks, Sparkles } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import MetricCard from '@/components/MetricCard'
import ChartCard from '@/components/ChartCard'
import { LoadingState } from '@/components/States'
import { formatCurrency, daysUntil } from '@/utils/format'
import { CHART_COLORS } from '@/constants'
import type { Income, Expense, Bill, Subscription, Task } from '@/types'

function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function Dashboard() {
  const { profile } = useAuth()
  const income = useCollection<Income>('income', 'date')
  const expenses = useCollection<Expense>('expenses', 'date')
  const bills = useCollection<Bill>('bills', 'dueDate')
  const subscriptions = useCollection<Subscription>('subscriptions', 'nextBillingDate')
  const tasks = useCollection<Task>('tasks', 'dueDate')

  const loading = income.loading || expenses.loading || bills.loading || subscriptions.loading || tasks.loading

  const currency = profile?.currency ?? 'MYR'
  const thisMonth = monthKey(new Date().toISOString())

  const monthlyIncome = useMemo(
    () => income.data.filter((i) => monthKey(i.date) === thisMonth).reduce((s, i) => s + i.amount, 0),
    [income.data, thisMonth]
  )
  const monthlyExpenses = useMemo(
    () => expenses.data.filter((e) => monthKey(e.date) === thisMonth).reduce((s, e) => s + e.amount, 0),
    [expenses.data, thisMonth]
  )
  const billsDue = useMemo(() => bills.data.filter((b) => b.status !== 'paid').length, [bills.data])
  const totalSubscriptionCost = useMemo(
    () =>
      subscriptions.data.reduce((s, sub) => s + (sub.billingCycle === 'yearly' ? sub.amount / 12 : sub.amount), 0),
    [subscriptions.data]
  )
  const tasksDue = useMemo(
    () => tasks.data.filter((t) => t.status !== 'Completed' && (daysUntil(t.dueDate) ?? 999) <= 7).length,
    [tasks.data]
  )
  const savingsRate = monthlyIncome > 0 ? Math.max(0, ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100) : 0

  const last6MonthsTrend = useMemo(() => {
    const months: { key: string; label: string }[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: monthKey(d.toISOString()), label: d.toLocaleDateString('en-MY', { month: 'short' }) })
    }
    return months.map(({ key, label }) => ({
      month: label,
      income: income.data.filter((i) => monthKey(i.date) === key).reduce((s, i) => s + i.amount, 0),
      expenses: expenses.data.filter((e) => monthKey(e.date) === key).reduce((s, e) => s + e.amount, 0),
    }))
  }, [income.data, expenses.data])

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    expenses.data
      .filter((e) => monthKey(e.date) === thisMonth)
      .forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount))
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [expenses.data, thisMonth])

  const insight = useMemo(() => {
    if (monthlyIncome === 0 && monthlyExpenses === 0) {
      return "Add some income and expenses to unlock your first AI insight — I'll analyse your spending patterns automatically."
    }
    const rate = savingsRate.toFixed(0)
    const topCategory = [...categoryBreakdown].sort((a, b) => b.value - a.value)[0]
    const potential = Math.max(0, (monthlyIncome - monthlyExpenses) * 0.15)
    let msg = `Your savings rate this month is ${rate}%.`
    if (topCategory) msg += ` Your biggest expense category is ${topCategory.name} at ${formatCurrency(topCategory.value, currency)}.`
    if (potential > 10) msg += ` Based on current trends, you could potentially set aside an extra ${formatCurrency(potential, currency)} this month.`
    return msg
  }, [monthlyIncome, monthlyExpenses, savingsRate, categoryBreakdown, currency])

  if (loading) return <LoadingState label="Loading your dashboard…" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {profile?.fullName?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Here's your life at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Monthly Income" value={formatCurrency(monthlyIncome, currency)} icon={Wallet} accent="green" />
        <MetricCard label="Monthly Expenses" value={formatCurrency(monthlyExpenses, currency)} icon={TrendingDown} accent="red" />
        <MetricCard label="Bills Due" value={String(billsDue)} icon={Receipt} accent="amber" />
        <MetricCard
          label="Savings"
          value={`${savingsRate.toFixed(0)}%`}
          icon={PiggyBank}
          accent="brand"
          trend={{ value: 'of income saved', positive: savingsRate >= 15 }}
        />
        <MetricCard label="Subscriptions" value={formatCurrency(totalSubscriptionCost, currency) + '/mo'} icon={Repeat} accent="brand" />
        <MetricCard label="Tasks Due" value={String(tasksDue)} icon={ListChecks} accent="amber" />
      </div>

      <div className="card flex items-start gap-3 border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5">
        <div className="rounded-xl bg-brand-600 p-2">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">AI Monthly Insight</p>
          <p className="mt-1 text-sm text-slate-600">{insight}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Income vs Expenses" subtitle="Last 6 months">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={last6MonthsTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
              <Bar dataKey="income" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Income" />
              <Bar dataKey="expenses" fill="#c7d2fe" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Spending Trend" subtitle="Total expenses, last 6 months">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={last6MonthsTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
              <Line type="monotone" dataKey="expenses" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Expense Categories" subtitle="This month">
          {categoryBreakdown.length === 0 ? (
            <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
              No expenses logged this month yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                  {categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Savings Progress" subtitle="Current savings rate">
          <div className="flex h-[260px] flex-col items-center justify-center">
            <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-brand-50">
              <span className="text-3xl font-bold text-brand-700">{savingsRate.toFixed(0)}%</span>
            </div>
            <p className="mt-4 text-center text-xs text-slate-500">
              of your income saved this month.
              <br />Aim for 20% or higher.
            </p>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
