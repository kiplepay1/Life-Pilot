import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, Wallet, Car, BarChart3, Settings as SettingsIcon } from 'lucide-react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { classNames } from '@/utils/format'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800/80 px-4 py-3 flex justify-around items-center shadow-2xl">
        <NavLink
          to="/"
          className={({ isActive }) =>
            classNames(
              'flex flex-col items-center gap-1 text-[11px] font-medium transition-colors',
              isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            )
          }
        >
          <Home className="h-5 w-5" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink
          to="/money"
          className={({ isActive }) =>
            classNames(
              'flex flex-col items-center gap-1 text-[11px] font-medium transition-colors',
              isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            )
          }
        >
          <Wallet className="h-5 w-5" />
          <span>Money</span>
        </NavLink>
        <NavLink
          to="/grab/hub"
          className={({ isActive }) =>
            classNames(
              'flex flex-col items-center gap-1 text-[11px] font-medium transition-colors',
              isActive || location.pathname.includes('/grab') ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            )
          }
        >
          <Car className="h-5 w-5" />
          <span>Grab</span>
        </NavLink>
        <NavLink
          to="/reports"
          className={({ isActive }) =>
            classNames(
              'flex flex-col items-center gap-1 text-[11px] font-medium transition-colors',
              isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            )
          }
        >
          <BarChart3 className="h-5 w-5" />
          <span>Insights</span>
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            classNames(
              'flex flex-col items-center gap-1 text-[11px] font-medium transition-colors',
              isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
            )
          }
        >
          <SettingsIcon className="h-5 w-5" />
          <span>Settings</span>
        </NavLink>
      </nav>
    </div>
  )
}
