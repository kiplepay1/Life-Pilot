import type { GrabSession, GrabDayType, FinancialSettings } from '@/types'

export function dayTypeFromDate(dateIso: string): GrabDayType {
  const d = new Date(dateIso)
  const day = d.getDay() // 0 = Sunday, 6 = Saturday
  if (day === 6) return 'Saturday'
  if (day === 0) return 'Sunday'
  return 'Other'
}

export function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export interface SessionMetrics {
  netIncome: number
  rmPerHour: number
  rmPerKm: number
  rmPerTrip: number
  tripsPerHour: number
  kmPerHour: number
}

/**
 * Net Income = Gross Earnings + Tips + Bonus - Fuel - Toll - Parking - Other Expenses
 * (Tips and bonus are additional take-home, so they're added; the spec's
 * base formula covers gross earnings, this extends it consistently with
 * the RM/hour, RM/km etc. formulas underneath, which are all derived
 * from net income.)
 */
export function computeSessionMetrics(s: Pick<GrabSession, 'grossEarnings' | 'tips' | 'bonus' | 'fuel' | 'toll' | 'parking' | 'otherExpenses' | 'onlineHours' | 'totalKm' | 'trips'>): SessionMetrics {
  const netIncome = s.grossEarnings + s.tips + s.bonus - s.fuel - s.toll - s.parking - s.otherExpenses
  const rmPerHour = s.onlineHours > 0 ? netIncome / s.onlineHours : 0
  const rmPerKm = s.totalKm > 0 ? netIncome / s.totalKm : 0
  const rmPerTrip = s.trips > 0 ? s.grossEarnings / s.trips : 0
  const tripsPerHour = s.onlineHours > 0 ? s.trips / s.onlineHours : 0
  const kmPerHour = s.onlineHours > 0 ? s.totalKm / s.onlineHours : 0
  return { netIncome, rmPerHour, rmPerKm, rmPerTrip, tripsPerHour, kmPerHour }
}

export interface AggregateMetrics {
  count: number
  totalGross: number
  totalNet: number
  totalTrips: number
  totalKm: number
  totalHours: number
  avgRmPerHour: number
  avgRmPerKm: number
  avgGross: number
  avgNet: number
  avgTrips: number
  avgKm: number
  avgHours: number
}

export function aggregateSessions(sessions: GrabSession[]): AggregateMetrics {
  if (sessions.length === 0) {
    return { count: 0, totalGross: 0, totalNet: 0, totalTrips: 0, totalKm: 0, totalHours: 0, avgRmPerHour: 0, avgRmPerKm: 0, avgGross: 0, avgNet: 0, avgTrips: 0, avgKm: 0, avgHours: 0 }
  }
  let totalGross = 0
  let totalNet = 0
  let totalTrips = 0
  let totalKm = 0
  let totalHours = 0
  sessions.forEach((s) => {
    const m = computeSessionMetrics(s)
    totalGross += s.grossEarnings
    totalNet += m.netIncome
    totalTrips += s.trips
    totalKm += s.totalKm
    totalHours += s.onlineHours
  })
  return {
    count: sessions.length,
    totalGross,
    totalNet,
    totalTrips,
    totalKm,
    totalHours,
    avgRmPerHour: totalHours > 0 ? totalNet / totalHours : 0,
    avgRmPerKm: totalKm > 0 ? totalNet / totalKm : 0,
    avgGross: totalGross / sessions.length,
    avgNet: totalNet / sessions.length,
    avgTrips: totalTrips / sessions.length,
    avgKm: totalKm / sessions.length,
    avgHours: totalHours / sessions.length,
  }
}

export function thisMonthSessions(sessions: GrabSession[]): GrabSession[] {
  const thisMonth = monthKey(new Date().toISOString())
  return sessions.filter((s) => monthKey(s.date) === thisMonth)
}

export interface TargetProgress {
  target: number
  actualGross: number
  progressPercent: number
  remaining: number
  plannedSessionsTotal: number
  sessionsCompleted: number
  sessionsRemaining: number
  requiredPerRemainingSession: number
}

export function computeTargetProgress(sessions: GrabSession[], settings: FinancialSettings): TargetProgress {
  const monthSessions = thisMonthSessions(sessions)
  const actualGross = monthSessions.reduce((s, x) => s + x.grossEarnings, 0)
  const target = settings.grabMonthlyTargetGross
  const remaining = Math.max(0, target - actualGross)
  const plannedSessionsTotal = settings.plannedSaturdaysPerMonth + settings.plannedSundaysPerMonth
  const sessionsCompleted = monthSessions.length
  const sessionsRemaining = Math.max(0, plannedSessionsTotal - sessionsCompleted)
  return {
    target,
    actualGross,
    progressPercent: target > 0 ? Math.min(100, (actualGross / target) * 100) : 0,
    remaining,
    plannedSessionsTotal,
    sessionsCompleted,
    sessionsRemaining,
    requiredPerRemainingSession: sessionsRemaining > 0 ? remaining / sessionsRemaining : remaining,
  }
}
