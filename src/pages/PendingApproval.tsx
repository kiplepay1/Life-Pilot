import { useAuth } from '@/contexts/AuthContext'
import { Clock, XCircle, ShieldOff, RefreshCw, LogOut } from 'lucide-react'
import AuthLayout from './AuthLayout'
import { useState } from 'react'

const statusContent: Record<string, { icon: any; title: string; body: string }> = {
  pending: {
    icon: Clock,
    title: 'Awaiting approval',
    body: 'Your account is awaiting administrator approval. You will be able to sign in as soon as it is reviewed.',
  },
  rejected: {
    icon: XCircle,
    title: 'Registration not approved',
    body: 'Your registration request was not approved. Please contact your administrator for more information.',
  },
  suspended: {
    icon: ShieldOff,
    title: 'Account suspended',
    body: 'Your account has been suspended. Please contact your administrator for more information.',
  },
}

export default function PendingApproval() {
  const { profile, logout, refreshProfile } = useAuth()
  const [checking, setChecking] = useState(false)
  const status = profile?.status ?? 'pending'
  const content = statusContent[status] ?? statusContent.pending
  const Icon = content.icon

  async function handleCheck() {
    setChecking(true)
    await refreshProfile()
    setChecking(false)
  }

  return (
    <AuthLayout title="LifePilot" subtitle="Your AI-powered personal life admin">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <Icon className="h-7 w-7 text-amber-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">{content.title}</h2>
        <p className="mt-2 text-sm text-slate-500">{content.body}</p>
        <div className="mt-6 flex w-full flex-col gap-2">
          <button onClick={handleCheck} disabled={checking} className="btn-secondary w-full">
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            Check status
          </button>
          <button onClick={logout} className="btn-secondary w-full">
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}
