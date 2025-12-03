import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
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
    // Standalone login layout without header/sidebar
    if (isAuthenticated) {
      return <Navigate to="/executive" replace />
    }
    return <Login />
  }

  return (
      <div className="min-h-screen bg-dark-bg">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-64 p-8">
            <Routes>
            {/* Default redirect to login so the app always opens on auth */}
            <Route path="/" element={<Navigate to="/login" replace />} />
              
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
              
            {/* Catch all - redirect to dashboard */}
            <Route path="*" element={<Navigate to="/executive" replace />} />
            </Routes>
          </main>
        </div>
      </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}


