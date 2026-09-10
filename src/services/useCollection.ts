import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Generic real-time CRUD hook scoped to the current user's own
 * subcollection at /users/{uid}/{collectionName}. Firestore rules are
 * what actually enforce that a user can never read another UID's data —
 * this hook simply never constructs a path with any UID but the
 * authenticated user's own, so there is nothing here to spoof.
 */
export function useCollection<T extends { id: string }>(collectionName: string, sortField = 'createdAt') {
  const { firebaseUser } = useAuth()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!firebaseUser) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    const ref = collection(db, 'users', firebaseUser.uid, collectionName)
    const q = query(ref, orderBy(sortField, 'desc'))
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)
        setData(rows)
        setLoading(false)
        setError(null)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.uid, collectionName])

  const add = useCallback(
    async (item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!firebaseUser) throw new Error('Not authenticated')
      const now = new Date().toISOString()
      const ref = collection(db, 'users', firebaseUser.uid, collectionName)
      await addDoc(ref, { ...item, createdAt: now, updatedAt: now })
    },
    [firebaseUser, collectionName]
  )

  const update = useCallback(
    async (id: string, patch: Partial<T>) => {
      if (!firebaseUser) throw new Error('Not authenticated')
      const ref = doc(db, 'users', firebaseUser.uid, collectionName, id)
      await updateDoc(ref, { ...patch, updatedAt: new Date().toISOString() })
    },
    [firebaseUser, collectionName]
  )

  const remove = useCallback(
    async (id: string) => {
      if (!firebaseUser) throw new Error('Not authenticated')
      const ref = doc(db, 'users', firebaseUser.uid, collectionName, id)
      await deleteDoc(ref)
    },
    [firebaseUser, collectionName]
  )

  return { data, loading, error, add, update, remove }
}
