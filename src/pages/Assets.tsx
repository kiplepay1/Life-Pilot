import { useState, useMemo } from 'react'
import { Plus, Trash2, Landmark } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import DataTable, { Column } from '@/components/DataTable'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import CurrencyInput from '@/components/CurrencyInput'
import { SelectField, TextField, FieldRow } from '@/components/FormField'
import MetricCard from '@/components/MetricCard'
import { LoadingState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { formatCurrency } from '@/utils/format'
import { ASSET_CATEGORIES } from '@/constants'
import type { Asset, AssetCategory } from '@/types'

export default function Assets() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const assets = useCollection<Asset>('assets', 'createdAt')
  const { push } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    category: 'Property' as AssetCategory,
    currentValue: 0,
    purchaseValue: 0,
    notes: '',
  })

  const totalValue = useMemo(() => assets.data.reduce((s, a) => s + a.currentValue, 0), [assets.data])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    try {
      await assets.add(form)
      push('Asset added.', 'success')
      setModalOpen(false)
      setForm({ name: '', category: 'Property', currentValue: 0, purchaseValue: 0, notes: '' })
    } catch (err: any) {
      push(err?.message ?? 'Could not add asset.', 'error')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await assets.remove(deleteTarget)
      push('Asset removed.', 'success')
    } catch (err: any) {
      push(err?.message ?? 'Could not remove.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns: Column<Asset>[] = [
    { key: 'name', header: 'Asset', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'category', header: 'Category', render: (r) => r.category },
    { key: 'currentValue', header: 'Current value', render: (r) => formatCurrency(r.currentValue, currency) },
    { key: 'purchaseValue', header: 'Purchase value', render: (r) => (r.purchaseValue ? formatCurrency(r.purchaseValue, currency) : '—') },
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-brand-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Assets</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Property, vehicles, investments and savings you own.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add asset
        </button>
      </div>

      <MetricCard label="Total asset value" value={formatCurrency(totalValue, currency)} icon={Landmark} accent="green" />

      {assets.loading ? (
        <LoadingState />
      ) : (
        <DataTable columns={columns} rows={assets.data} rowKey={(r) => r.id} emptyMessage="No assets added yet — try your house, car, or savings." />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add asset">
        <form onSubmit={handleAdd} className="space-y-4">
          <TextField label="Asset name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required placeholder="e.g. Kenwingston Platz house" />
          <SelectField label="Category" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v as AssetCategory }))} options={ASSET_CATEGORIES} />
          <FieldRow>
            <CurrencyInput label="Current estimated value" value={form.currentValue} onChange={(v) => setForm((f) => ({ ...f, currentValue: v }))} currency={currency} required />
            <CurrencyInput label="Purchase value (optional)" value={form.purchaseValue} onChange={(v) => setForm((f) => ({ ...f, purchaseValue: v }))} currency={currency} />
          </FieldRow>
          <TextField label="Notes (optional)" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save asset</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove asset"
        message="Are you sure you want to remove this asset?"
        confirmLabel="Remove"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
