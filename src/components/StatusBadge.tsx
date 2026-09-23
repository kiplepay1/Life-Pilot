import { classNames } from '@/utils/format'

const styles: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  rejected: 'bg-red-50 text-red-700 ring-red-600/20',
  suspended: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  upcoming: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  overdue: 'bg-red-50 text-red-700 ring-red-600/20',
  Todo: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  'In Progress': 'bg-blue-50 text-blue-700 ring-blue-600/20',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Low: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  Medium: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  High: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Urgent: 'bg-red-50 text-red-700 ring-red-600/20',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset capitalize',
        styles[status] ?? 'bg-slate-100 text-slate-600 ring-slate-500/20'
      )}
    >
      {status}
    </span>
  )
}
