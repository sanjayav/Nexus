import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import UIAppShell from './components/UIAppShell'
import Login from './pages/Login'
import { useAuth } from './auth/AuthContext'

// Route-level code splitting keeps first load small on slow or high-latency
// networks (notably cross-border links into mainland China).
const ModulesLanding = lazy(() => import('./pages/ModulesLanding'))
const ModuleHub = lazy(() => import('./pages/ModuleHub'))
const Questionnaire = lazy(() => import('./pages/QuestionnaireNew'))
const ModuleReview = lazy(() => import('./pages/ModuleReview'))
const ReportBuilder = lazy(() => import('./pages/ReportBuilder'))
const ExecutiveOverview = lazy(() => import('./pages/ExecutiveOverview'))
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'))
const GapAnalyticsDashboard = lazy(() => import('./pages/GapAnalyticsDashboard'))
const BenchmarkLab = lazy(() => import('./pages/BenchmarkLab'))
const VerificationCenter = lazy(() => import('./pages/VerificationCenter'))
const EvidenceLibrary = lazy(() => import('./pages/EvidenceLibrary'))
const AnchorsEvents = lazy(() => import('./pages/AnchorsEvents'))
const AdminSettings = lazy(() => import('./pages/AdminSettings'))
const IntegrityTimeline = lazy(() => import('./pages/IntegrityTimeline'))
const GHGTargets = lazy(() => import('./pages/GHGTargets'))
const RolesCredentials = lazy(() => import('./pages/RolesCredentials'))
const Workbench = lazy(() => import('./pages/Workbench'))
const OrganizationSetup = lazy(() => import('./pages/OrganizationSetup'))
const PeriodCreate = lazy(() => import('./pages/PeriodCreate'))
const SettingsAnalytics = lazy(() => import('./pages/SettingsAnalytics'))
const IAMCenter = lazy(() => import('./pages/IAMCenter'))
const DataConnectors = lazy(() => import('./pages/DataConnectors'))
const DoubleMateriality = lazy(() => import('./pages/DoubleMateriality'))
const CarbonAccounting = lazy(() => import('./pages/CarbonAccounting'))
const PortfolioManagement = lazy(() => import('./pages/PortfolioManagement'))
const TaskInbox = lazy(() => import('./pages/TaskInbox'))
const Scope3Calculator = lazy(() => import('./pages/Scope3Calculator'))
const WorkflowConfig = lazy(() => import('./pages/WorkflowConfig'))
const AIStudio = lazy(() => import('./pages/AIStudio'))

const ROUTES: [path: string, Page: React.ComponentType][] = [
  ['/executive', ExecutiveOverview],
  ['/frameworks', ModulesLanding],
  ['/modules', ModulesLanding],
  ['/modules/:moduleId', ModuleHub],
  ['/modules/:moduleId/questionnaire', Questionnaire],
  ['/modules/:moduleId/review', ModuleReview],
  ['/reports/:periodId/build', ReportBuilder],
  ['/publish', ReportBuilder],
  ['/workbench', Workbench],
  ['/analytics', AnalyticsDashboard],
  ['/analytics/gaps', GapAnalyticsDashboard],
  ['/analytics/benchmark', BenchmarkLab],
  ['/tasks', TaskInbox],
  ['/evidence', EvidenceLibrary],
  ['/verify', VerificationCenter],
  ['/events', AnchorsEvents],
  ['/admin', AdminSettings],
  ['/admin/organization', OrganizationSetup],
  ['/period/create', PeriodCreate],
  ['/timeline', IntegrityTimeline],
  ['/ghg', GHGTargets],
  ['/roles', RolesCredentials],
  ['/settings/analytics', SettingsAnalytics],
  ['/iam', IAMCenter],
  ['/connectors', DataConnectors],
  ['/dma', DoubleMateriality],
  ['/carbon', CarbonAccounting],
  ['/portfolio', PortfolioManagement],
  ['/scope3', Scope3Calculator],
  ['/workflow', WorkflowConfig],
  ['/ai', AIStudio],
]

function PageFallback() {
  return (
    <div className="space-y-4 animate-fade-in" aria-busy="true">
      <div className="h-8 w-56 rounded-lg bg-zinc-200/70 animate-pulse" />
      <div className="h-4 w-80 rounded bg-zinc-200/50 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-32 rounded-card bg-white border border-line animate-pulse" />
        ))}
      </div>
    </div>
  )
}

function AppShell() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  if (location.pathname === '/login') {
    return isAuthenticated ? <Navigate to="/" replace /> : <Login />
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <UIAppShell>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/executive" replace />} />
          {ROUTES.map(([path, Page]) => (
            <Route key={path} path={path} element={<Page />} />
          ))}
          <Route path="*" element={<Navigate to="/executive" replace />} />
        </Routes>
      </Suspense>
    </UIAppShell>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
