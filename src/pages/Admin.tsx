import { useEffect, useMemo, useState } from 'react'
import { collection, deleteField, doc, onSnapshot, query, updateDoc } from 'firebase/firestore'
import { ShieldCheck, Users, Clock, CheckCircle2, ShieldOff, Activity } from 'lucide-react'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import MetricCard from '@/components/MetricCard'
import DataTable, { Column } from '@/components/DataTable'
import StatusBadge from '@/components/StatusBadge'
import ConfirmDialog from '@/components/ConfirmDialog'
import { LoadingState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { formatDate } from '@/utils/format'
import type { AdminUserView, AccountStatus } from '@/types'

type PendingAction = { uid: string; name: string; action: 'approve' | 'reject' | 'suspend' | 'reactivate' } | null

const actionCopy: Record<NonNullable<PendingAction>['action'], { title: string; message: (n: string) => string; label: string; danger?: boolean }> = {
  approve: { title: 'Approve user', message: (n) => `Approve ${n}'s account? They will be able to sign in immediately.`, label: 'Approve' },
  reject: { title: 'Reject user', message: (n) => `Reject ${n}'s registration? They will not be able to access Platz Budget.`, label: 'Reject', danger: true },
  suspend: { title: 'Suspend user', message: (n) => `Suspend ${n}'s account? They will lose access immediately.`, label: 'Suspend', danger: true },
  reactivate: { title: 'Reactivate user', message: (n) => `Reactivate ${n}'s account? They will regain access.`, label: 'Reactivate' },
}

export default function Admin() {
  const { push } = useToast()
  const { firebaseUser } = useAuth()
  const [users, setUsers] = useState<AdminUserView[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    // Firestore rules allow the isAdmin() check to read /users/{uid}
    // documents (account metadata only — no subcollections are ever
    // exposed to this query since Firestore queries cannot traverse
    // into subcollections implicitly).
    const q = query(collection(db, 'users'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        setUsers(snap.docs.map((d) => d.data() as AdminUserView))
        setLoading(false)
      },
      () => setLoading(false)
    )
    return unsub
  }, [])

  const counts = useMemo(() => {
    const by = (s: AccountStatus) => users.filter((u) => (u as any).status === s).length
    return { total: users.length, pending: by('pending'), approved: by('approved'), suspended: by('suspended') }
  }, [users])

  /**
   * All four actions below write ONLY the status-transition fields
   * firestore.rules permits an admin to touch (see
   * adminOnlyTouchesAccountFields() in firestore.rules) — never
   * anything under a user's personal subcollections, which have no
   * admin rule at all.
   */
  async function runAction() {
    if (!pendingAction || !firebaseUser) return
    setBusy(true)
    try {
      const ref = doc(db, 'users', pendingAction.uid)
      const now = new Date().toISOString()
      const adminUid = firebaseUser.uid

      if (pendingAction.action === 'approve') {
        await updateDoc(ref, { status: 'approved', approvedAt: now, approvedBy: adminUid, lastStatusChangeBy: adminUid })
      } else if (pendingAction.action === 'reject') {
        await updateDoc(ref, { status: 'rejected', rejectedAt: now, lastStatusChangeBy: adminUid })
      } else if (pendingAction.action === 'suspend') {
        if (pendingAction.uid === adminUid) throw new Error('You cannot suspend your own account.')
        await updateDoc(ref, { status: 'suspended', suspendedAt: now, lastStatusChangeBy: adminUid })
      } else if (pendingAction.action === 'reactivate') {
        await updateDoc(ref, {
          status: 'approved',
          approvedAt: now,
          approvedBy: adminUid,
          lastStatusChangeBy: adminUid,
          suspendedAt: deleteField(),
          rejectedAt: deleteField(),
        })
      }
      push(`User ${pendingAction.action}d.`, 'success')
    } catch (err: any) {
      push(err?.message ?? 'Action failed. Please try again.', 'error')
    } finally {
      setBusy(false)
      setPendingAction(null)
    }
  }

  const columns: Column<AdminUserView & { status: AccountStatus }>[] = [
    { key: 'fullName', header: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.fullName}</span> },
    { key: 'email', header: 'Email', render: (r) => r.email },
    { key: 'createdAt', header: 'Registered', render: (r) => formatDate(r.createdAt) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'lastLoginAt', header: 'Last login', render: (r) => formatDate(r.lastLoginAt) },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) => (
        <div className="flex flex-wrap gap-2">
          {r.status === 'pending' && (
            <>
              <button className="btn-primary !px-2.5 !py-1 text-xs" onClick={() => setPendingAction({ uid: r.uid, name: r.fullName, action: 'approve' })}>
                Approve
              </button>
              <button className="btn-danger !px-2.5 !py-1 text-xs" onClick={() => setPendingAction({ uid: r.uid, name: r.fullName, action: 'reject' })}>
                Reject
              </button>
            </>
          )}
          {r.status === 'approved' && (
            <button className="btn-danger !px-2.5 !py-1 text-xs" onClick={() => setPendingAction({ uid: r.uid, name: r.fullName, action: 'suspend' })}>
              Suspend
            </button>
          )}
          {(r.status === 'suspended' || r.status === 'rejected') && (
            <button className="btn-secondary !px-2.5 !py-1 text-xs" onClick={() => setPendingAction({ uid: r.uid, name: r.fullName, action: 'reactivate' })}>
              Reactivate
            </button>
          )}
        </div>
      ),
    },
  ]

  if (loading) return <LoadingState label="Loading admin portal…" />

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Portal</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Manage account access. Personal data always stays private.</p>
      </div>

      <div className="card flex items-center gap-3 border-emerald-100 bg-emerald-50/60 p-4">
        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
        <p className="text-sm text-emerald-800">
          User personal data is private and inaccessible to administrators. This portal only shows account
          metadata needed to manage access.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Total Users" value={String(counts.total)} icon={Users} accent="brand" />
        <MetricCard label="Pending Approvals" value={String(counts.pending)} icon={Clock} accent="amber" />
        <MetricCard label="Approved Users" value={String(counts.approved)} icon={CheckCircle2} accent="green" />
        <MetricCard label="Suspended Users" value={String(counts.suspended)} icon={ShieldOff} accent="red" />
        <MetricCard label="Active Users" value="—" icon={Activity} accent="brand" />
      </div>
      <p className="-mt-3 text-xs text-slate-400">
        Active Users requires a separate usage-metrics pipeline (e.g. logging sign-ins) which is not wired up in
        this build — shown as "—" rather than a fabricated number.
      </p>

      <DataTable columns={columns} rows={users as any} rowKey={(r) => r.uid} emptyMessage="No registered users yet." />

      <ConfirmDialog
        open={!!pendingAction}
        title={pendingAction ? actionCopy[pendingAction.action].title : ''}
        message={pendingAction ? actionCopy[pendingAction.action].message(pendingAction.name) : ''}
        confirmLabel={busy ? 'Working…' : pendingAction ? actionCopy[pendingAction.action].label : ''}
        danger={pendingAction ? actionCopy[pendingAction.action].danger : false}
        onConfirm={runAction}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  )
}
