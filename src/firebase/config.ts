import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// All values below come from Vite env vars (VITE_*), which are safe to
// expose in client bundles — they identify the Firebase project but grant
// no access by themselves. Actual data protection is enforced by
// firestore.rules.
//
// Note: Firebase Storage is intentionally NOT initialized here. As of
// late 2024, creating a Storage bucket requires the paid Blaze plan even
// for $0 actual usage, so this build stays on the free Spark plan and
// the Documents feature tracks records without file uploads. See
// README "Why there's no Firebase Storage here" if you want to add it
// back later on Blaze.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Platz Budget] Firebase config is missing. Copy .env.example to .env and fill in your Firebase project values.'
  )
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
