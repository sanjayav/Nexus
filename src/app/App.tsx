import { Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/features/auth/LoginPage'
import { useAuth } from '@/features/auth/AuthContext'
import { ROUTES } from './routes'

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

  if (location.pathname === '/login') return isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/executive" replace />} />
          {ROUTES.map(([path, Page]) => (
            <Route key={path} path={path} element={<Page />} />
          ))}
          <Route path="*" element={<Navigate to="/executive" replace />} />
        </Routes>
      </Suspense>
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
