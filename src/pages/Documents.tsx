import { useState } from 'react'
import { Plus, Trash2, FileText, Download, AlertTriangle } from 'lucide-react'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import DataTable, { Column } from '@/components/DataTable'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import { SelectField, TextField } from '@/components/FormField'
import StatusBadge from '@/components/StatusBadge'
import { LoadingState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { formatDate, daysUntil } from '@/utils/format'
import { DOCUMENT_CATEGORIES } from '@/constants'
import type { UserDocument, DocumentCategory } from '@/types'

function expiryStatus(expiryDate?: string): 'valid' | 'expiring' | 'expired' | null {
  if (!expiryDate) return null
  const days = daysUntil(expiryDate)
  if (days === null) return null
  if (days < 0) return 'expired'
  if (days <= 30) return 'expiring'
  return 'valid'
}

export default function Documents() {
  const { firebaseUser } = useAuth()
  const docs = useCollection<UserDocument>('documents', 'createdAt')
  const { push } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserDocument | null>(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ documentName: '', category: 'Other' as DocumentCategory, expiryDate: '', notes: '' })
  const [file, setFile] = useState<File | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!firebaseUser) return
    setUploading(true)
    try {
      let fileUrl: string | undefined
      let filePath: string | undefined
      if (file) {
        // Path is scoped under the current user's own UID — Storage
        // rules independently reject any other path for this user.
        filePath = `users/${firebaseUser.uid}/documents/${Date.now()}-${file.name}`
        const storageRef = ref(storage, filePath)
        await uploadBytes(storageRef, file)
        fileUrl = await getDownloadURL(storageRef)
      }
      await docs.add({ ...form, fileUrl, filePath } as any)
      push('Document added.', 'success')
      setModalOpen(false)
      setForm({ documentName: '', category: 'Other', expiryDate: '', notes: '' })
      setFile(null)
    } catch (err: any) {
      push(err?.message ?? 'Could not save document.', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      if (deleteTarget.filePath) {
        await deleteObject(ref(storage, deleteTarget.filePath)).catch(() => undefined)
      }
      await docs.remove(deleteTarget.id)
      push('Document deleted.', 'success')
    } catch (err: any) {
      push(err?.message ?? 'Could not delete.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns: Column<UserDocument>[] = [
    { key: 'documentName', header: 'Document', render: (r) => <span className="font-medium text-slate-900">{r.documentName}</span> },
    { key: 'category', header: 'Category', render: (r) => r.category },
    { key: 'expiryDate', header: 'Expiry', render: (r) => formatDate(r.expiryDate) },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const s = expiryStatus(r.expiryDate)
        if (!s) return <span className="text-xs text-slate-400">No expiry</span>
        return <StatusBadge status={s === 'valid' ? 'paid' : s === 'expiring' ? 'upcoming' : 'overdue'} />
      },
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex items-center gap-3">
          {r.fileUrl && (
            <a href={r.fileUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-brand-600" aria-label="Download">
              <Download className="h-4 w-4" />
            </a>
          )}
          <button onClick={() => setDeleteTarget(r)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  const expiringSoon = docs.data.filter((d) => expiryStatus(d.expiryDate) === 'expiring').length
  const expired = docs.data.filter((d) => expiryStatus(d.expiryDate) === 'expired').length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Documents</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {expiringSoon > 0 || expired > 0 ? (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" /> {expired} expired · {expiringSoon} expiring soon
              </span>
            ) : (
              'Keep important documents and their expiry dates in one place.'
            )}
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add document
        </button>
      </div>

      {docs.loading ? (
        <LoadingState />
      ) : (
        <DataTable columns={columns} rows={docs.data} rowKey={(r) => r.id} emptyMessage="No documents added yet." />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add document">
        <form onSubmit={handleAdd} className="space-y-4">
          <TextField label="Document name" value={form.documentName} onChange={(v) => setForm((f) => ({ ...f, documentName: v }))} required placeholder="e.g. Passport" />
          <SelectField label="Category" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v as DocumentCategory }))} options={DOCUMENT_CATEGORIES} />
          <TextField label="Expiry date (optional)" type="date" value={form.expiryDate} onChange={(v) => setForm((f) => ({ ...f, expiryDate: v }))} />
          <div>
            <label className="label">File (optional, PDF or image, max 15MB)</label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>
          <TextField label="Notes (optional)" value={form.notes} onChange={(v) => setForm((f) => ({ ...f, notes: v }))} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="submit" disabled={uploading} className="btn-primary">
              {uploading ? 'Saving…' : 'Save document'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete document"
        message="Are you sure you want to delete this document? Its file, if any, will also be removed."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
