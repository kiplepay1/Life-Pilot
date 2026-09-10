import { useState } from 'react'
import { Plus, Trash2, Wallet } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import DataTable, { Column } from '@/components/DataTable'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import CurrencyInput from '@/components/CurrencyInput'
import { SelectField, TextField, FieldRow } from '@/components/FormField'
import { LoadingState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { formatCurrency, formatDate, classNames } from '@/utils/format'
import { EXPENSE_CATEGORIES } from '@/constants'
import type { Income, Expense, IncomeFrequency, ExpenseCategory } from '@/types'

type Tab = 'income' | 'expenses'

export default function Money() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const [tab, setTab] = useState<Tab>('income')
  const income = useCollection<Income>('income', 'date')
  const expenses = useCollection<Expense>('expenses', 'date')
  const { push } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const [incomeForm, setIncomeForm] = useState({ source: '', amount: 0, date: today(), frequency: 'monthly' as IncomeFrequency, notes: '' })
  const [expenseForm, setExpenseForm] = useState({ category: 'Food' as ExpenseCategory, amount: 0, date: today(), description: '' })

  function today() {
    return new Date().toISOString().slice(0, 10)
  }

  async function handleAddIncome(e: React.FormEvent) {
    e.preventDefault()
    try {
      await income.add(incomeForm)
      push('Income added.', 'success')
      setModalOpen(false)
      setIncomeForm({ source: '', amount: 0, date: today(), frequency: 'monthly', notes: '' })
    } catch (err: any) {
      push(err?.message ?? 'Could not add income.', 'error')
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    try {
      await expenses.add(expenseForm)
      push('Expense added.', 'success')
      setModalOpen(false)
      setExpenseForm({ category: 'Food', amount: 0, date: today(), description: '' })
    } catch (err: any) {
      push(err?.message ?? 'Could not add expense.', 'error')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      if (tab === 'income') await income.remove(deleteTarget)
      else await expenses.remove(deleteTarget)
      push('Deleted.', 'success')
    } catch (err: any) {
      push(err?.message ?? 'Could not delete.', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  const incomeColumns: Column<Income>[] = [
    { key: 'source', header: 'Source', render: (r) => <span className="font-medium text-slate-900">{r.source}</span> },
    { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount, currency) },
    { key: 'frequency', header: 'Frequency', render: (r) => <span className="capitalize">{r.frequency}</span> },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
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

  const expenseColumns: Column<Expense>[] = [
    { key: 'description', header: 'Description', render: (r) => <span className="font-medium text-slate-900">{r.description}</span> },
    { key: 'category', header: 'Category', render: (r) => r.category },
    { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount, currency) },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
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

  const loading = tab === 'income' ? income.loading : expenses.loading

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-brand-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Money</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">Track your income and expenses.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add {tab === 'income' ? 'income' : 'expense'}
        </button>
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {(['income', 'expenses'] as Tab[]).map((t) => (
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

      {loading ? (
        <LoadingState />
      ) : tab === 'income' ? (
        <DataTable columns={incomeColumns} rows={income.data} rowKey={(r) => r.id} emptyMessage="No income recorded yet. Add your first income source." />
      ) : (
        <DataTable columns={expenseColumns} rows={expenses.data} rowKey={(r) => r.id} emptyMessage="No expenses recorded yet. Add your first expense." />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={tab === 'income' ? 'Add income' : 'Add expense'}>
        {tab === 'income' ? (
          <form onSubmit={handleAddIncome} className="space-y-4">
            <TextField label="Source" value={incomeForm.source} onChange={(v) => setIncomeForm((f) => ({ ...f, source: v }))} required placeholder="e.g. Salary, Freelance" />
            <FieldRow>
              <CurrencyInput label="Amount" value={incomeForm.amount} onChange={(v) => setIncomeForm((f) => ({ ...f, amount: v }))} currency={currency} required />
              <TextField label="Date" type="date" value={incomeForm.date} onChange={(v) => setIncomeForm((f) => ({ ...f, date: v }))} required />
            </FieldRow>
            <SelectField
              label="Frequency"
              value={incomeForm.frequency}
              onChange={(v) => setIncomeForm((f) => ({ ...f, frequency: v as IncomeFrequency }))}
              options={['one-off', 'weekly', 'monthly', 'yearly']}
            />
            <TextField label="Notes (optional)" value={incomeForm.notes} onChange={(v) => setIncomeForm((f) => ({ ...f, notes: v }))} />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save income</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAddExpense} className="space-y-4">
            <TextField label="Description" value={expenseForm.description} onChange={(v) => setExpenseForm((f) => ({ ...f, description: v }))} required placeholder="e.g. Groceries at Tesco" />
            <FieldRow>
              <SelectField
                label="Category"
                value={expenseForm.category}
                onChange={(v) => setExpenseForm((f) => ({ ...f, category: v as ExpenseCategory }))}
                options={EXPENSE_CATEGORIES}
              />
              <CurrencyInput label="Amount" value={expenseForm.amount} onChange={(v) => setExpenseForm((f) => ({ ...f, amount: v }))} currency={currency} required />
            </FieldRow>
            <TextField label="Date" type="date" value={expenseForm.date} onChange={(v) => setExpenseForm((f) => ({ ...f, date: v }))} required />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save expense</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete record"
        message="Are you sure you want to delete this record? This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
