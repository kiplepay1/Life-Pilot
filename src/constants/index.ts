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
  Car,
  Landmark,
  Scale,
} from 'lucide-react'

export const APP_NAME = 'Platz Budget'
export const APP_TAGLINE = 'Personal finance + GrabCar driver intelligence.'

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/ai-advisor', label: 'Drive Smart AI', icon: Sparkles },
  { to: '/money', label: 'Money', icon: Wallet },
  { to: '/bills', label: 'Commitments', icon: Receipt },
  { to: '/subscriptions', label: 'Subscriptions', icon: Repeat },
  { to: '/savings', label: 'Savings', icon: PiggyBank },
  { to: '/grab', label: 'Grab Driver', icon: Car },
  { to: '/assets', label: 'Assets', icon: Landmark },
  { to: '/liabilities', label: 'Liabilities', icon: Scale },
  { to: '/life-admin', label: 'Life Admin', icon: ClipboardList },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export const ADMIN_NAV_ITEM = { to: '/admin', label: 'Admin Portal', icon: ShieldCheck } as const

// Sub-navigation shown within the Grab Driver hub
export const GRAB_NAV_ITEMS = [
  { to: '/grab', label: 'Performance' },
  { to: '/grab/session', label: 'New Session' },
  { to: '/grab/history', label: 'History' },
  { to: '/grab/analytics', label: 'Sat vs Sun' },
  { to: '/grab/areas', label: 'Areas & Demand' },
  { to: '/grab/fuel', label: 'Fuel Wallet' },
  { to: '/grab/targets', label: 'Targets' },
] as const

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

export const ASSET_CATEGORIES = ['Property', 'Vehicle', 'Investment', 'Cash & Savings', 'Other'] as const

export const DEMAND_LEVELS = ['Low', 'Medium', 'High', 'Very High'] as const

export const LONG_RIDE_THRESHOLDS = [20, 30, 40, 50] as const

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
  'Am I on track for my Grab target?',
  'How much do I need per session?',
  'Is Sunday driving worth it?',
  "What's my net worth?",
]
