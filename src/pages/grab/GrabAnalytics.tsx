import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import GrabSubNav from '@/components/GrabSubNav'
import ChartCard from '@/components/ChartCard'
import { LoadingState, EmptyState } from '@/components/States'
import { formatCurrency, formatDate } from '@/utils/format'
import { aggregateSessions, computeSessionMetrics } from '@/utils/grab'
import type { GrabSession } from '@/types'

function DayCard({ title, sessions, currency }: { title: string; sessions: GrabSession[]; currency: string }) {
  const agg = aggregateSessions(sessions)
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-400">{agg.count} session(s)</p>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-400">Avg gross</p>
          <p className="font-semibold text-slate-800">{formatCurrency(agg.avgGross, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Avg net</p>
          <p className="font-semibold text-slate-800">{formatCurrency(agg.avgNet, currency)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Avg hours</p>
          <p className="font-semibold text-slate-800">{agg.avgHours.toFixed(1)}h</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Avg trips</p>
          <p className="font-semibold text-slate-800">{agg.avgTrips.toFixed(1)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Avg KM</p>
          <p className="font-semibold text-slate-800">{agg.avgKm.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Avg RM/hour</p>
          <p className="font-semibold text-brand-700">{formatCurrency(agg.avgRmPerHour, currency)}</p>
        </div>
      </div>
    </div>
  )
}

export default function GrabAnalytics() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const sessions = useCollection<GrabSession>('grabSessions', 'date')

  const saturday = useMemo(() => sessions.data.filter((s) => s.dayType === 'Saturday'), [sessions.data])
  const sunday = useMemo(() => sessions.data.filter((s) => s.dayType === 'Sunday'), [sessions.data])

  const trend = useMemo(
    () =>
      [...sessions.data]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((s) => ({ date: formatDate(s.date), rmPerHour: Math.round(computeSessionMetrics(s).rmPerHour) })),
    [sessions.data]
  )

  const satAvg = aggregateSessions(saturday).avgRmPerHour
  const sunAvg = aggregateSessions(sunday).avgRmPerHour
  const verdict =
    saturday.length === 0 || sunday.length === 0
      ? 'Log sessions on both days to compare.'
      : sunAvg >= satAvg
        ? `Based on your data, Sunday (${formatCurrency(sunAvg, currency)}/hr) is holding up as well as or better than Saturday (${formatCurrency(satAvg, currency)}/hr).`
        : `Based on your data, Saturday (${formatCurrency(satAvg, currency)}/hr) outperforms Sunday (${formatCurrency(sunAvg, currency)}/hr) — worth weighing before committing to more Sunday sessions.`

  if (sessions.loading) return <LoadingState label="Loading analytics…" />

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Saturday vs Sunday</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Historical performance analytics from your own logged sessions.</p>
      </div>

      <GrabSubNav />

      {sessions.data.length === 0 ? (
        <EmptyState title="No sessions yet" description="Log a few sessions to see Saturday vs Sunday performance." />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DayCard title="Saturday" sessions={saturday} currency={currency} />
            <DayCard title="Sunday" sessions={sunday} currency={currency} />
          </div>

          <div className="card border-brand-100 bg-brand-50/40 p-4">
            <p className="text-sm text-slate-700">{verdict}</p>
          </div>

          <ChartCard title="RM/hour trend" subtitle="Every session, chronologically">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v: number) => formatCurrency(v, currency)} />
                <Line type="monotone" dataKey="rmPerHour" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} name="RM/hour" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  )
}
