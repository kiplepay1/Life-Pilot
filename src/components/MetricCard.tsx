import { LucideIcon } from 'lucide-react'
import { classNames } from '@/utils/format'

interface MetricCardProps {
  label: string
  value: string
  icon: LucideIcon
  trend?: { value: string; positive: boolean }
  accent?: 'brand' | 'green' | 'red' | 'amber'
}

const accentMap = {
  brand: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-600',
}

export default function MetricCard({ label, value, icon: Icon, trend, accent = 'brand' }: MetricCardProps) {
  return (
    <div className="card p-5 transition-shadow hover:shadow-card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={classNames('rounded-xl p-2.5', accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <p
          className={classNames(
            'mt-3 text-xs font-semibold',
            trend.positive ? 'text-emerald-600' : 'text-red-600'
          )}
        >
          {trend.value}
        </p>
      )}
    </div>
  )
}
