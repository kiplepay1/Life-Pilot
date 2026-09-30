const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
}
const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/** Fixes the most common OCR digit confusions inside a numeric-looking token. */
function cleanNumber(raw: string): number {
  const cleaned = raw.replace(/O/gi, '0').replace(/,/g, '').replace(/[^\d.]/g, '')
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

function findAmountAfter(text: string, fromIndex: number, withinChars = 60): number | null {
  const window = text.slice(fromIndex, fromIndex + withinChars)
  const match = window.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/)
  return match ? cleanNumber(match[1]) : null
}

export interface ScannedDaySession {
  date: string // ISO date, best guess
  trips: number
  grossEarnings: number
  bonus: number
  label: string // human-readable, for the picker UI
}

export interface ScannedDailyDetail {
  date: string | null // null when the screenshot doesn't show an explicit date
  trips: number | null
  grossEarnings: number | null // "Transport Net Earning" — Grab's figure after its own commission
  bonus: number | null // "Incentives"
  tollsReimbursed: number | null // shown for info only — never added as a cost, Grab already refunds it
}

export type ScreenshotParseResult =
  | { type: 'weekly'; days: ScannedDaySession[] }
  | { type: 'daily'; detail: ScannedDailyDetail }
  | { type: 'unrecognized' }

/**
 * Tries the weekly summary layout first (multiple day blocks with a
 * day name, job count, and amount), then the single-day detail layout
 * ("Yesterday's Earnings" / "Transport Net Earning" breakdown). Falls
 * back to 'unrecognized' rather than guessing — an empty/unclear
 * result is safer than a wrong one, since the user reviews the output
 * either way.
 */
export function parseGrabScreenshot(rawText: string): ScreenshotParseResult {
  const text = rawText.replace(/\r/g, '')
  const now = new Date()

  // ── Weekly layout: repeated "Sunday, September 27 / 17 Jobs
  // Completed / 250.50" style blocks ──────────────────────────────
  const dayHeaderRe = /(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s*,?\s+([a-z]+)\s+(\d{1,2})/gi
  const headerMatches = [...text.matchAll(dayHeaderRe)]

  if (headerMatches.length > 0) {
    const days: ScannedDaySession[] = []
    headerMatches.forEach((m, i) => {
      const dayName = m[1].toLowerCase()
      const monthName = m[2].toLowerCase()
      const dayNum = parseInt(m[3], 10)
      const month = MONTHS[monthName]
      if (month === undefined || !DAY_NAMES.includes(dayName)) return

      const segmentStart = (m.index ?? 0) + m[0].length
      const segmentEnd = i + 1 < headerMatches.length ? headerMatches[i + 1].index ?? text.length : text.length
      const segment = text.slice(segmentStart, segmentEnd)

      const jobsMatch = segment.match(/(\d+)\s*Jobs?\s*Completed/i)
      if (!jobsMatch) return
      const trips = parseInt(jobsMatch[1], 10)
      const amount = findAmountAfter(segment, (jobsMatch.index ?? 0) + jobsMatch[0].length)
      if (amount === null) return

      let year = now.getFullYear()
      const guessDate = new Date(year, month, dayNum)
      // If the guessed date is more than ~2 months in the future, it's
      // almost certainly last year's same month (e.g. scanning a
      // December screenshot in January).
      if (guessDate.getTime() - now.getTime() > 60 * 24 * 60 * 60 * 1000) year -= 1

      const iso = new Date(year, month, dayNum).toISOString().slice(0, 10)
      days.push({
        date: iso,
        trips,
        grossEarnings: amount,
        bonus: 0,
        label: `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}, ${m[2]} ${dayNum} — ${trips} jobs, RM${amount.toFixed(2)}`,
      })
    })
    if (days.length > 0) return { type: 'weekly', days }
  }

  // ── Daily detail layout: "Transport Net Earning" breakdown ───────
  const hasDailyMarkers = /net earnings/i.test(text) || /transport net earning/i.test(text)
  if (hasDailyMarkers) {
    const isYesterday = /yesterday/i.test(text)
    const date = isYesterday ? new Date(now.getTime() - 86400000).toISOString().slice(0, 10) : null

    const jobsMatch = text.match(/(\d+)\s*Jobs\b/i)
    const trips = jobsMatch ? parseInt(jobsMatch[1], 10) : null

    const grossMatch = text.match(/Transport Net Earning\s*[:\-]?/i)
    const grossEarnings = grossMatch ? findAmountAfter(text, (grossMatch.index ?? 0) + grossMatch[0].length) : null

    const incentiveMatch = text.match(/Incentives?\s*[:\-]?/i)
    const bonus = incentiveMatch ? findAmountAfter(text, (incentiveMatch.index ?? 0) + incentiveMatch[0].length) : null

    const tollMatch = text.match(/Tolls?\s*[:\-]?/i)
    const tollsReimbursed = tollMatch ? findAmountAfter(text, (tollMatch.index ?? 0) + tollMatch[0].length) : null

    if (trips !== null || grossEarnings !== null) {
      return { type: 'daily', detail: { date, trips, grossEarnings, bonus, tollsReimbursed } }
    }
  }

  return { type: 'unrecognized' }
}
