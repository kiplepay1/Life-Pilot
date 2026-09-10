import {
  LayoutDashboard,
  Sparkles,
  Wallet,
  Receipt,
  Repeat,
  PiggyBank,
  ClipboardList,
  FileText,
  BarChart3,
  Bell,
  Settings,
  ShieldCheck,
} from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ai-advisor', label: 'AI Advisor', icon: Sparkles },
  { to: '/money', label: 'Money', icon: Wallet },
  { to: '/bills', label: 'Bills', icon: Receipt },
  { to: '/subscriptions', label: 'Subscriptions', icon: Repeat },
  { to: '/savings', label: 'Savings', icon: PiggyBank },
  { to: '/life-admin', label: 'Life Admin', icon: ClipboardList },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export const ADMIN_NAV_ITEM = { to: '/admin', label: 'Admin Portal', icon: ShieldCheck } as const

export const EXPENSE_CATEGORIES = [
  'Food',
  'Transport',
  'Housing',
  'Utilities',
  'Shopping',
  'Entertainment',
  'Education',
  'Healthcare',
  'Family',
  'Insurance',
  'Subscriptions',
  'Other',
] as const

export const TASK_CATEGORIES = ['Personal', 'Family', 'Finance', 'Vehicle', 'Home', 'Work', 'Documents'] as const
export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const
export const TASK_STATUSES = ['Todo', 'In Progress', 'Completed'] as const

export const DOCUMENT_CATEGORIES = [
  'Passport',
  'Driving Licence',
  'Insurance',
  'Road Tax',
  'Property',
  'Warranty',
  'Certificate',
  'Other',
] as const

export const CHART_COLORS = ['#4f46e5', '#818cf8', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#a855f7', '#ec4899']

export const AI_SUGGESTED_PROMPTS = [
  'Review my spending',
  'Where can I save money?',
  'Am I on track this month?',
  'What bills are coming up?',
  'Can I afford this purchase?',
  'How much can I save in 6 months?',
  'Review my subscriptions',
  'Give me a plan for this month',
]
