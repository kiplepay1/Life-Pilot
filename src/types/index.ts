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

// ── Commitments (unified — replaces the old separate Bills and ──
// Subscriptions concepts, which overlapped and caused confusion) ────
//
// A commitment is any recurring MONTHLY obligation — a loan, a
// subscription, insurance, utilities, etc. Its `amount` is simply the
// current amount and can be edited any month (rent goes up, a plan
// changes price...). Paid status is tracked for THIS month only via
// `lastPaidMonth`: the UI computes "paid" by comparing that to the
// current month, so it naturally resets to "unpaid" every new month
// without needing any scheduled job.

export const COMMITMENT_CATEGORIES = ['Car', 'Loan', 'Housing', 'Utilities', 'Insurance', 'Subscription', 'Family', 'Other'] as const
export type CommitmentCategory = (typeof COMMITMENT_CATEGORIES)[number]

export interface Commitment {
  id: string
  title: string
  category: CommitmentCategory
  amount: number
  paymentDay: number // day of month, 1-31
  lastPaidMonth?: string // 'YYYY-MM' of the most recent month marked paid
  lastPaidDate?: string // ISO date it was marked paid
  notes: string
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

// ── Financial Settings (single doc at users/{uid}/settings/financial) ──
// Deliberately kept OUT of the main /users/{uid} profile doc, which the
// admin can read for account metadata — this keeps every financial
// number, including configured targets, entirely inaccessible to the
// admin, consistent with every other personal collection.

export interface FinancialSettings {
  monthlySalary: number
  shellFuelAllowance: number
  grabMonthlyTargetGross: number
  grabTargetRatePerHour: number
  plannedSaturdaysPerMonth: number
  plannedSundaysPerMonth: number
  plannedHoursPerSession: number
  maintenanceReservePercent: number // % of Grab gross set aside for vehicle wear/maintenance
  futureScenario: {
    enabled: boolean
    rentalIncome: number
    newRentPaid: number
    securityFee: number
  }
  updatedAt: string
}

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettings = {
  monthlySalary: 7300,
  shellFuelAllowance: 750,
  grabMonthlyTargetGross: 2000,
  grabTargetRatePerHour: 45,
  plannedSaturdaysPerMonth: 4,
  plannedSundaysPerMonth: 2,
  plannedHoursPerSession: 8,
  maintenanceReservePercent: 10,
  futureScenario: {
    enabled: false,
    rentalIncome: 3500,
    newRentPaid: 700,
    securityFee: 60,
  },
  updatedAt: '',
}

// ── Grab Driver: Sessions ───────────────────────────────────────

export type GrabDayType = 'Saturday' | 'Sunday' | 'Other'

export interface GrabSession {
  id: string
  date: string // ISO date
  dayType: GrabDayType // derived from date at save time, stored for fast querying
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
  onlineHours: number
  drivingHours: number // 0 when not provided — never `undefined` (Firestore rejects that)
  trips: number
  totalKm: number
  grossEarnings: number
  tips: number
  bonus: number
  fuel: number
  toll: number
  parking: number
  otherExpenses: number
  notes: string // '' when not provided — never `undefined`
  createdAt: string
  updatedAt: string
}

// ── Grab Driver: individual trips (for area & long-ride analytics) ──

export interface GrabTrip {
  id: string
  date: string
  time?: string
  pickupArea: string
  destinationArea: string
  fare: number
  km: number
  durationMinutes: number
  notes?: string
  createdAt: string
  updatedAt: string
}

// ── Grab Driver: manual demand observations ("Live Demand") ────
// Always manually entered — never scraped or inferred from any Grab
// system. The UI must always label these as manual observations.

export type DemandLevel = 'Low' | 'Medium' | 'High' | 'Very High'

export interface DemandObservation {
  id: string
  area: string
  demandLevel: DemandLevel
  observedAt: string // ISO timestamp the user is reporting for
  createdAt: string
  updatedAt: string
}

// ── Fuel Wallet: non-Grab-session fuel spending ─────────────────
// Grab-session fuel is logged per session (GrabSession.fuel); this is
// for extra fuel purchases once the Shell allowance runs out.

export interface FuelLog {
  id: string
  date: string
  amount: number
  source: string // e.g. "Shell", "Petronas", "Cash"
  notes?: string
  createdAt: string
  updatedAt: string
}

// ── Assets ────────────────────────────────────────────────────────

export type AssetCategory = 'Property' | 'Vehicle' | 'Investment' | 'Cash & Savings' | 'Other'

export interface Asset {
  id: string
  name: string
  category: AssetCategory
  currentValue: number
  purchaseValue?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

// ── Liabilities ──────────────────────────────────────────────────

export interface Liability {
  id: string
  name: string
  originalBalance: number
  currentBalance: number
  monthlyPayment: number
  interestRate?: number // annual %, profit rate for Islamic financing
  startDate?: string
  expectedPayoffDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
}
