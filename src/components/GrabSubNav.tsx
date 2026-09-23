import { NavLink } from 'react-router-dom'
import { GRAB_NAV_ITEMS } from '@/constants'
import { classNames } from '@/utils/format'

export default function GrabSubNav() {
  return (
    <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
      {GRAB_NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/grab'}
          className={({ isActive }) =>
            classNames(
              'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  )
}
