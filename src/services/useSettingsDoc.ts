import { useEffect, useState, useCallback } from 'react'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Real-time hook for a single document at
 * /users/{uid}/settings/{docId} — used for Financial Settings. Falls
 * back to `defaults` until the user has saved anything, and merges on
 * save so partial updates never wipe out other fields.
 */
export function useSettingsDoc<T extends Record<string, any>>(docId: string, defaults: T) {
  const { firebaseUser } = useAuth()
  const [data, setData] = useState<T>(defaults)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!firebaseUser) {
      setData(defaults)
      setLoading(false)
      return
    }
    setLoading(true)
    const ref = doc(db, 'users', firebaseUser.uid, 'settings', docId)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setData({ ...defaults, ...(snap.data() as T) })
          setLoaded(true)
        } else {
          setData(defaults)
          setLoaded(false)
        }
        setLoading(false)
      },
      () => setLoading(false)
    )
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.uid, docId])

  const save = useCallback(
    async (patch: Partial<T>) => {
      if (!firebaseUser) throw new Error('Not authenticated')
      const ref = doc(db, 'users', firebaseUser.uid, 'settings', docId)
      await setDoc(ref, { ...patch, updatedAt: new Date().toISOString() }, { merge: true })
    },
    [firebaseUser, docId]
  )

  return { data, loading, loaded, save }
}
