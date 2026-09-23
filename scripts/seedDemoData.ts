/**
 * scripts/seedDemoData.ts
 *
 * Populates a SINGLE, explicitly-specified user account with realistic
 * demo data (income, expenses, bills, subscriptions, savings goals,
 * tasks, a vehicle, and a document) for local development and demos.
 *
 * This intentionally never touches any other user's data, and never
 * runs against a UID you didn't explicitly provide — there is no
 * "seed everyone" mode, so demo data can never leak into a real
 * account by accident.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *     npm run seed -- --uid=<DEMO_ACCOUNT_UID>
 */
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function parseArgs() {
  return Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, ...rest] = arg.replace(/^--/, '').split('=')
      return [key, rest.join('=')]
    })
  )
}

async function main() {
  const { uid } = parseArgs()
  if (!uid) {
    console.error('Usage: npm run seed -- --uid=<DEMO_ACCOUNT_UID>')
    process.exit(1)
  }
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON key path.')
    process.exit(1)
  }

  if (!getApps().length) {
    initializeApp({ credential: applicationDefault() })
  }
  const db = getFirestore()
  const userRef = db.collection('users').doc(uid)

  const userSnap = await userRef.get()
  if (!userSnap.exists) {
    console.error(`No user profile found at users/${uid}. Register that account first, then re-run this script.`)
    process.exit(1)
  }

  const now = new Date()
  const iso = (d: Date) => d.toISOString()
  const daysAgo = (n: number) => iso(new Date(now.getTime() - n * 86400000))
  const daysFromNow = (n: number) => iso(new Date(now.getTime() + n * 86400000))

  const batch = db.batch()
  const add = (col: string, data: Record<string, unknown>) => {
    const ref = userRef.collection(col).doc()
    batch.set(ref, { ...data, createdAt: iso(now), updatedAt: iso(now) })
  }

  // Income
  add('income', { source: 'Salary', amount: 6500, date: daysAgo(3), frequency: 'monthly', notes: 'Monthly salary' })
  add('income', { source: 'Freelance design', amount: 850, date: daysAgo(10), frequency: 'one-off' })

  // Expenses
  const expenseSeed: Array<[string, number, string, number]> = [
    ['Food', 45, 'Groceries', 2],
    ['Food', 28, 'Dinner with friends', 5],
    ['Transport', 120, 'Petrol', 4],
    ['Housing', 1800, 'Rent', 1],
    ['Utilities', 210, 'Electricity + water', 6],
    ['Entertainment', 60, 'Cinema and snacks', 8],
    ['Shopping', 150, 'New shoes', 12],
    ['Healthcare', 90, 'Pharmacy', 15],
  ]
  expenseSeed.forEach(([category, amount, description, daysBack]) =>
    add('expenses', { category, amount, description, date: daysAgo(daysBack) })
  )

  // Bills
  add('bills', { name: 'Internet', amount: 129, dueDate: daysFromNow(5), frequency: 'monthly', status: 'upcoming', autoPayment: true })
  add('bills', { name: 'Credit card', amount: 450, dueDate: daysAgo(2), frequency: 'monthly', status: 'overdue', autoPayment: false })
  add('bills', { name: 'Car insurance', amount: 980, dueDate: daysFromNow(45), frequency: 'yearly', status: 'upcoming', autoPayment: false })

  // Subscriptions
  add('subscriptions', { service: 'Netflix', amount: 45, billingCycle: 'monthly', nextBillingDate: daysFromNow(9), category: 'Entertainment' })
  add('subscriptions', { service: 'Spotify', amount: 15, billingCycle: 'monthly', nextBillingDate: daysFromNow(3), category: 'Entertainment' })
  add('subscriptions', { service: 'iCloud+', amount: 12, billingCycle: 'yearly', nextBillingDate: daysFromNow(200), category: 'Utilities' })

  // Savings
  add('savings', { goal: 'Emergency fund', targetAmount: 20000, currentAmount: 8500, targetDate: daysFromNow(300) })
  add('savings', { goal: 'Japan trip', targetAmount: 6000, currentAmount: 2100, targetDate: daysFromNow(150) })

  // Tasks
  add('tasks', { task: 'Renew road tax', category: 'Vehicle', priority: 'High', dueDate: daysFromNow(20), status: 'Todo' })
  add('tasks', { task: 'File tax return', category: 'Finance', priority: 'Urgent', dueDate: daysFromNow(10), status: 'In Progress' })
  add('tasks', { task: 'Book dentist appointment', category: 'Personal', priority: 'Low', dueDate: daysFromNow(30), status: 'Todo' })

  // Vehicle
  add('vehicles', {
    vehicleName: 'Honda Civic',
    registrationNumber: 'WXY 1234',
    monthlyInstallment: 890,
    fuelCost: 350,
    insuranceExpiry: daysFromNow(45),
    roadTaxExpiry: daysFromNow(20),
    serviceDueDate: daysFromNow(60),
    mileage: 42500,
  })

  // Documents (no file attached — demo record only)
  add('documents', { documentName: 'Passport', category: 'Passport', expiryDate: daysFromNow(400) })
  add('documents', { documentName: 'Driving Licence', category: 'Driving Licence', expiryDate: daysFromNow(25) })

  await batch.commit()
  console.log(`✅ Seeded demo data for user ${uid}.`)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
