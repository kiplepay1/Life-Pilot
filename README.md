# LifePilot

**Your AI-powered personal life admin.**

LifePilot is a privacy-first personal management platform: money, bills,
subscriptions, savings, tasks, vehicles, documents, and an AI advisor —
all in one place, with a hard architectural guarantee that account
**administrators can manage access but can never see your personal data.**

This build runs entirely on Firebase's **free Spark plan** — no billing
account, no Cloud Functions, no paid AI API required.

---

## 1. Product overview

| Area | What it does |
|---|---|
| Dashboard | Monthly income/expenses, bills due, savings rate, subscriptions, tasks due, income vs. expense and spending-trend charts, category breakdown, an AI-style monthly insight |
| AI Advisor | Chat-style interface that answers from your own already-loaded data using local calculations — no external AI call, no API key, no cost |
| Money | Income and expense tracking by category |
| Bills | Recurring/one-off bills with auto-derived upcoming/overdue status |
| Subscriptions | Monthly/annual cost rollups, upcoming renewals |
| Savings | Goal tracking with progress bars |
| Life Admin | Tasks (priority/status) and vehicles (insurance/road tax/service alerts) |
| Documents | Expiry-tracked documents with optional file upload to Firebase Storage |
| Reports | Financial Health Score (0–100) with strengths/warnings/recommendations, report catalog |
| Notifications | In-app notification center |
| Settings | Profile, currency, password reset, privacy explanation |
| Admin Portal | Approve/reject/suspend/reactivate users — **account metadata only** |

---

## 2. Architecture

```
Browser (React SPA)
   │
   ├─ Firebase Auth (email/password)
   ├─ Firestore (direct reads/writes, gated by firestore.rules)
   └─ Firebase Storage (direct reads/writes, gated by storage.rules)
```

No Cloud Functions, no server component, no external AI API — everything
runs client-side against Firebase, which is why this fits entirely inside
the free Spark plan.

**The core privacy guarantee is enforced at the data layer, not the UI:**
`firestore.rules` gives a user's personal subcollections (`income`,
`expenses`, `bills`, `subscriptions`, `savings`, `transactions`, `tasks`,
`vehicles`, `documents`, `notifications`, `aiConversations`, `reports`)
**no admin access rule at all** — not "hidden from the admin UI", but
structurally unreachable by anyone except `request.auth.uid == uid`.
The admin's read/write access to `/users/{uid}` is separately restricted
to a fixed set of account-status fields (see `adminOnlyTouchesAccountFields()`
in `firestore.rules`).

### Why there's no Cloud Functions here

Firebase's free Spark plan does not allow Cloud Functions to run at all —
they require the pay-as-you-go **Blaze** plan (which has a large free
quota, but does require a card on file). Two features were originally
built around Cloud Functions and have been reworked to avoid needing them:

1. **Admin actions** (approve/reject/suspend/reactivate) now write
   directly to Firestore from the browser, permitted by a narrow rule
   (`adminOnlyTouchesAccountFields()`) that still only lets an admin touch
   status fields — never personal data.
2. **AI Advisor** now answers using `src/ai/localAdvisor.ts`, which
   calculates a real answer from your own already-loaded Firestore data
   (spending by category, upcoming bills, subscription cost, savings
   rate, etc.) instead of calling an external language model. It's more
   limited than a real LLM, but transparent about that, and it never
   invents numbers.

If you later want the real Gemini-backed advisor and Cloud-Function-based
admin actions, that version of this architecture is straightforward to
add back on top of Blaze — ask for it if you want the walkthrough.

---

## 3. Folder structure

```
lifepilot/
├── src/
│   ├── components/     Reusable UI: MetricCard, ChartCard, DataTable, Modal,
│   │                   ConfirmDialog, Toast, States (loading/empty/error),
│   │                   StatusBadge, CurrencyInput, FormField, RouteGuards
│   ├── layouts/         Sidebar, Topbar, AppLayout
│   ├── pages/            One file per route (Login, Register, Dashboard, …)
│   ├── contexts/         AuthContext (Firebase auth + profile + isAdmin field)
│   ├── services/         useCollection — generic per-user Firestore CRUD hook
│   ├── ai/               localAdvisor.ts — local, cost-free AI Advisor logic
│   ├── firebase/         config.ts (client SDK init)
│   ├── types/            Shared TypeScript types
│   ├── constants/        Nav items, category lists, chart colors
│   └── utils/            formatCurrency, formatDate, daysUntil, classNames
├── scripts/
│   └── seedDemoData.ts   Optional: seeds ONE explicitly-specified demo account
│                         (advanced/optional — requires Node + a service account,
│                         not part of the core no-terminal setup)
├── .github/workflows/deploy.yml   Builds and deploys automatically on push
├── firestore.rules
├── storage.rules
├── firebase.json
├── firestore.indexes.json
└── .env.example
```

---

## 4. Installation

