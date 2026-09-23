import { useState } from 'react'
import { Plus, Trash2, ClipboardList, Car, AlertTriangle } from 'lucide-react'
import { useCollection } from '@/services/useCollection'
import DataTable, { Column } from '@/components/DataTable'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import CurrencyInput from '@/components/CurrencyInput'
import { SelectField, TextField, FieldRow } from '@/components/FormField'
import StatusBadge from '@/components/StatusBadge'
import { LoadingState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, daysUntil, classNames } from '@/utils/format'
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from '@/constants'
import type { Task, TaskCategory, TaskPriority, TaskStatus, Vehicle } from '@/types'

type Tab = 'tasks' | 'vehicles'

function TasksPanel() {
  const tasks = useCollection<Task>('tasks', 'dueDate')
  const { push } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [form, setForm] = useState({
    task: '',
    category: 'Personal' as TaskCategory,
    priority: 'Medium' as TaskPriority,
    dueDate: new Date().toISOString().slice(0, 10),
    status: 'Todo' as TaskStatus,
  })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    try {
      await tasks.add(form)
      push('Task added.', 'success')
      setModalOpen(false)
      setForm({ task: '', category: 'Personal', priority: 'Medium', dueDate: new Date().toISOString().slice(0, 10), status: 'Todo' })
    } catch (err: any) {
      push(err?.message ?? 'Could not add task.', 'error')
    }
  }

  async function cycleStatus(t: Task) {
    const order: TaskStatus[] = ['Todo', 'In Progress', 'Completed']
    const next = order[(order.indexOf(t.status) + 1) % order.length]
    await tasks.update(t.id, { status: next } as Partial<Task>)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await tasks.remove(deleteTarget)
    push('Task deleted.', 'success')
    setDeleteTarget(null)
  }

  const columns: Column<Task>[] = [
    { key: 'task', header: 'Task', render: (r) => <span className="font-medium text-slate-900">{r.task}</span> },
    { key: 'category', header: 'Category', render: (r) => r.category },
    { key: 'priority', header: 'Priority', render: (r) => <StatusBadge status={r.priority} /> },
    { key: 'dueDate', header: 'Due', render: (r) => formatDate(r.dueDate) },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <button onClick={() => cycleStatus(r)} className="cursor-pointer">
          <StatusBadge status={r.status} />
        </button>
      ),
    },
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add task
        </button>
      </div>
      {tasks.loading ? (
        <LoadingState />
      ) : (
        <DataTable columns={columns} rows={tasks.data} rowKey={(r) => r.id} emptyMessage="No tasks yet. Click a status badge to cycle it once you add one." />
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add task">
        <form onSubmit={handleAdd} className="space-y-4">
          <TextField label="Task" value={form.task} onChange={(v) => setForm((f) => ({ ...f, task: v }))} required placeholder="e.g. Renew car insurance" />
          <FieldRow>
            <SelectField label="Category" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v as TaskCategory }))} options={TASK_CATEGORIES} />
            <SelectField label="Priority" value={form.priority} onChange={(v) => setForm((f) => ({ ...f, priority: v as TaskPriority }))} options={TASK_PRIORITIES} />
          </FieldRow>
          <FieldRow>
            <TextField label="Due date" type="date" value={form.dueDate} onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))} required />
            <SelectField label="Status" value={form.status} onChange={(v) => setForm((f) => ({ ...f, status: v as TaskStatus }))} options={TASK_STATUSES} />
          </FieldRow>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save task</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} title="Delete task" message="Delete this task?" confirmLabel="Delete" danger onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

