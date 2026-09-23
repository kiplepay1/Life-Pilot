import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase/config'
import type { UserProfile } from '@/types'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  profile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  register: (fullName: string, email: string, password: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadProfile(user: FirebaseUser) {
    const ref = doc(db, 'users', user.uid)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const data = snap.data() as UserProfile
      setProfile(data)
      // Admin status is a plain Firestore field on the user's own
      // profile doc (see firestore.rules) — set by hand in the
      // Firebase Console, not a Firebase Auth custom claim. This is
      // what makes admin access possible on the free Spark plan with
      // no Cloud Functions involved.
      setIsAdmin(data.isAdmin === true)
    } else {
      setProfile(null)
      setIsAdmin(false)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (user) {
        await loadProfile(user)
        // Best-effort last-login stamp; not security sensitive.
        updateDoc(doc(db, 'users', user.uid), { lastLoginAt: new Date().toISOString() }).catch(
          () => undefined
        )
      } else {
        setProfile(null)
        setIsAdmin(false)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function register(fullName: string, email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName: fullName })

    const newProfile: UserProfile = {
      uid: cred.user.uid,
      fullName,
      email,
      currency: 'MYR',
      status: 'pending',
      isAdmin: false,
      createdAt: new Date().toISOString(),
    }
    await setDoc(doc(db, 'users', cred.user.uid), newProfile)
    setProfile(newProfile)
  }

  async function login(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await loadProfile(cred.user)
  }

  async function logout() {
    await firebaseSignOut(auth)
  }

  async function refreshProfile() {
    if (firebaseUser) await loadProfile(firebaseUser)
  }

  return (
    <AuthContext.Provider
      value={{ firebaseUser, profile, loading, isAdmin, register, login, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
