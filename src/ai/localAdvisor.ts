import { formatCurrency } from '@/utils/format'
import type { Income, Expense, Bill, Subscription, SavingsGoal, Task } from '@/types'

export interface AdvisorContext {
  currency: string
  income: Income[]
  expenses: Expense[]
  bills: Bill[]
  subscriptions: Subscription[]
  savings: SavingsGoal[]
  tasks: Task[]
}

function monthKey(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthlyTotals(ctx: AdvisorContext) {
  const thisMonth = monthKey(new Date().toISOString())
  const income = ctx.income.filter((i) => monthKey(i.date) === thisMonth).reduce((s, i) => s + i.amount, 0)
  const expenses = ctx.expenses.filter((e) => monthKey(e.date) === thisMonth).reduce((s, e) => s + e.amount, 0)
  return { income, expenses }
}

function categoryBreakdown(ctx: AdvisorContext) {
  const thisMonth = monthKey(new Date().toISOString())
  const map = new Map<string, number>()
  ctx.expenses
    .filter((e) => monthKey(e.date) === thisMonth)
    .forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount))
  return Array.from(map.entries())
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}

function monthlySubscriptionCost(ctx: AdvisorContext) {
  return ctx.subscriptions.reduce((s, sub) => s + (sub.billingCycle === 'yearly' ? sub.amount / 12 : sub.amount), 0)
}

/**
 * Matches the question against LifePilot's suggested-prompt categories
 * (keyword heuristics) and answers using only data already loaded from
 * the user's own Firestore subcollections — no external AI call, no
 * API key, no cost. This is intentionally simpler than a real language
 * model, but it's transparent about that and never invents numbers.
 */
export function answerLocally(question: string, ctx: AdvisorContext): string {
  const q = question.toLowerCase()
  const { currency } = ctx
  const { income, expenses } = monthlyTotals(ctx)
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0
  const categories = categoryBreakdown(ctx)
  const subCost = monthlySubscriptionCost(ctx)
  const upcomingBills = ctx.bills.filter((b) => b.status !== 'paid')
  const overdueBills = ctx.bills.filter((b) => b.status === 'overdue')

  const disclaimer = ' (This is a calculated summary of your own data, not regulated financial advice.)'

  if (income === 0 && expenses === 0 && ctx.bills.length === 0) {
    return "You haven't logged any income, expenses or bills yet — add a few in Money and Bills, and I'll be able to give you a real breakdown."
  }

  if (/spend|spending|review my/.test(q)) {
    if (categories.length === 0) return `No expenses logged this month yet. Your income so far this month is ${formatCurrency(income, currency)}.` + disclaimer
    const top = categories.slice(0, 3).map((c) => `${c.category} (${formatCurrency(c.amount, currency)})`).join(', ')
    return `This month you've spent ${formatCurrency(expenses, currency)} against ${formatCurrency(income, currency)} of income (${savingsRate.toFixed(0)}% savings rate). Your top categories are: ${top}.` + disclaimer
  }

  if (/save money|where can i save|cut/.test(q)) {
    const parts: string[] = []
    if (categories[0]) parts.push(`your biggest expense category is ${categories[0].category} at ${formatCurrency(categories[0].amount, currency)}`)
    if (subCost > 0) parts.push(`your subscriptions cost ${formatCurrency(subCost, currency)}/month combined — worth reviewing which ones you still use`)
    if (parts.length === 0) return "Add a few expenses and subscriptions first, and I'll point out where the biggest opportunities are." + disclaimer
    return `Looking at your data, ${parts.join('; ')}.` + disclaimer
  }

  if (/on track|this month/.test(q)) {
    const verdict = savingsRate >= 20 ? "you're in great shape" : savingsRate >= 0 ? 'there is room to improve' : "you're spending more than you're earning this month"
    return `Your savings rate this month is ${savingsRate.toFixed(0)}% (income ${formatCurrency(income, currency)}, expenses ${formatCurrency(expenses, currency)}) — ${verdict}.` + disclaimer
  }

  if (/bills? coming|what bills|due/.test(q)) {
    if (upcomingBills.length === 0) return "You have no unpaid bills logged right now — nicely clear." + disclaimer
    const list = upcomingBills.slice(0, 5).map((b) => `${b.name} (${formatCurrency(b.amount, currency)}, ${b.status})`).join('; ')
    const overdueNote = overdueBills.length > 0 ? ` ${overdueBills.length} of these are overdue.` : ''
    return `You have ${upcomingBills.length} unpaid bill(s): ${list}.${overdueNote}` + disclaimer
  }

  if (/afford/.test(q)) {
    const disposable = Math.max(0, income - expenses)
    return `Based on this month so far, you have roughly ${formatCurrency(disposable, currency)} left after logged expenses. Compare that to the purchase price to see if it fits comfortably alongside your other goals.` + disclaimer
  }

  if (/6 months|six months|save in/.test(q)) {
    const monthlySavings = Math.max(0, income - expenses)
    return `At your current pace of saving roughly ${formatCurrency(monthlySavings, currency)}/month, you'd accumulate about ${formatCurrency(monthlySavings * 6, currency)} over 6 months if nothing changes.` + disclaimer
  }

  if (/subscription/.test(q)) {
    if (ctx.subscriptions.length === 0) return "You haven't added any subscriptions yet." + disclaimer
    const list = ctx.subscriptions.map((s) => `${s.service} (${formatCurrency(s.amount, currency)}/${s.billingCycle === 'yearly' ? 'yr' : 'mo'})`).join(', ')
    return `You have ${ctx.subscriptions.length} subscription(s) costing ${formatCurrency(subCost, currency)}/month combined: ${list}.` + disclaimer
  }

  if (/plan for this month|monthly plan/.test(q)) {
    const dueSoonTasks = ctx.tasks.filter((t) => t.status !== 'Completed').length
    const parts = [
      `Income so far: ${formatCurrency(income, currency)}, expenses: ${formatCurrency(expenses, currency)}.`,
      overdueBills.length > 0 ? `Clear ${overdueBills.length} overdue bill(s) first.` : 'No overdue bills to worry about.',
      dueSoonTasks > 0 ? `You have ${dueSoonTasks} open task(s) in Life Admin.` : 'No open tasks right now.',
    ]
    return parts.join(' ') + disclaimer
  }

  // Fallback: give a general snapshot for anything that doesn't match a known pattern.
  return `Here's a quick snapshot: ${formatCurrency(income, currency)} income and ${formatCurrency(expenses, currency)} expenses this month (${savingsRate.toFixed(0)}% savings rate), ${upcomingBills.length} unpaid bill(s), and ${ctx.subscriptions.length} active subscription(s). Try one of the suggested prompts for a more specific breakdown.` + disclaimer
}
