import { Bell, Check } from 'lucide-react'
import { useCollection } from '@/services/useCollection'
import { LoadingState, EmptyState } from '@/components/States'
import { formatDate, classNames } from '@/utils/format'
import type { AppNotification } from '@/types'

const typeIconColor: Record<string, string> = {
  upcoming_bill: 'bg-blue-50 text-blue-600',
  overdue_bill: 'bg-red-50 text-red-600',
  document_expiry: 'bg-amber-50 text-amber-600',
  vehicle_service: 'bg-amber-50 text-amber-600',
  subscription_renewal: 'bg-brand-50 text-brand-600',
  task_due: 'bg-slate-100 text-slate-600',
  unusual_spending: 'bg-red-50 text-red-600',
  monthly_report: 'bg-emerald-50 text-emerald-600',
}

export default function Notifications() {
  const notifications = useCollection<AppNotification>('notifications', 'createdAt')

  async function markRead(id: string) {
    await notifications.update(id, { read: true } as Partial<AppNotification>)
  }

  if (notifications.loading) return <LoadingState />

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-brand-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notifications</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Bills, renewals, expiries and everything else that needs your attention.</p>
      </div>

      {notifications.data.length === 0 ? (
        <EmptyState
          title="You're all caught up"
          description="Notifications about upcoming bills, document expiry, vehicle service and more will show up here."
        />
      ) : (
        <div className="card divide-y divide-slate-100">
          {notifications.data.map((n) => (
            <div key={n.id} className={classNames('flex items-start gap-3 p-4', !n.read && 'bg-brand-50/30')}>
              <div className={classNames('rounded-lg p-2', typeIconColor[n.type] ?? 'bg-slate-100 text-slate-600')}>
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{n.title}</p>
                <p className="text-sm text-slate-500">{n.message}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(n.createdAt)}</p>
              </div>
              {!n.read && (
                <button
                  onClick={() => markRead(n.id)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                >
                  <Check className="h-3.5 w-3.5" /> Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
