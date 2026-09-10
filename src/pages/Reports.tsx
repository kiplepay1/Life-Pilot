import { useMemo } from 'react'
import { BarChart3, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import { LoadingState } from '@/components/States'
import { formatCurrency } from '@/utils/format'
import type { Income, Expense, Bill, SavingsGoal, FinancialHealthScore } from '@/types'

function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function computeHealthScore(
  income: Income[],
  expenses: Expense[],
  bills: Bill[],
  savings: SavingsGoal[]
): FinancialHealthScore {
  const thisMonth = monthKey(new Date().toISOString())
  const monthlyIncome = income.filter((i) => monthKey(i.date) === thisMonth).reduce((s, i) => s + i.amount, 0)
  const monthlyExpenses = expenses.filter((e) => monthKey(e.date) === thisMonth).reduce((s, e) => s + e.amount, 0)
  const savingsRate = monthlyIncome > 0 ? (monthlyIncome - monthlyExpenses) / monthlyIncome : 0
  const expenseRatio = monthlyIncome > 0 ? monthlyExpenses / monthlyIncome : 1
  const overdueBills = bills.filter((b) => b.status === 'overdue').length
  const totalSaved = savings.reduce((s, g) => s + g.currentAmount, 0)
  const totalTargets = savings.reduce((s, g) => s + g.targetAmount, 0)

  let score = 50
  score += Math.max(-25, Math.min(25, savingsRate * 100 * 0.6))
  score += Math.max(-15, Math.min(15, (1 - expenseRatio) * 20))
  score -= Math.min(20, overdueBills * 7)
  if (totalTargets > 0) score += Math.min(10, (totalSaved / totalTargets) * 10)
  score = Math.max(0, Math.min(100, Math.round(score)))

  const rating: FinancialHealthScore['rating'] = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor'

  const strengths: string[] = []
  const warnings: string[] = []
  const recommendations: string[] = []

  if (savingsRate >= 0.2) strengths.push(`Strong savings rate of ${(savingsRate * 100).toFixed(0)}%.`)
  else if (savingsRate > 0) recommendations.push('Aim to raise your savings rate toward 20% of income.')
  else if (monthlyIncome > 0) warnings.push('You are spending more than you earn this month.')

  if (overdueBills > 0) warnings.push(`${overdueBills} overdue bill${overdueBills > 1 ? 's' : ''} need attention.`)
  else strengths.push('No overdue bills — great payment consistency.')

  if (expenseRatio < 0.7 && monthlyIncome > 0) strengths.push('Healthy expense-to-income ratio.')
  else if (monthlyIncome > 0) recommendations.push('Review discretionary spending to lower your expense ratio.')

  if (totalTargets > 0 && totalSaved / totalTargets < 0.3) recommendations.push('Increase contributions toward your savings goals.')

  if (strengths.length === 0) strengths.push('Keep logging income and expenses to build a fuller picture.')
  if (recommendations.length === 0) recommendations.push('Keep up the good work — review this score monthly.')

  return { score, rating, strengths, warnings, recommendations }
}

const REPORT_TYPES = [
  'Monthly Financial Report',
  'Income vs Expenses',
  'Spending Analysis',
  'Savings Progress',
  'Bills & Commitments',
  'Subscription Analysis',
  'Vehicle Cost',
  'Document Expiry',
  'AI Monthly Review',
]

export default function Reports() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const income = useCollection<Income>('income', 'date')
  const expenses = useCollection<Expense>('expenses', 'date')
  const bills = useCollection<Bill>('bills', 'dueDate')
  const savings = useCollection<SavingsGoal>('savings', 'targetDate')

  const loading = income.loading || expenses.loading || bills.loading || savings.loading

  const health = useMemo(
    () => computeHealthScore(income.data, expenses.data, bills.data, savings.data),
    [income.data, expenses.data, bills.data, savings.data]
  )

  const ratingColor =
    health.rating === 'Excellent'
      ? 'text-emerald-600 bg-emerald-50'
      : health.rating === 'Good'
        ? 'text-brand-600 bg-brand-50'
        : health.rating === 'Fair'
          ? 'text-amber-600 bg-amber-50'
          : 'text-red-600 bg-red-50'

  if (loading) return <LoadingState label="Building your reports…" />

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Report Center</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Your financial health score and downloadable reports.</p>
      </div>

      <div className="card grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
        <div className="flex flex-col items-center justify-center md:col-span-1">
          <div className={`flex h-32 w-32 flex-col items-center justify-center rounded-full ${ratingColor}`}>
            <span className="text-4xl font-bold">{health.score}</span>
            <span className="text-xs font-medium">/ 100</span>
          </div>
          <p className={`mt-3 rounded-full px-3 py-1 text-xs font-semibold ${ratingColor}`}>{health.rating}</p>
          <p className="mt-1 text-xs text-slate-400">Financial Health Score</p>
        </div>
        <div className="space-y-4 md:col-span-2">
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" /> Strengths
            </p>
            <ul className="space-y-1 text-sm text-slate-600">
              {health.strengths.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
          {health.warnings.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-red-700">
                <AlertTriangle className="h-4 w-4" /> Warnings
              </p>
              <ul className="space-y-1 text-sm text-slate-600">
                {health.warnings.map((s, i) => <li key={i}>• {s}</li>)}
              </ul>
            </div>
          )}
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
              <TrendingUp className="h-4 w-4" /> Recommendations
            </p>
            <ul className="space-y-1 text-sm text-slate-600">
              {health.recommendations.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Available reports</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_TYPES.map((r) => (
            <div key={r} className="card flex items-center justify-between p-4">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-brand-50 p-2 text-brand-600">
                  <TrendingDown className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-slate-800">{r}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Reports summarize the data already in your account ({formatCurrency(
            expenses.data.reduce((s, e) => s + e.amount, 0),
            currency
          )}{' '}
          in total expenses logged). Full PDF export can be wired up via a Cloud Function that renders each report
          server-side.
        </p>
      </div>
    </div>
  )
}
