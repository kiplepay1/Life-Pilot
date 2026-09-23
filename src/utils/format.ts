export function formatCurrency(amount: number, currency = 'MYR'): string {
  const symbols: Record<string, string> = { MYR: 'RM', USD: '$', SGD: 'S$', EUR: '€', GBP: '£' }
  const symbol = symbols[currency] ?? currency + ' '
  const sign = amount < 0 ? '-' : ''
  return `${sign}${symbol}${Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function daysUntil(iso: string | undefined): number | null {
  if (!iso) return null
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** Converts a recurring amount at any frequency into its monthly equivalent. */
export function monthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly':
      return amount * 4.33
    case 'quarterly':
      return amount / 3
    case 'yearly':
      return amount / 12
    case 'one-off':
      return 0
    default:
      return amount // monthly
  }
}