```bash
git clone <your-repo-url> lifepilot
cd lifepilot
npm install
cp .env.example .env    # fill in your Firebase web app config (see §5)
```

> **Using GitHub + GitHub Actions instead of a local terminal?** Push this
> project to a GitHub repo, add your Firebase web config and a Firebase
> service account JSON as repository secrets, and `.github/workflows/deploy.yml`
> builds and deploys the app automatically on every push to `main` — no
> local `npm install` or `firebase deploy` needed. See §7 for exactly
> which secrets to add.

## 5. Firebase configuration

1. Create a project at https://console.firebase.google.com.
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → Create database (production mode).
4. **Storage** → Get started (production mode).
5. **Project settings** → General → "Your apps" → add a **Web app** →
   copy the config values into `.env` as `VITE_FIREBASE_*`.
6. Rename `.firebaserc.example` to `.firebaserc` and set your project ID:
   ```json
   { "projects": { "default": "your-firebase-project-id" } }
   ```

None of the above requires the Blaze plan or a billing account.

### Firestore & Storage rules

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

(Or let the GitHub Actions workflow do this for you on push — see §7.)

## 6. Admin setup (no Cloud Functions, no terminal required)

New accounts always start as `status: "pending"`. There's no in-app
button that grants admin — by design, since anything client-writable
could be abused. Instead:

1. Register a normal account in the app with the email you want as admin.
2. In the **Firebase Console** → Firestore Database → Data tab, browse to
   `users` → the document matching your new account's UID (you can find
   the UID under Authentication → Users).
3. Click the `isAdmin` field on that document and change its value from
   `false` to `true`. Save.
4. Sign out and back in on the site (or wait for your session to
   refresh) — you'll now see **Admin Portal** in the sidebar.

This works because edits made directly in the Firebase Console run with
your project-owner privileges and bypass `firestore.rules` entirely —
the rules only stop a normal *user* from setting this field on
themselves through the app.

## 7. Deploying via GitHub (no local terminal)

1. Push this project to a GitHub repository.
2. Repo → Settings → Secrets and variables → Actions → add one secret for
   each: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` (values
   from §5.5 above).
3. Firebase Console → Project Settings → Service Accounts → "Generate new
   private key" → downloads a JSON file. Add its entire contents as one
   more secret named `FIREBASE_SERVICE_ACCOUNT`, then delete the local
   copy of that file.
4. Push any commit to `main` — the "Build and Deploy LifePilot" workflow
   in `.github/workflows/deploy.yml` builds the app and deploys Hosting,
   Firestore rules, and Storage rules automatically. Watch it run under
   the repo's "Actions" tab.
5. Your app is live at `https://YOUR-PROJECT-ID.web.app`.

## 8. Local development

```bash
npm run dev              # Vite dev server on http://localhost:5173
```

Seed a demo account (optional, advanced — requires Node.js and a
downloaded service account key; not part of the core setup):

```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
  npm run seed -- --uid=<DEMO_ACCOUNT_UID>
```

## 9. Build & deploy manually (if you do have a terminal available)

```bash
npm run build                                   # tsc -b && vite build → dist/
firebase deploy --only hosting,firestore:rules,storage
```

---

## 10. Database structure

```
users/{uid}                          — account metadata ONLY (name, email,
                                        status, isAdmin, currency, timestamps).
                                        Admin can read this doc and write a
                                        fixed set of status fields.
users/{uid}/income/{id}               ─┐
users/{uid}/expenses/{id}              │
users/{uid}/bills/{id}                 │
users/{uid}/subscriptions/{id}         │ owner-only. No admin rule exists
users/{uid}/savings/{id}               │ for any of these, anywhere in
users/{uid}/transactions/{id}          │ firestore.rules.
users/{uid}/tasks/{id}                 │
users/{uid}/vehicles/{id}              │
users/{uid}/documents/{id}             │
users/{uid}/notifications/{id}         │
users/{uid}/aiConversations/{id}       │
users/{uid}/reports/{id}              ─┘
```

Storage mirrors this: `users/{uid}/documents/{fileName}`, owner-only.

---

## 11. Security model

Enforced in `firestore.rules` / `storage.rules`, not just hidden in the UI:

- **Isolation**: every personal read/write requires `request.auth.uid == uid`.
- **Admin boundary**: admin status is a plain `isAdmin` boolean field on a
  user's own `/users/{uid}` document. A normal user can never set this on
  themselves — the owner-update rule explicitly requires it to stay
  unchanged on any client-submitted write. The only way to set it is a
  direct edit in the Firebase Console (which runs with project-owner
  privileges and bypasses these rules by design), and even then it only
  unlocks a fixed field-set on `/users/{uid}` — never any subcollection.
- **No client-side trust for admin actions**: `Admin.tsx` writes only the
  fields `adminOnlyTouchesAccountFields()` permits; Firestore rejects
  anything else, even if the code tried to send it.
