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
import Assets from '@/pages/Assets'
import Liabilities from '@/pages/Liabilities'
import GrabHub from '@/pages/grab/GrabHub'
import GrabSessionForm from '@/pages/grab/GrabSessionForm'
import GrabHistory from '@/pages/grab/GrabHistory'
import GrabAnalytics from '@/pages/grab/GrabAnalytics'
import GrabAreas from '@/pages/grab/GrabAreas'
import GrabFuel from '@/pages/grab/GrabFuel'
import GrabTargets from '@/pages/grab/GrabTargets'
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
              <Route path="/grab" element={<GrabHub />} />
              <Route path="/grab/session" element={<GrabSessionForm />} />
              <Route path="/grab/history" element={<GrabHistory />} />
              <Route path="/grab/analytics" element={<GrabAnalytics />} />
              <Route path="/grab/areas" element={<GrabAreas />} />
              <Route path="/grab/fuel" element={<GrabFuel />} />
              <Route path="/grab/targets" element={<GrabTargets />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/liabilities" element={<Liabilities />} />
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
