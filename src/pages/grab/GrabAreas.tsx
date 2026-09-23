import { useState, useMemo } from 'react'
import { Plus, Trash2, MapPin } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import GrabSubNav from '@/components/GrabSubNav'
import DataTable, { Column } from '@/components/DataTable'
import Modal from '@/components/Modal'
import ConfirmDialog from '@/components/ConfirmDialog'
import CurrencyInput from '@/components/CurrencyInput'
import { SelectField, TextField, FieldRow } from '@/components/FormField'
import { LoadingState, EmptyState } from '@/components/States'
import { useToast } from '@/components/Toast'
import { formatCurrency, formatDate, classNames } from '@/utils/format'
import { DEMAND_LEVELS, LONG_RIDE_THRESHOLDS } from '@/constants'
import type { GrabTrip, DemandObservation, DemandLevel } from '@/types'

type Tab = 'areas' | 'longrides' | 'demand'

function tripMetrics(t: GrabTrip) {
  const hours = t.durationMinutes / 60
  return {
    rmPerHour: hours > 0 ? t.fare / hours : 0,
    rmPerKm: t.km > 0 ? t.fare / t.km : 0,
  }
}

export default function GrabAreas() {
  const { profile } = useAuth()
  const currency = profile?.currency ?? 'MYR'
  const trips = useCollection<GrabTrip>('grabTrips', 'date')
  const demand = useCollection<DemandObservation>('demandObservations', 'observedAt')
  const { push } = useToast()

  const [tab, setTab] = useState<Tab>('areas')
  const [tripModalOpen, setTripModalOpen] = useState(false)
  const [demandModalOpen, setDemandModalOpen] = useState(false)
  const [deleteTripId, setDeleteTripId] = useState<string | null>(null)
  const [deleteDemandId, setDeleteDemandId] = useState<string | null>(null)
  const [longRideThreshold, setLongRideThreshold] = useState<number>(20)

  const [tripForm, setTripForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    time: '',
    pickupArea: '',
    destinationArea: '',
    fare: 0,
    km: 0,
    durationMinutes: 0,
    notes: '',
  })
  const [demandForm, setDemandForm] = useState({ area: '', demandLevel: 'Medium' as DemandLevel })

  async function handleAddTrip(e: React.FormEvent) {
    e.preventDefault()
    try {
      await trips.add(tripForm as any)
      push('Trip logged.', 'success')
      setTripModalOpen(false)
      setTripForm({ date: new Date().toISOString().slice(0, 10), time: '', pickupArea: '', destinationArea: '', fare: 0, km: 0, durationMinutes: 0, notes: '' })
    } catch (err: any) {
      push(err?.message ?? 'Could not log trip.', 'error')
    }
  }

  async function handleAddDemand(e: React.FormEvent) {
    e.preventDefault()
    try {
      await demand.add({ area: demandForm.area, demandLevel: demandForm.demandLevel, observedAt: new Date().toISOString() })
      push('Demand observation logged.', 'success')
      setDemandModalOpen(false)
      setDemandForm({ area: '', demandLevel: 'Medium' })
    } catch (err: any) {
      push(err?.message ?? 'Could not log observation.', 'error')
    }
  }

  const areaPerformance = useMemo(() => {
    const map = new Map<string, { count: number; fareSum: number; kmSum: number; hourSum: number }>()
    trips.data.forEach((t) => {
      const key = t.pickupArea || 'Unspecified'
      const cur = map.get(key) ?? { count: 0, fareSum: 0, kmSum: 0, hourSum: 0 }
      cur.count += 1
      cur.fareSum += t.fare
      cur.kmSum += t.km
      cur.hourSum += t.durationMinutes / 60
      map.set(key, cur)
    })
    return Array.from(map.entries())
      .map(([area, v]) => ({
        area,
        count: v.count,
        avgFare: v.fareSum / v.count,
        avgKm: v.kmSum / v.count,
        avgRmPerKm: v.kmSum > 0 ? v.fareSum / v.kmSum : 0,
        avgRmPerHour: v.hourSum > 0 ? v.fareSum / v.hourSum : 0,
      }))
      .sort((a, b) => b.avgRmPerHour - a.avgRmPerHour)
  }, [trips.data])

  const longRides = useMemo(
    () => trips.data.filter((t) => t.km >= longRideThreshold).sort((a, b) => b.km - a.km),
    [trips.data, longRideThreshold]
  )

  const tripColumns: Column<GrabTrip>[] = [
    { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
    { key: 'route', header: 'Route', render: (r) => <span className="font-medium text-slate-900">{r.pickupArea} → {r.destinationArea}</span> },
    { key: 'fare', header: 'Fare', render: (r) => formatCurrency(r.fare, currency) },
    { key: 'km', header: 'KM', render: (r) => r.km.toFixed(0) },
    { key: 'rmPerKm', header: 'RM/km', render: (r) => formatCurrency(tripMetrics(r).rmPerKm, currency) },
    { key: 'rmPerHour', header: 'RM/hour', render: (r) => formatCurrency(tripMetrics(r).rmPerHour, currency) },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button onClick={() => setDeleteTripId(r.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-brand-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Areas & Demand</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Historical route performance and manually-logged demand — not live data.</p>
      </div>

      <GrabSubNav />

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 w-fit">
        {([
          ['areas', 'Area Analytics'],
          ['longrides', 'Long Rides'],
          ['demand', 'Live Demand'],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={classNames(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'areas' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={() => setTripModalOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> Log trip
            </button>
          </div>

          {trips.loading ? (
            <LoadingState />
          ) : areaPerformance.length === 0 ? (
            <EmptyState title="No trips logged yet" description="Log individual trips to see which pickup areas perform best." />
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="px-4 py-3 font-semibold text-slate-500">Pickup area</th>
                      <th className="px-4 py-3 font-semibold text-slate-500">Trips</th>
                      <th className="px-4 py-3 font-semibold text-slate-500">Avg fare</th>
                      <th className="px-4 py-3 font-semibold text-slate-500">Avg KM</th>
                      <th className="px-4 py-3 font-semibold text-slate-500">Avg RM/km</th>
                      <th className="px-4 py-3 font-semibold text-slate-500">Avg RM/hour</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areaPerformance.map((a) => (
                      <tr key={a.area} className="border-b border-slate-50 last:border-0">
                        <td className="px-4 py-3 font-medium text-slate-900">{a.area}</td>
                        <td className="px-4 py-3 text-slate-700">{a.count}</td>
                        <td className="px-4 py-3 text-slate-700">{formatCurrency(a.avgFare, currency)}</td>
                        <td className="px-4 py-3 text-slate-700">{a.avgKm.toFixed(0)}</td>
                        <td className="px-4 py-3 text-slate-700">{formatCurrency(a.avgRmPerKm, currency)}</td>
                        <td className="px-4 py-3 font-semibold text-brand-700">{formatCurrency(a.avgRmPerHour, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DataTable columns={tripColumns} rows={trips.data} rowKey={(r) => r.id} emptyMessage="No trips logged yet." />
        </div>
      )}

      {tab === 'longrides' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {LONG_RIDE_THRESHOLDS.map((km) => (
              <button
                key={km}
                onClick={() => setLongRideThreshold(km)}
                className={classNames(
                  'rounded-full px-3.5 py-1.5 text-xs font-medium',
                  longRideThreshold === km ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {km}km+
              </button>
            ))}
          </div>
          <DataTable columns={tripColumns} rows={longRides} rowKey={(r) => r.id} emptyMessage={`No trips of ${longRideThreshold}km or more logged yet.`} />
        </div>
      )}

      {tab === 'demand' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">All entries below are manual demand observations — never scraped or automated.</p>
            <button onClick={() => setDemandModalOpen(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> Log observation
            </button>
          </div>
          {demand.loading ? (
            <LoadingState />
          ) : demand.data.length === 0 ? (
            <EmptyState title="No demand observations yet" description="Log what you notice on the ground — e.g. 'Gombak — High demand'." />
          ) : (
            <div className="card divide-y divide-slate-100">
              {demand.data.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{d.area}</p>
                    <p className="text-xs text-slate-400">
                      Manual demand observation · {formatDate(d.observedAt)} · {d.demandLevel} demand
                    </p>
                  </div>
                  <button onClick={() => setDeleteDemandId(d.id)} className="text-slate-400 hover:text-red-600" aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={tripModalOpen} onClose={() => setTripModalOpen(false)} title="Log trip">
        <form onSubmit={handleAddTrip} className="space-y-4">
          <FieldRow>
            <TextField label="Date" type="date" value={tripForm.date} onChange={(v) => setTripForm((f) => ({ ...f, date: v }))} required />
            <TextField label="Time (optional)" type="time" value={tripForm.time} onChange={(v) => setTripForm((f) => ({ ...f, time: v }))} />
          </FieldRow>
          <FieldRow>
            <TextField label="Pickup area" value={tripForm.pickupArea} onChange={(v) => setTripForm((f) => ({ ...f, pickupArea: v }))} required placeholder="e.g. Gombak" />
            <TextField label="Destination area" value={tripForm.destinationArea} onChange={(v) => setTripForm((f) => ({ ...f, destinationArea: v }))} required placeholder="e.g. KLIA" />
          </FieldRow>
          <FieldRow>
            <CurrencyInput label="Fare" value={tripForm.fare} onChange={(v) => setTripForm((f) => ({ ...f, fare: v }))} currency={currency} required />
            <TextField label="KM" type="number" value={String(tripForm.km)} onChange={(v) => setTripForm((f) => ({ ...f, km: parseFloat(v) || 0 }))} required />
          </FieldRow>
          <TextField label="Duration (minutes)" type="number" value={String(tripForm.durationMinutes)} onChange={(v) => setTripForm((f) => ({ ...f, durationMinutes: parseInt(v) || 0 }))} required />
          <TextField label="Notes (optional)" value={tripForm.notes} onChange={(v) => setTripForm((f) => ({ ...f, notes: v }))} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setTripModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save trip</button>
          </div>
        </form>
      </Modal>

      <Modal open={demandModalOpen} onClose={() => setDemandModalOpen(false)} title="Log demand observation">
        <form onSubmit={handleAddDemand} className="space-y-4">
          <TextField label="Area" value={demandForm.area} onChange={(v) => setDemandForm((f) => ({ ...f, area: v }))} required placeholder="e.g. Gombak" />
          <SelectField label="Demand level" value={demandForm.demandLevel} onChange={(v) => setDemandForm((f) => ({ ...f, demandLevel: v as DemandLevel }))} options={DEMAND_LEVELS} />
          <p className="text-xs text-slate-400">Logged as a manual observation for right now — not linked to any live Grab data.</p>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setDemandModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Save observation</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTripId}
        title="Delete trip"
        message="Delete this trip record?"
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (deleteTripId) await trips.remove(deleteTripId)
          setDeleteTripId(null)
        }}
        onCancel={() => setDeleteTripId(null)}
      />
      <ConfirmDialog
        open={!!deleteDemandId}
        title="Delete observation"
        message="Delete this demand observation?"
        confirmLabel="Delete"
        danger
        onConfirm={async () => {
          if (deleteDemandId) await demand.remove(deleteDemandId)
          setDeleteDemandId(null)
        }}
        onCancel={() => setDeleteDemandId(null)}
      />
    </div>
  )
}