function VehiclesPanel() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const vehicles = useCollection<Vehicle>('vehicles', 'createdAt')
  const { push } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [form, setForm] = useState({
    vehicleName: '',
    registrationNumber: '',
    monthlyInstallment: 0,
    fuelCost: 0,
    insuranceExpiry: new Date().toISOString().slice(0, 10),
    roadTaxExpiry: new Date().toISOString().slice(0, 10),
    serviceDueDate: new Date().toISOString().slice(0, 10),
    mileage: 0,
    notes: '',
  })

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    try {
      await vehicles.add(form)
      push('Vehicle added.', 'success')
      setModalOpen(false)
    } catch (err: any) {
      push(err?.message ?? 'Could not add vehicle.', 'error')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await vehicles.remove(deleteTarget)
    push('Vehicle removed.', 'success')
    setDeleteTarget(null)
  }

  function alertBadge(dateStr: string, label: string) {
    const days = daysUntil(dateStr)
    if (days === null) return null
    if (days < 0) return <span className="flex items-center gap-1 text-xs font-medium text-red-600"><AlertTriangle className="h-3 w-3" /> {label} expired</span>
    if (days <= 30) return <span className="flex items-center gap-1 text-xs font-medium text-amber-600"><AlertTriangle className="h-3 w-3" /> {label} due in {days}d</span>
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add vehicle
        </button>
      </div>
      {vehicles.loading ? (
        <LoadingState />
      ) : vehicles.data.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Car className="mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">No vehicles added yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {vehicles.data.map((v) => (
            <div key={v.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">{v.vehicleName}</h3>
                  <p className="text-xs text-slate-400">{v.registrationNumber}</p>
                </div>
                <button onClick={() => setDeleteTarget(v.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <span>Installment: {formatCurrency(v.monthlyInstallment, currency)}/mo</span>
                <span>Fuel: {formatCurrency(v.fuelCost, currency)}/mo</span>
                <span>Mileage: {v.mileage.toLocaleString()} km</span>
              </div>
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                {alertBadge(v.insuranceExpiry, 'Insurance') ?? (
                  <span className="text-xs text-slate-400">Insurance valid until {formatDate(v.insuranceExpiry)}</span>
                )}
                <br />
                {alertBadge(v.roadTaxExpiry, 'Road tax') ?? (
                  <span className="text-xs text-slate-400">Road tax valid until {formatDate(v.roadTaxExpiry)}</span>
                )}
                <br />
                {alertBadge(v.serviceDueDate, 'Service') ?? (
                  <span className="text-xs text-slate-400">Next service {formatDate(v.serviceDueDate)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add vehicle">
        <form onSubmit={handleAdd} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <FieldRow>
            <TextField label="Vehicle name" value={form.vehicleName} onChange={(v) => setForm((f) => ({ ...f, vehicleName: v }))} required placeholder="e.g. Honda Civic" />
            <TextField label="Registration no." value={form.registrationNumber} onChange={(v) => setForm((f) => ({ ...f, registrationNumber: v }))} required placeholder="e.g. WXY 1234" />
          </FieldRow>
          <FieldRow>
            <CurrencyInput label="Monthly installment" value={form.monthlyInstallment} onChange={(v) => setForm((f) => ({ ...f, monthlyInstallment: v }))} currency={currency} />
            <CurrencyInput label="Fuel cost / mo" value={form.fuelCost} onChange={(v) => setForm((f) => ({ ...f, fuelCost: v }))} currency={currency} />
          </FieldRow>
          <FieldRow>
            <TextField label="Insurance expiry" type="date" value={form.insuranceExpiry} onChange={(v) => setForm((f) => ({ ...f, insuranceExpiry: v }))} required />
            <TextField label="Road tax expiry" type="date" value={form.roadTaxExpiry} onChange={(v) => setForm((f) => ({ ...f, roadTaxExpiry: v }))} required />
          </FieldRow>
          <FieldRow>
            <TextField label="Service due" type="date" value={form.serviceDueDate} onChange={(v) => setForm((f) => ({ ...f, serviceDueDate: v }))} required />
            <TextField label="Mileage (km)" type="number" value={String(form.mileage)} onChange={(v) => setForm((f) => ({ ...f, mileage: parseInt(v) || 0 }))} />
          </FieldRow>
          <TextField label="Notes (optional)" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save vehicle</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} title="Remove vehicle" message="Remove this vehicle from your records?" confirmLabel="Remove" danger onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

export default function LifeAdmin() {
  const [tab, setTab] = useState<Tab>('tasks')

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-brand-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Life Admin</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Tasks and vehicles in one place. See Documents for expiry tracking.</p>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {(['tasks', 'vehicles'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={classNames(
              'rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'tasks' ? <TasksPanel /> : <VehiclesPanel />}
    </div>
  )
}
