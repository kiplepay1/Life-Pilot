// ── User / Account ──────────────────────────────────────────────

export type AccountStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export interface UserProfile {
  uid: string
  fullName: string
  email: string
  phone?: string
  country?: string
  currency: string // ISO 4217, default 'MYR'
  status: AccountStatus
  isAdmin: boolean
  createdAt: string // ISO timestamp
  lastLoginAt?: string
  approvedAt?: string
  approvedBy?: string
  rejectedAt?: string
  suspendedAt?: string
}

// Slim shape the admin portal is allowed to see. Deliberately excludes
// every personal/financial field — enforced independently by Firestore
// rules, not just by this type.
export interface AdminUserView {
  uid: string
  fullName: string
  email: string
  status: AccountStatus
  createdAt: string
  lastLoginAt?: string
}

// ── Money ────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'Food'
  | 'Transport'
  | 'Housing'
  | 'Utilities'
  | 'Shopping'
  | 'Entertainment'
  | 'Education'
  | 'Healthcare'
  | 'Family'
  | 'Insurance'
  | 'Subscriptions'
  | 'Other'

export type IncomeFrequency = 'one-off' | 'weekly' | 'monthly' | 'yearly'

export interface Income {
  id: string
  source: string
  amount: number
  date: string // ISO date
  frequency: IncomeFrequency
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Expense {
  id: string
  category: ExpenseCategory
  amount: number
  date: string
  description: string
  createdAt: string
  updatedAt: string
}

// ── Bills ────────────────────────────────────────────────────────

export type BillStatus = 'upcoming' | 'paid' | 'overdue'
export type BillFrequency = 'one-off' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface Bill {
  id: string
  name: string
  amount: number
  dueDate: string
  frequency: BillFrequency
  status: BillStatus
  autoPayment: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

// ── Subscriptions ────────────────────────────────────────────────

export type BillingCycle = 'monthly' | 'yearly'

export interface Subscription {
  id: string
  service: string
  amount: number
  billingCycle: BillingCycle
  nextBillingDate: string
  category: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// ── Savings ──────────────────────────────────────────────────────

export interface SavingsGoal {
  id: string
  goal: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  createdAt: string
  updatedAt: string
}

// ── Life Admin: Tasks ────────────────────────────────────────────

export type TaskCategory = 'Personal' | 'Family' | 'Finance' | 'Vehicle' | 'Home' | 'Work' | 'Documents'
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent'
export type TaskStatus = 'Todo' | 'In Progress' | 'Completed'

export interface Task {
  id: string
  task: string
  category: TaskCategory
  priority: TaskPriority
  dueDate: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
}

// ── Life Admin: Vehicles ─────────────────────────────────────────

export interface Vehicle {
  id: string
  vehicleName: string
  registrationNumber: string
  monthlyInstallment: number
  fuelCost: number
  insuranceExpiry: string
  roadTaxExpiry: string
  serviceDueDate: string
  mileage: number
  notes?: string
  createdAt: string
  updatedAt: string
}

// ── Life Admin: Documents ────────────────────────────────────────

export type DocumentCategory =
  | 'Passport'
  | 'Driving Licence'
  | 'Insurance'
  | 'Road Tax'
  | 'Property'
  | 'Warranty'
  | 'Certificate'
  | 'Other'

export interface UserDocument {
  id: string
  documentName: string
  category: DocumentCategory
  expiryDate?: string
  notes?: string
  fileUrl?: string
  filePath?: string
  createdAt: string
  updatedAt: string
}

// ── Notifications ────────────────────────────────────────────────

export type NotificationType =
  | 'upcoming_bill'
  | 'overdue_bill'
  | 'document_expiry'
  | 'vehicle_service'
  | 'subscription_renewal'
  | 'task_due'
  | 'unusual_spending'
  | 'monthly_report'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  createdAt: string
}

// ── AI Advisor ───────────────────────────────────────────────────

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

// ── Reports ──────────────────────────────────────────────────────

export interface FinancialHealthScore {
  score: number // 0-100
  rating: 'Poor' | 'Fair' | 'Good' | 'Excellent'
  strengths: string[]
  warnings: string[]
  recommendations: string[]
}
