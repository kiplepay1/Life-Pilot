import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ToastProvider } from '@/components/Toast'
import { RequireApprovedUser, RequireAdmin, RedirectIfAuthed } from '@/components/RouteGuards'
import AppLayout from '@/layouts/AppLayout'

import Login from '@/pages/Login'
import Register from '@/pages/Register'
import PendingApproval from '@/pages/PendingApproval'
import Dashboard from '@/pages/Dashboard'
import AIAdvisor from '@/pages/AIAdvisor'
import Money from '@/pages/Money'
import Bills from '@/pages/Bills'
import Subscriptions from '@/pages/Subscriptions'
import Savings from '@/pages/Savings'
import LifeAdmin from '@/pages/LifeAdmin'
import Documents from '@/pages/Documents'
import Reports from '@/pages/Reports'
import Notifications from '@/pages/Notifications'
import Settings from '@/pages/Settings'
import Admin from '@/pages/Admin'
import NotFound from '@/pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<RedirectIfAuthed><Login /></RedirectIfAuthed>} />
            <Route path="/register" element={<RedirectIfAuthed><Register /></RedirectIfAuthed>} />
            <Route path="/pending-approval" element={<PendingApproval />} />

            <Route
              element={
                <RequireApprovedUser>
                  <AppLayout />
                </RequireApprovedUser>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/ai-advisor" element={<AIAdvisor />} />
              <Route path="/money" element={<Money />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/subscriptions" element={<Subscriptions />} />
              <Route path="/savings" element={<Savings />} />
              <Route path="/life-admin" element={<LifeAdmin />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              <Route
                path="/admin"
                element={
                  <RequireAdmin>
                    <Admin />
                  </RequireAdmin>
                }
              />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