- **AI Advisor has nothing to leak**: since it's pure client-side
  calculation over data the browser already legitimately holds, there's
  no API key, server, or third-party data flow to secure in the first
  place.
- **Storage**: uploads are capped at 15MB and restricted to
  `image/*` / `application/pdf`; only the owning UID's path is readable or
  writable.

### Security review (see original prompt's checklist)

| # | Question | Result |
|---|---|---|
| 1 | Can User A read User B's expenses? | No — `firestore.rules` requires `request.auth.uid == uid` on every personal subcollection. |
| 2 | Can User A write User B's expenses? | No — same rule, `read, write` both scoped to owner. |
| 3 | Can a normal user make themselves admin? | No — the owner-update rule rejects any client-submitted change to `isAdmin`; it can only be set via a direct Firebase Console edit, which normal users don't have access to. |
| 4 | Can the admin read user financial data? | No — no admin rule exists for any personal subcollection. |
| 5 | Can the admin read AI conversations? | No — same as above; `aiConversations` has no admin rule either. |
| 6 | Can frontend JS access an AI provider's credentials? | N/A in this build — there is no external AI call to secure a key for. |
| 7 | Can an unauthenticated user access private pages? | No — `RequireApprovedUser`/`RequireAdmin` redirect to `/login`, and Firestore/Storage rules independently reject unauthenticated reads regardless of the UI. |
| 8 | Can a suspended user continue accessing protected functionality? | Partially mitigated: `RequireApprovedUser` blocks the UI on next profile load. Firestore rules do not currently re-check `status` on every personal-data read (see Known limitations) — a suspended user's already-open session could keep reading/writing their own data client-side until they're routed out or their token session ends. |
| 9 | Can the frontend spoof another UID? | No — every Firestore read/write is scoped through `useCollection`, which always uses the signed-in user's own UID from Firebase Auth, never a value from anywhere else. |
| 10 | Can Storage files be accessed by another user? | No — `storage.rules` scopes read/write/delete to `request.auth.uid == uid` on the file's own path. |
| 11 | Can a user manipulate another user's Firestore document? | No — same owner-only rule as #1/#2, plus `/users/{uid}` writes are further restricted by field-diffing (`adminOnlyTouchesAccountFields()`), so even the admin can't rewrite arbitrary profile fields. |

---

## 12. Troubleshooting

- **"Firebase config is missing" console warning** — copy `.env.example` to
  `.env` (or fill in the matching GitHub Secrets) with your Firebase web
  app config.
- **`permission-denied` in the console** — check that `firestore.rules` /
  `storage.rules` have actually been deployed, and that the account's
  `status` is `approved`.
- **Admin Portal not showing up** — the `isAdmin` field change only takes
  effect on your next profile load; sign out and back in after editing it
  in the Firebase Console.
- **GitHub Actions deploy fails on the first run** — occasionally Google
  Cloud needs the Firestore/Storage APIs explicitly enabled on a brand
  new project. If the Actions log mentions an API being disabled, search
  for that API's name in Google Cloud Console and click "Enable", then
  re-push.

---

## 13. Known limitations

- **Suspended-user session enforcement**: as noted in the security review
  (#8), a `firestore.rules`-level `status == 'approved'` gate on every
  personal-subcollection read/write was intentionally left out to avoid
  an extra `get()` read-cost on every single Firestore operation. Route
  guards handle this on next page load; a stricter version would add that
  check directly into `firestore.rules` for `income`, `expenses`, etc.
- **AI Advisor is calculation-based, not a real language model**: it
  matches your question against a set of known patterns (spending review,
  savings-rate check, bill lookup, etc.) and calculates a real answer
  from your own data, but it can't handle open-ended or novel questions
  the way an LLM would. Swapping in a real Gemini-backed advisor later
  requires Cloud Functions (Blaze plan) — see §2 "Why there's no Cloud
  Functions here."
- **Admin metrics (AI Requests / Active Users)**: not tracked in this
  build (no usage-logging pipeline), shown as "—" rather than a
  fabricated number.
- **No PDF/CSV export for Reports**: the Report Center computes and
  displays everything in-app only.
- **Notifications are not auto-generated**: the `notifications`
  subcollection and UI are fully wired up, but nothing currently writes
  to it automatically (that would normally be a scheduled Cloud
  Function, which isn't available on Spark).
- **Single currency display**: the schema and Settings page support
  per-user currency, but all figures for a given user are assumed to
  already be in that one currency — there's no multi-currency conversion.
- **Bundle size**: the production build is a single ~1.2MB JS chunk. Fine
  for a personal tool; for a public launch, route-level code-splitting
  (`React.lazy`) would bring this down.

---

## Technology stack

**Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, React Router
**Backend**: Firebase Authentication, Cloud Firestore, Firebase Storage — all on the free Spark plan
**Deployment**: Firebase Hosting, deployed automatically via GitHub Actions
