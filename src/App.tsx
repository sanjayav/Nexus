import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import UIAppShell from './components/UIAppShell'
import ModulesLanding from './pages/ModulesLanding'
import ModuleHub from './pages/ModuleHub'
import Questionnaire from './pages/QuestionnaireNew'
import ModuleReview from './pages/ModuleReview'
import ReportBuilder from './pages/ReportBuilder'
import ExecutiveOverview from './pages/ExecutiveOverview'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import GapAnalyticsDashboard from './pages/GapAnalyticsDashboard'
import BenchmarkLab from './pages/BenchmarkLab'
import VerificationCenter from './pages/VerificationCenter'
import EvidenceLibrary from './pages/EvidenceLibrary'
import AnchorsEvents from './pages/AnchorsEvents'
import AdminSettings from './pages/AdminSettings'
import IntegrityTimeline from './pages/IntegrityTimeline'
import GHGTargets from './pages/GHGTargets'
import RolesCredentials from './pages/RolesCredentials'
import Workbench from './pages/Workbench'
import OrganizationSetup from './pages/OrganizationSetup'
import PeriodCreate from './pages/PeriodCreate'
import SettingsAnalytics from './pages/SettingsAnalytics'
import IAMCenter from './pages/IAMCenter'
import DataConnectors from './pages/DataConnectors'
import DoubleMateriality from './pages/DoubleMateriality'
import CarbonAccounting from './pages/CarbonAccounting'
import PortfolioManagement from './pages/PortfolioManagement'
import TaskInbox from './pages/TaskInbox'
import Scope3Calculator from './pages/Scope3Calculator'
import WorkflowConfig from './pages/WorkflowConfig'
import AIStudio from './pages/AIStudio'
import Login from './pages/Login'
import { useAuth } from './auth/AuthContext'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AppShell() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const isLogin = location.pathname === '/login'

  if (isLogin) {
    if (isAuthenticated) {
      return <Navigate to="/" replace />
    }
    return <Login />
  }

  return (
    <UIAppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/executive" replace />} />

        {/* Module routes */}
        <Route
          path="/frameworks"
          element={
            <ProtectedRoute>
              <ModulesLanding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/modules"
          element={
            <ProtectedRoute>
              <ModulesLanding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/modules/:moduleId"
          element={
            <ProtectedRoute>
              <ModuleHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/modules/:moduleId/questionnaire"
          element={
            <ProtectedRoute>
              <Questionnaire />
            </ProtectedRoute>
          }
        />
        <Route
          path="/modules/:moduleId/review"
          element={
            <ProtectedRoute>
              <ModuleReview />
            </ProtectedRoute>
          }
        />

        {/* Report builder */}
        <Route
          path="/reports/:periodId/build"
          element={
            <ProtectedRoute>
              <ReportBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/publish"
          element={
            <ProtectedRoute>
              <ReportBuilder />
            </ProtectedRoute>
          }
        />

        {/* Dashboard routes */}
        <Route
          path="/workbench"
          element={
            <ProtectedRoute>
              <Workbench />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics/gaps"
          element={
            <ProtectedRoute>
              <GapAnalyticsDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics/benchmark"
          element={
            <ProtectedRoute>
              <BenchmarkLab />
            </ProtectedRoute>
          }
        />
        <Route
          path="/executive"
          element={
            <ProtectedRoute>
              <ExecutiveOverview />
            </ProtectedRoute>
          }
        />

        {/* Utility routes */}
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TaskInbox />
            </ProtectedRoute>
          }
        />
        <Route
          path="/evidence"
          element={
            <ProtectedRoute>
              <EvidenceLibrary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/verify"
          element={
            <ProtectedRoute>
              <VerificationCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <AnchorsEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/organization"
          element={
            <ProtectedRoute>
              <OrganizationSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/period/create"
          element={
            <ProtectedRoute>
              <PeriodCreate />
            </ProtectedRoute>
          }
        />

        {/* Legacy routes */}
        <Route
          path="/timeline"
          element={
            <ProtectedRoute>
              <IntegrityTimeline />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ghg"
          element={
            <ProtectedRoute>
              <GHGTargets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <ProtectedRoute>
              <RolesCredentials />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/analytics"
          element={
            <ProtectedRoute>
              <SettingsAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/iam"
          element={
            <ProtectedRoute>
              <IAMCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/connectors"
          element={
            <ProtectedRoute>
              <DataConnectors />
            </ProtectedRoute>
          }
        />

        <Route path="/dma" element={<ProtectedRoute><DoubleMateriality /></ProtectedRoute>} />
        <Route path="/carbon" element={<ProtectedRoute><CarbonAccounting /></ProtectedRoute>} />
        <Route path="/portfolio" element={<ProtectedRoute><PortfolioManagement /></ProtectedRoute>} />
        <Route path="/scope3" element={<ProtectedRoute><Scope3Calculator /></ProtectedRoute>} />
        <Route path="/workflow" element={<ProtectedRoute><WorkflowConfig /></ProtectedRoute>} />
        <Route path="/ai" element={<ProtectedRoute><AIStudio /></ProtectedRoute>} />

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/executive" replace />} />
      </Routes>
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


