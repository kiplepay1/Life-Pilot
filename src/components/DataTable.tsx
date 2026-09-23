import { ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  emptyMessage?: string
  rowKey: (row: T) => string
}

export default function DataTable<T>({ columns, rows, emptyMessage = 'No records yet.', rowKey }: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-semibold text-slate-500">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                {columns.map((col) => (
                  <td key={col.key} className={col.className ?? 'px-4 py-3 text-slate-700'}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
