import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AppShell from './components/AppShell'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Calculators from './pages/Calculators'
import Workflow from './pages/Workflow'
import Aggregator from './pages/Aggregator'
import AnomalyDetection from './pages/AnomalyDetection'
import Analytics from './pages/Analytics'
import BlockchainAudit from './pages/BlockchainAudit'
import ReportPublishing from './pages/ReportPublishing'
import ReportPreview from './pages/ReportPreview'
import SustainabilityPerformanceReport from './pages/SustainabilityPerformanceReport'
import AuditorView from './pages/AuditorView'
import AIReport from './pages/AIReport'
import DataIngestion from './pages/DataIngestion'
import DataEntry from './pages/DataEntry'
import WorkflowQueue from './pages/WorkflowQueue'
import UsersRoles from './pages/UsersRoles'
import OrgStructure from './pages/OrgStructure'
import EFLibrary from './pages/EFLibrary'
import GWPValues from './pages/GWPValues'
import Settings from './pages/Settings'
import MyTasks from './pages/MyTasks'
import AssignmentManager from './pages/AssignmentManager'
import OrgOnboarding from './pages/OrgOnboarding'
import GroupRollup from './pages/GroupRollup'
import Materiality from './pages/Materiality'
import ReportingPeriods from './pages/ReportingPeriods'
import ContentIndex from './pages/ContentIndex'
import DataStandard from './pages/DataStandard'
import VerifyReport from './pages/VerifyReport'
import AuditorUpload from './pages/AuditorUpload'
import { useAuth } from './auth/AuthContext'
import { homeRouteFor } from './lib/rbac'
import ErrorBoundary from './components/ErrorBoundary'

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
  const { isAuthenticated, user } = useAuth()
  const home = homeRouteFor(user)

  if (location.pathname === '/login') {
    if (isAuthenticated) return <Navigate to={home} replace />
    return <Login />
  }

  // Public verification — anyone with a report's token can check its authenticity.
  // Public auditor upload — one-shot token-authenticated.
  // Neither enters the authed AppShell.
  if (location.pathname.startsWith('/verify/')) {
    return (
      <Routes>
        <Route path="/verify/:token" element={<VerifyReport />} />
      </Routes>
    )
  }
  if (location.pathname.startsWith('/assure/')) {
    return (
      <Routes>
        <Route path="/assure/:token" element={<AuditorUpload />} />
      </Routes>
    )
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to={home} replace />} />

        {/* Core Modules */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />

        {/* Legacy — kept for deep links, surfaced only for admin paths */}
        <Route path="/calculators" element={<ProtectedRoute><Calculators /></ProtectedRoute>} />
        <Route path="/calculators/:moduleId" element={<ProtectedRoute><Placeholder title="Calculator Module" /></ProtectedRoute>} />
        <Route path="/questionnaires" element={<Navigate to="/reports" replace />} />

        {/* Data collection — redirect legacy picker/entry to My Tasks (canonical flow) */}
        <Route path="/data/entry" element={<Navigate to="/my-tasks" replace />} />
        <Route path="/data/entry/:questionId" element={<ProtectedRoute><DataEntry /></ProtectedRoute>} />
        <Route path="/data" element={<ProtectedRoute><DataIngestion /></ProtectedRoute>} />
        <Route path="/data/*" element={<ProtectedRoute><DataIngestion /></ProtectedRoute>} />

        <Route path="/workflow" element={<ProtectedRoute><Workflow /></ProtectedRoute>} />
        <Route path="/workflow/review" element={<ProtectedRoute><WorkflowQueue kind="review" /></ProtectedRoute>} />
        <Route path="/workflow/approval" element={<ProtectedRoute><WorkflowQueue kind="approval" /></ProtectedRoute>} />
        <Route path="/aggregator/legacy" element={<ProtectedRoute><Aggregator /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><ReportPublishing /></ProtectedRoute>} />
        <Route path="/reports/performance" element={<ProtectedRoute><SustainabilityPerformanceReport /></ProtectedRoute>} />
        <Route path="/reports/preview" element={<ProtectedRoute><ReportPreview /></ProtectedRoute>} />
        <Route path="/reports/auditor" element={<ProtectedRoute><AuditorView /></ProtectedRoute>} />
        <Route path="/reports/ai" element={<ProtectedRoute><AIReport /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/analytics/anomalies" element={<ProtectedRoute><AnomalyDetection /></ProtectedRoute>} />

        {/* Organisation — onboarding is canonical; legacy /admin/org redirects there */}
        <Route path="/admin/org" element={<Navigate to="/onboarding" replace />} />
        <Route path="/admin/users" element={<ProtectedRoute><UsersRoles /></ProtectedRoute>} />
        <Route path="/admin/assignments" element={<ProtectedRoute><AssignmentManager /></ProtectedRoute>} />
        <Route path="/admin/materiality" element={<ProtectedRoute><Materiality /></ProtectedRoute>} />
        <Route path="/admin/periods" element={<ProtectedRoute><ReportingPeriods /></ProtectedRoute>} />
        <Route path="/reports/index" element={<ProtectedRoute><ContentIndex /></ProtectedRoute>} />
        <Route path="/onboarding" element={<ProtectedRoute><OrgOnboarding /></ProtectedRoute>} />
        <Route path="/admin/org/legacy" element={<ProtectedRoute><OrgStructure /></ProtectedRoute>} />
        <Route path="/aggregator" element={<ProtectedRoute><GroupRollup /></ProtectedRoute>} />

        {/* Reference Data */}
        <Route path="/admin/ef-library" element={<ProtectedRoute><EFLibrary /></ProtectedRoute>} />
        <Route path="/admin/gwp" element={<ProtectedRoute><GWPValues /></ProtectedRoute>} />
        <Route path="/data/standard" element={<ProtectedRoute><DataStandard /></ProtectedRoute>} />

        {/* System */}
        <Route path="/admin/audit" element={<ProtectedRoute><BlockchainAudit /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

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
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
