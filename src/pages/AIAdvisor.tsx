import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Bot, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useCollection } from '@/services/useCollection'
import { useSettingsDoc } from '@/services/useSettingsDoc'
import { answerLocally } from '@/ai/localAdvisor'
import { AI_SUGGESTED_PROMPTS } from '@/constants'
import { useToast } from '@/components/Toast'
import { DEFAULT_FINANCIAL_SETTINGS } from '@/types'
import type { AIMessage, Income, Expense, Bill, Subscription, SavingsGoal, Task, GrabSession, FinancialSettings } from '@/types'

export default function AIAdvisor() {
  const { profile } = useAuth()
  const { push } = useToast()
  const history = useCollection<AIMessage>('aiConversations', 'createdAt')
  const income = useCollection<Income>('income', 'date')
  const expenses = useCollection<Expense>('expenses', 'date')
  const bills = useCollection<Bill>('bills', 'dueDate')
  const subscriptions = useCollection<Subscription>('subscriptions', 'nextBillingDate')
  const savings = useCollection<SavingsGoal>('savings', 'targetDate')
  const tasks = useCollection<Task>('tasks', 'dueDate')
  const grabSessions = useCollection<GrabSession>('grabSessions', 'date')
  const financialSettings = useSettingsDoc<FinancialSettings>('financial', DEFAULT_FINANCIAL_SETTINGS)

  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const messages = [...history.data].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send(question: string) {
    if (!question.trim()) return
    setInput('')
    try {
      await history.add({ role: 'user', content: question } as any)

      const reply = answerLocally(question, {
        currency: profile?.currency ?? 'MYR',
        income: income.data,
        expenses: expenses.data,
        bills: bills.data,
        subscriptions: subscriptions.data,
        savings: savings.data,
        tasks: tasks.data,
        grabSessions: grabSessions.data,
        financialSettings: financialSettings.data,
      })

      await history.add({ role: 'assistant', content: reply } as any)
    } catch (err: any) {
      push(err?.message ?? 'Could not send your message. Please try again.', 'error')
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-brand-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Drive Smart AI</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Instant answers calculated from your own data — no external AI service, no cost.
        </p>
      </div>

      <div className="card flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="rounded-2xl bg-brand-50 p-3">
                <Bot className="h-6 w-6 text-brand-600" />
              </div>
              <p className="max-w-sm text-sm text-slate-500">
                Ask me about your money, commitments, savings, or your Grab driving performance — I only ever look at your own
                data, {profile?.fullName?.split(' ')[0]}.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {AI_SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:border-brand-300 hover:text-brand-700"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                {m.content}
              </div>
              {m.role === 'user' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200">
                  <UserIcon className="h-3.5 w-3.5 text-slate-600" />
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex items-center gap-2 border-t border-slate-100 p-3"
        >
          <input
            className="input flex-1"
            placeholder="Ask about your finances or life admin…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" disabled={!input.trim()} className="btn-primary px-3.5">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
      <p className="mt-2 text-center text-xs text-slate-400">
        Answers are calculated from your own logged data, not generated by an external AI model.
      </p>
    </div>
  )
}
