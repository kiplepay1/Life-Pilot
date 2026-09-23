import { NavLink } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { NAV_ITEMS, ADMIN_NAV_ITEM } from '@/constants'
import { useAuth } from '@/contexts/AuthContext'
import { classNames } from '@/utils/format'

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isAdmin } = useAuth()

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={classNames(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink-900 transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center gap-2.5 px-5 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
            <Compass className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Platz Budget</p>
            <p className="text-[11px] text-slate-400">Finance + GrabCar intelligence</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                classNames(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="my-3 border-t border-white/10" />
              <NavLink
                to={ADMIN_NAV_ITEM.to}
                onClick={onClose}
                className={({ isActive }) =>
                  classNames(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-amber-500 text-white' : 'text-amber-300 hover:bg-white/5'
                  )
                }
              >
                <ADMIN_NAV_ITEM.icon className="h-4 w-4 shrink-0" />
                {ADMIN_NAV_ITEM.label}
              </NavLink>
            </>
          )}
        </nav>

        <div className="px-5 py-4 text-[11px] text-slate-500">
          Your personal data is private.
          <br />Admins cannot see it.
        </div>
      </aside>
    </>
  )
}
