import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { LoadingState } from './States'

/**
 * Gates access to the main app. Mirrors (but does not replace) the
 * backend enforcement: Firestore rules independently check
 * status == 'approved' on any operation that matters, and Cloud
 * Functions re-verify status server-side before doing privileged work.
 * This component just keeps unapproved users out of the UI.
 */
export function RequireApprovedUser({ children }: { children: ReactNode }) {
  const { firebaseUser, profile, loading } = useAuth()

  if (loading) return <LoadingState label="Checking your account…" />
  if (!firebaseUser) return <Navigate to="/login" replace />
  if (!profile) return <LoadingState label="Loading your profile…" />

  if (profile.status === 'pending') return <Navigate to="/pending-approval" replace />
  if (profile.status === 'rejected' || profile.status === 'suspended') {
    return <Navigate to="/pending-approval" replace />
  }

  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { firebaseUser, isAdmin, loading } = useAuth()

  if (loading) return <LoadingState label="Checking permissions…" />
  if (!firebaseUser) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}

export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { firebaseUser, loading } = useAuth()
  if (loading) return <LoadingState />
  if (firebaseUser) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
