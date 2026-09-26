# Platz Budget

**Personal finance + GrabCar weekend driver intelligence.**

Platz Budget evolved from the LifePilot codebase — same Firebase Auth,
approval workflow, admin portal, and Firestore security model, now
purpose-built around your salary, fixed commitments, Grab driving, and
net worth, instead of generic personal life admin.

Runs entirely on Firebase's **free Spark plan** — no billing account, no
Cloud Functions, no Firebase Storage, no paid AI API required.

---

## 1. What's in it

| Area | What it does |
|---|---|
| Dashboard | One Monthly Balance figure (Income − Commitments − Expenses, plus Grab net), Commitment Status progress, Grab snapshot, Net Worth, 6-month net trend |
| Money | Day-to-day variable income and expense tracking by category |
| Commitments | **Unified** — every recurring monthly obligation (loans, subscriptions, insurance, utilities...) in one simple list. Amount is editable any month; "paid" status auto-resets each new month |
| Savings | Goals, what-if scenarios by Grab-gross assumption, and a toggleable Future Rental Scenario |
| **Grab Driver** | New module — Performance hub, fast session entry, history, Saturday-vs-Sunday analytics, area/long-ride analytics, manual demand log, fuel wallet, target planner |
| **Assets** | Property, vehicles, investments, cash — feeds Net Worth |
| **Liabilities** | Loans and financing — feeds Net Worth |
| Life Admin | Tasks and vehicles |
| Documents | Expiry-tracked document records (no file attachments — see below) |
| Reports | Financial Health Score, Monthly Grab Report, report catalog |
| Notifications, Settings, Admin Portal | Unchanged from LifePilot, with a new Financial Settings section in Settings |

---

## 2. What's unchanged from LifePilot (by design)

Per the brief, the entire authentication/security architecture is
untouched:

- Firebase Auth (email/password), registration, pending-approval flow
- `RequireApprovedUser`, `RequireAdmin`, `RedirectIfAuthed` route guards
- Admin status as a plain `isAdmin` Firestore field (no custom claims,
  no Cloud Functions) — set by hand in the Firebase Console
- The privacy guarantee: every personal collection is owner-only in
  `firestore.rules`, with **no admin access rule at all** for any of
  them — including the new `grabSessions`, `grabTrips`,
  `demandObservations`, `fuelLogs`, `assets`, `liabilities`, and
  `settings` collections added for Platz Budget
- Financial settings (salary, Grab targets, future-scenario config)
  live in `/users/{uid}/settings/financial` — a subcollection with no
  admin rule — rather than on the admin-readable `/users/{uid}` profile
  doc, so even your configured numbers stay fully private

## 3. Why no Cloud Functions, Storage, or paid AI

Same reasoning as the LifePilot build this evolved from:

- **Cloud Functions** require the paid Blaze plan. Admin
  approve/reject/suspend/reactivate write directly to Firestore from
  the browser instead, permitted by a narrow rule
  (`adminOnlyTouchesAccountFields()`).
- **Firebase Storage** now requires Blaze even for $0 usage, so
  Documents tracks records (name/category/expiry/notes) without file
  uploads.
- There is no AI Advisor in this build — removed for simplicity per
  request; the Dashboard, Commitments, and Grab pages do all the
  calculation work directly, with no external AI call either way.

---

## 4. New Firestore collections

```
users/{uid}/grabSessions/{id}        — one entry per driving session
users/{uid}/grabTrips/{id}           — individual trips (area & long-ride analytics)
users/{uid}/demandObservations/{id}  — manual "Live Demand" notes only, never scraped
users/{uid}/fuelLogs/{id}            — fuel spending beyond the Shell allowance
users/{uid}/assets/{id}
users/{uid}/liabilities/{id}
users/{uid}/settings/financial       — single doc: salary, Grab target, future scenario
```

All owner-only, same pattern as every existing LifePilot collection —
see `firestore.rules`.

## 5. Grab Driver module

- **New Session** (`/grab/session`) — fast mobile entry: Date, Start,
  End, Trips, KM, Gross are the only required fields; Fuel, Toll,
  Parking, Bonus, Tips, Driving hours and Notes are tucked behind an
  "Advanced" toggle. Online hours and day type (Saturday/Sunday) are
  computed automatically from your start/end time and date.
- **Performance** (`/grab`) — current-month target progress bar,
  remaining amount, required RM per remaining planned session, and
  core KPIs.
- **History** (`/grab/history`) — every session, with RM/hour computed
  per row.
