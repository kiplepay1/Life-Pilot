import { useMemo } from 'react'
import { TrendingUp, Car, ShieldAlert, Sparkles, DollarSign, Clock, MapPin } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import { LoadingState } from '@/components/States'
import { formatCurrency } from '@/utils/format'
import { aggregateSessions, thisMonthSessions, monthKey } from '@/utils/grab'
import type { GrabSession, Expense, Commitment } from '@/types'

export default function SummaryInsights() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'

  const grabSessions = useCollection<GrabSession>('grabSessions', 'date')
  const expenses = useCollection<Expense>('expenses', 'date')
  const commitments = useCollection<Commitment>('commitments', 'createdAt')

  const loading = grabSessions.loading || expenses.loading || commitments.loading

  const stats = useMemo(() => {
    const currentMonth = monthKey(new Date().toISOString())
    const monthSessions = thisMonthSessions(grabSessions.data)
    const aggregated = aggregateSessions(monthSessions)

    const totalExpense = expenses.data
      .filter((e) => monthKey(e.date) === currentMonth)
      .reduce((sum, e) => sum + e.amount, 0)

    const totalCommitments = commitments.data.reduce((sum, c) => sum + c.amount, 0)

    return {
      grossEarnings: aggregated.grossEarnings,
      netEarnings: aggregated.netEarnings,
      totalHours: aggregated.totalHours,
      avgHourly: aggregated.avgHourly,
      totalKm: aggregated.totalKm,
      totalExpense,
      totalCommitments,
      netCashFlow: aggregated.netEarnings - totalExpense - totalCommitments,
    }
  }, [grabSessions.data, expenses.data, commitments.data])

  if (loading) {
    return <LoadingState message="Analyzing your financial pulse..." />
  }

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/25 px-3 py-1 text-xs font-semibold backdrop-blur-md mb-3 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" /> Smart Financial Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Summary & Insights</h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-xl">
              Combined real-time analysis of your Grab sessions, operating costs, and monthly commitments.
            </p>
          </div>
        </div>
      </div>

      {/* Core Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Net Cash Flow</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{formatCurrency(stats.netCashFlow, currency)}</div>
          <div className="text-emerald-400 text-xs mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="h-3.5 w-3.5" /> After expenses & commitments
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Grab Hourly Yield</span>
            <Clock className="h-4 w-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{formatCurrency(stats.avgHourly, currency)} / hr</div>
          <div className="text-teal-400 text-xs mt-1 flex items-center gap-1 font-medium">
            Based on {stats.totalHours.toFixed(1)} hrs driven
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Distance</span>
            <MapPin className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{stats.totalKm.toFixed(0)} KM</div>
          <div className="text-slate-400 text-xs mt-1 font-medium">
            Gross: {formatCurrency(stats.grossEarnings, currency)}
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Commitments Due</span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{formatCurrency(stats.totalCommitments, currency)}</div>
          <div className="text-amber-400 text-xs mt-1 font-medium">
            Monthly fixed obligations
          </div>
        </div>
      </div>

      {/* Smart Recommendations Section */}
      <div className="rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 sm:p-8 shadow-lg space-y-5">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-400" /> Automated Driving & Financial Suggestions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-5 text-emerald-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-emerald-100">
              <TrendingUp className="h-4 w-4 text-emerald-400" /> Peak Yield Optimization
            </div>
            <p className="text-xs sm:text-sm leading-relaxed">
              Your highest-yielding sessions typically happen when maintaining consistent hourly windows. Focus your driving during high demand surge hours to maximize your RM/hr ratio.
            </p>
          </div>

          <div className="rounded-2xl bg-cyan-500/10 border border-cyan-500/20 p-5 text-cyan-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-cyan-100">
              <Car className="h-4 w-4 text-cyan-400" /> Distance Efficiency Watch
            </div>
            <p className="text-xs sm:text-sm leading-relaxed">
              Monitor your distance-to-earnings ratio. High-mileage low-fare sessions increase fuel burn and vehicle maintenance wear. Prioritize shorter trip clusters when possible.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
