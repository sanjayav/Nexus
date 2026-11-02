import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/features/auth/LoginPage'
import { useAuth } from '@/features/auth/AuthContext'
import { RequireAccess } from '@/features/access/RequireAccess'
import { HOME_PATH } from '@/features/access/model'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { ROUTES } from './routes'

const AcceptInvitePage = lazy(() => import('@/features/access/AcceptInvitePage'))

function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-8 w-56 rounded-lg bg-zinc-200/70 animate-pulse" />
      <div className="h-4 w-80 max-w-full rounded bg-zinc-200/50 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-card bg-white border border-line animate-pulse" />
        ))}
      </div>
    </div>
  )
}

function AuthenticatedApp() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  // Invitation links work whether or not someone is signed in on this device.
  if (location.pathname.startsWith('/invite/'))
    return (
      <RouteErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/invite/:token" element={<AcceptInvitePage />} />
          </Routes>
        </Suspense>
      </RouteErrorBoundary>
    )
  if (location.pathname === '/login') return isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <AppShell>
      <RouteErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to={HOME_PATH} replace />} />
            {ROUTES.map(([path, Page]) => (
              <Route
                key={path}
                path={path}
                element={
                  <RequireAccess>
                    <Page />
                  </RequireAccess>
                }
              />
            ))}
            <Route path="*" element={<Navigate to={HOME_PATH} replace />} />
          </Routes>
        </Suspense>
      </RouteErrorBoundary>
    </AppShell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthenticatedApp />
    </BrowserRouter>
  )
}