- **Sat vs Sun** (`/grab/analytics`) — side-by-side averages plus an
  RM/hour trend line across all logged sessions.
- **Areas & Demand** (`/grab/areas`) — three tabs: Area Analytics
  (aggregated by pickup area from logged trips), Long Rides (filterable
  at 20/30/40/50km+), and Live Demand (manual observations, always
  labelled as such — never scraped, never automated).
- **Fuel Wallet** (`/grab/fuel`) — your Shell allowance vs. fuel logged
  on sessions plus any extra fuel spending once it's exhausted.
- **Targets** (`/grab/targets`) — configure your monthly target,
  planned Saturdays/Sundays, hours per session, and maintenance
  reserve %; shows the resulting per-week/per-Saturday/per-Sunday/
  per-hour breakdown.

All formulas match the brief:
`Net Income = Gross + Tips + Bonus − Fuel − Toll − Parking − Other`,
`RM/hour = Net Income / Online Hours`, `RM/km = Net Income / Total KM`,
`RM/trip = Gross / Trips`, `Trips/hour = Trips / Online Hours` — see
`src/utils/grab.ts`.

---

## 6. Installation

```bash
git clone <your-repo-url> platz-budget
cd platz-budget
npm install
cp .env.example .env    # fill in your Firebase web app config
```

> **No local terminal?** Push to GitHub, add the 5 `VITE_FIREBASE_*`
> secrets plus `FIREBASE_SERVICE_ACCOUNT` as repository secrets, and
> `.github/workflows/deploy.yml` builds and deploys automatically on
> push to `main`.

## 7. Firebase configuration

1. Create a project at console.firebase.google.com.
2. Authentication → Sign-in method → enable Email/Password.
3. Firestore Database → Create database (**production mode** — this is
   a security setting, not a paid tier).
4. Project settings → General → "Your apps" → add a Web app → copy the
   config into `.env` as `VITE_FIREBASE_*`.
5. Deploy rules: `firebase deploy --only firestore:rules,firestore:indexes`
   (or let GitHub Actions do it — see `.github/workflows/deploy.yml`).

## 8. Admin & first-time setup

Same as LifePilot: register an account, then in Firebase Console →
Firestore Database → Data → `users/{your-uid}`, set `isAdmin` to
`true` and `status` to `approved` by hand, then sign out and back in.

After that, set your real numbers in **Settings** (salary, Shell
allowance) and **Grab Targets** (`/grab/targets` — monthly target,
planned sessions, maintenance reserve) — these replace what would
otherwise be hardcoded defaults.

## 9. Local development / build

```bash
npm run dev              # http://localhost:5173
npm run build             # tsc -b && vite build → dist/
```

---

## 10. Security review

| # | Question | Result |
|---|---|---|
| Can User A read User B's Grab sessions / assets / liabilities? | No — every new collection follows the same `request.auth.uid == uid` owner-only rule as the original LifePilot collections. |
| Can the admin read Grab sessions, financial settings, or net worth data? | No — no admin rule exists for `grabSessions`, `grabTrips`, `demandObservations`, `fuelLogs`, `assets`, `liabilities`, or `settings`. |
| Can a user set `isAdmin` on themselves? | No — the owner-update rule rejects any client-submitted change to it; only a direct Firebase Console edit can. |
| Is "Live Demand" ever scraped or automated? | No — `demandObservations` is manual-entry only, by design, and the UI always labels it "manual demand observation". |

---

## 11. Known limitations

- **Commitments total assumed constant across the 6-month trend chart**
  — the Dashboard's trend chart applies your *current* total monthly
  commitments to every past month shown, since individual commitment
  amounts aren't tracked historically (each commitment just has one
  current `amount`, editable any time).
- **Net Worth is a live snapshot, not a history** — Assets and
  Liabilities are point-in-time; there's no month-by-month net-worth
  tracking yet.
- **Demo seed script covers Commitments but not yet Grab/Assets/
  Liabilities data** — `scripts/seedDemoData.ts` seeds income,
  expenses, commitments, savings, tasks and a vehicle; Grab sessions,
  assets and liabilities aren't included yet.
- No AI Advisor (removed by request), no file attachments (Storage
  requires Blaze), no PDF/CSV export, no auto-generated notifications.

---

## Technology stack

**Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, React Router
**Backend**: Firebase Authentication, Cloud Firestore — free Spark plan
**Deployment**: Firebase Hosting, via GitHub Actions
