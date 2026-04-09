import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AppShell from './components/AppShell'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Calculators from './pages/Calculators'
import Workflow from './pages/Workflow'
import Aggregator from './pages/Aggregator'
import AnomalyDetection from './pages/AnomalyDetection'
import BlockchainAudit from './pages/BlockchainAudit'
import ReportPublishing from './pages/ReportPublishing'
import AIReport from './pages/AIReport'
import DataIngestion from './pages/DataIngestion'
import ReportingFrameworks from './pages/ReportingFrameworks'
import UsersRoles from './pages/UsersRoles'
import OrgStructure from './pages/OrgStructure'
import EFLibrary from './pages/EFLibrary'
import GWPValues from './pages/GWPValues'
import { useAuth } from './auth/AuthContext'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

// Placeholder for routes that don't have a page yet
function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
      <div className="w-16 h-16 rounded-[var(--radius-xl)] bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
        <span className="text-2xl">🚧</span>
      </div>
      <h2 className="font-display text-[var(--text-2xl)] font-semibold text-[var(--text-primary)] mb-2">{title}</h2>
      <p className="text-[var(--text-sm)] text-[var(--text-tertiary)]">This module is being built. Coming soon.</p>
    </div>
  )
}

function AppRoutes() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  if (location.pathname === '/login') {
    if (isAuthenticated) return <Navigate to="/dashboard" replace />
    return <Login />
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Core Modules */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/calculators" element={<ProtectedRoute><Calculators /></ProtectedRoute>} />
        <Route path="/calculators/:moduleId" element={<ProtectedRoute><Placeholder title="Calculator Module" /></ProtectedRoute>} />
        <Route path="/questionnaires" element={<ProtectedRoute><ReportingFrameworks /></ProtectedRoute>} />

        {/* Data ingestion — landing with module cards, internal routing handled by DataIngestion */}
        <Route path="/data" element={<ProtectedRoute><DataIngestion /></ProtectedRoute>} />
        <Route path="/data/*" element={<ProtectedRoute><DataIngestion /></ProtectedRoute>} />

        <Route path="/workflow" element={<ProtectedRoute><Workflow /></ProtectedRoute>} />
        <Route path="/aggregator" element={<ProtectedRoute><Aggregator /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportPublishing /></ProtectedRoute>} />
        <Route path="/reports/ai" element={<ProtectedRoute><AIReport /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnomalyDetection /></ProtectedRoute>} />

        {/* Organisation */}
        <Route path="/admin/org" element={<ProtectedRoute><OrgStructure /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><UsersRoles /></ProtectedRoute>} />

        {/* Reference Data */}
        <Route path="/admin/ef-library" element={<ProtectedRoute><EFLibrary /></ProtectedRoute>} />
        <Route path="/admin/gwp" element={<ProtectedRoute><GWPValues /></ProtectedRoute>} />

        {/* System */}
        <Route path="/admin/audit" element={<ProtectedRoute><BlockchainAudit /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Placeholder title="Settings" /></ProtectedRoute>} />

        {/* Legacy redirects */}
        <Route path="/carbon" element={<Navigate to="/calculators" replace />} />
        <Route path="/calculator" element={<Navigate to="/calculators" replace />} />
        <Route path="/calculator/results" element={<Navigate to="/calculators" replace />} />
        <Route path="/data/upload" element={<Navigate to="/data" replace />} />
        <Route path="/collect/entities" element={<Navigate to="/data" replace />} />
        <Route path="/collect/suppliers" element={<Navigate to="/data" replace />} />
        <Route path="/frameworks" element={<Navigate to="/questionnaires" replace />} />
        <Route path="/frameworks/status" element={<Navigate to="/reports" replace />} />
        <Route path="/analytics/assurance" element={<Navigate to="/analytics" replace />} />
        <Route path="/analytics/audit" element={<Navigate to="/admin/audit" replace />} />
        <Route path="/reporting" element={<Navigate to="/reports" replace />} />
        <Route path="/ai-report" element={<Navigate to="/reports/ai" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
