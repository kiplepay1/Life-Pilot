import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Car, Target, TrendingUp, Clock, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import { useSettingsDoc } from '@/services/useSettingsDoc'
import GrabSubNav from '@/components/GrabSubNav'
import MetricCard from '@/components/MetricCard'
import { LoadingState } from '@/components/States'
import { formatCurrency } from '@/utils/format'
import { computeTargetProgress, thisMonthSessions, aggregateSessions } from '@/utils/grab'
import { DEFAULT_FINANCIAL_SETTINGS } from '@/types'
import type { GrabSession, FinancialSettings } from '@/types'

export default function GrabHub() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const sessions = useCollection<GrabSession>('grabSessions', 'date')
  const settings = useSettingsDoc<FinancialSettings>('financial', DEFAULT_FINANCIAL_SETTINGS)

  const monthSessions = useMemo(() => thisMonthSessions(sessions.data), [sessions.data])
  const agg = useMemo(() => aggregateSessions(monthSessions), [monthSessions])
  const progress = useMemo(() => computeTargetProgress(sessions.data, settings.data), [sessions.data, settings.data])

  const loading = sessions.loading || settings.loading

  if (loading) return <LoadingState label="Loading Grab performance…" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-brand-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Grab Performance</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">This month's progress toward your Grab target.</p>
        </div>
        <Link to="/grab/session" className="btn-primary">
          <Plus className="h-4 w-4" /> New session
        </Link>
      </div>

      <GrabSubNav />

      <div className="card p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">Target</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(progress.target, currency)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Actual</p>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(progress.actualGross, currency)}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Remaining</p>
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(progress.remaining, currency)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-500">Progress</p>
            <p className="text-2xl font-bold text-brand-600">{progress.progressPercent.toFixed(0)}%</p>
          </div>
        </div>
        <div className="mt-4 h-3 w-full rounded-full bg-slate-100">
          <div className="h-3 rounded-full bg-brand-600 transition-all" style={{ width: `${progress.progressPercent}%` }} />
        </div>
        {progress.sessionsRemaining > 0 ? (
          <p className="mt-3 text-xs text-slate-500">
            {progress.sessionsRemaining} planned session(s) left this month — about{' '}
            <span className="font-semibold text-slate-700">{formatCurrency(progress.requiredPerRemainingSession, currency)}</span> needed per session to hit target.
          </p>
        ) : (
          <p className="mt-3 text-xs text-slate-500">No planned sessions left this month — check Targets to adjust your plan.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Sessions" value={String(agg.count)} icon={Car} accent="brand" />
        <MetricCard label="Total trips" value={String(agg.totalTrips)} icon={TrendingUp} accent="brand" />
        <MetricCard label="Total KM" value={agg.totalKm.toFixed(0)} icon={TrendingUp} accent="brand" />
        <MetricCard label="Online hours" value={agg.totalHours.toFixed(1)} icon={Clock} accent="brand" />
        <MetricCard label="Net income" value={formatCurrency(agg.totalNet, currency)} icon={Target} accent="green" />
        <MetricCard label="Avg RM/hour" value={formatCurrency(agg.avgRmPerHour, currency)} icon={Target} accent="green" />
      </div>

      {monthSessions.length === 0 && (
        <p className="text-center text-sm text-slate-400">
          No sessions logged this month yet.{' '}
          <Link to="/grab/session" className="font-medium text-brand-600 hover:text-brand-700">
            Log your first one
          </Link>
          .
        </p>
      )}
    </div>
  )
}
