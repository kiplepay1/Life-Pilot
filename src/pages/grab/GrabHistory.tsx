import { useState } from 'react'
import { Trash2, History } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import GrabSubNav from '@/components/GrabSubNav'
import DataTable, { Column } from '@/components/DataTable'
import ConfirmDialog from '@/components/ConfirmDialog'
import StatusBadge from '@/components/StatusBadge'
import { LoadingState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { formatCurrency, formatDate } from '@/utils/format'
import { computeSessionMetrics } from '@/utils/grab'
import type { GrabSession } from '@/types'

export default function GrabHistory() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const sessions = useCollection<GrabSession>('grabSessions', 'date')
  const { push } = useToast()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await sessions.remove(deleteTarget)
      push('Session deleted.', 'success')
    } catch (err: any) {
      push(err?.message ?? 'Could not delete.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns: Column<GrabSession>[] = [
    { key: 'date', header: 'Date', render: (r) => <span className="font-medium text-slate-900">{formatDate(r.date)}</span> },
    { key: 'dayType', header: 'Day', render: (r) => <StatusBadge status={r.dayType === 'Saturday' ? 'upcoming' : r.dayType === 'Sunday' ? 'paid' : 'Todo'} /> },
    { key: 'hours', header: 'Hours', render: (r) => `${r.onlineHours.toFixed(1)}h` },
    { key: 'trips', header: 'Trips', render: (r) => String(r.trips) },
    { key: 'km', header: 'KM', render: (r) => r.totalKm.toFixed(0) },
    { key: 'gross', header: 'Gross', render: (r) => formatCurrency(r.grossEarnings, currency) },
    { key: 'net', header: 'Net', render: (r) => formatCurrency(computeSessionMetrics(r).netIncome, currency) },
    { key: 'rmHour', header: 'RM/hr', render: (r) => formatCurrency(computeSessionMetrics(r).rmPerHour, currency) },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button onClick={() => setDeleteTarget(r.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-brand-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Session History</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Every logged Grab session, most recent first.</p>
      </div>

      <GrabSubNav />

      {sessions.loading ? (
        <LoadingState />
      ) : (
        <DataTable columns={columns} rows={sessions.data} rowKey={(r) => r.id} emptyMessage="No sessions logged yet." />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete session"
        message="Are you sure you want to delete this session? This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
