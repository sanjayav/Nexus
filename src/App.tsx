import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AppShell from './components/AppShell'
import RouteLoader from './components/RouteLoader'
// Login + Dashboard stay eagerly imported: Login is the entry point and we
// want it instant; Dashboard is the first authed page so the redirect after
// login shouldn't flash a spinner. Everything else is route-level split.
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import MyDay from './pages/MyDay'

// ── Route-level lazy chunks ──────────────────────────────
// Each `lazy(() => import(...))` causes Vite/Rollup to emit a separate
// chunk for that page + its transitive deps. Heavy pages (Calculators,
// ReportPreview, Analytics, ...) used to all land in the index bundle.
const Calculators = lazy(() => import('./pages/Calculators'))
const Scope3CalculatorsPage = lazy(() => import('./pages/Scope3Calculators'))
const Workflow = lazy(() => import('./pages/Workflow'))
const Aggregator = lazy(() => import('./pages/Aggregator'))
const AnomalyDetection = lazy(() => import('./pages/AnomalyDetection'))
const Analytics = lazy(() => import('./pages/Analytics'))
const BlockchainAudit = lazy(() => import('./pages/BlockchainAudit'))
const ReportPublishing = lazy(() => import('./pages/ReportPublishing'))
const ReportPreview = lazy(() => import('./pages/ReportPreview'))
const SustainabilityPerformanceReport = lazy(() => import('./pages/SustainabilityPerformanceReport'))
const ClimateTargets = lazy(() => import('./pages/ClimateTargets'))
const AuditorView = lazy(() => import('./pages/AuditorView'))
const AIReport = lazy(() => import('./pages/AIReport'))
const DataIngestion = lazy(() => import('./pages/DataIngestion'))
const DataEntry = lazy(() => import('./pages/DataEntry'))
const DataEntrySpreadsheet = lazy(() => import('./pages/DataEntrySpreadsheet'))
const WorkflowQueue = lazy(() => import('./pages/WorkflowQueue'))
const UsersRoles = lazy(() => import('./pages/UsersRoles'))
const OrgStructure = lazy(() => import('./pages/OrgStructure'))
const EFLibrary = lazy(() => import('./pages/EFLibrary'))
const GWPValues = lazy(() => import('./pages/GWPValues'))
const Settings = lazy(() => import('./pages/Settings'))
const NotificationsPage = lazy(() => import('./pages/Notifications'))
const MyTasks = lazy(() => import('./pages/MyTasks'))
const AssignmentManager = lazy(() => import('./pages/AssignmentManager'))
const OrgOnboarding = lazy(() => import('./pages/OrgOnboarding'))
const GroupRollup = lazy(() => import('./pages/GroupRollup'))
const Materiality = lazy(() => import('./pages/Materiality'))
const ReportingPeriods = lazy(() => import('./pages/ReportingPeriods'))
const ContentIndex = lazy(() => import('./pages/ContentIndex'))
const DataStandard = lazy(() => import('./pages/DataStandard'))
const VerifyReport = lazy(() => import('./pages/VerifyReport'))
const AuditorUpload = lazy(() => import('./pages/AuditorUpload'))
const ScimTokens = lazy(() => import('./pages/ScimTokens'))
const ApiKeys = lazy(() => import('./pages/ApiKeys'))
const SystemStatus = lazy(() => import('./pages/SystemStatus'))
const Connectors = lazy(() => import('./pages/Connectors'))
const AuditLog = lazy(() => import('./pages/AuditLog'))
const WelcomeWizard = lazy(() => import('./pages/WelcomeWizard'))
const NotFound = lazy(() => import('./pages/NotFound'))
const PublicReport = lazy(() => import('./pages/PublicReport'))
const WorkCalendar = lazy(() => import('./pages/WorkCalendar'))
const EvidenceLibrary = lazy(() => import('./pages/EvidenceLibrary'))
const FrameworkQuestions = lazy(() => import('./pages/FrameworkQuestions'))
const DisclosureEditor = lazy(() => import('./pages/DisclosureEditor'))
// Public marketing surface — landing + sub-pages for unauthenticated visitors.
// Kept lazy so logged-in users don't pay the bytes unless they hit /about etc.
const Landing = lazy(() => import('./pages/Landing'))
const About = lazy(() => import('./pages/About'))
const Features = lazy(() => import('./pages/Features'))
const Pricing = lazy(() => import('./pages/Pricing'))
const Contact = lazy(() => import('./pages/Contact'))
import { useAuth } from './auth/AuthContext'
import { homeRouteFor } from './lib/rbac'
import ErrorBoundary from './components/ErrorBoundary'
import ProductTour from './components/ProductTour'
import { setToken } from './lib/api'

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
  const { isAuthenticated, user, refreshUser } = useAuth()
  // After login we land everyone on MyDay regardless of role. The
  // role-specific home routes still exist on ROLE_CATALOG for any deep-link
  // helpers, but the IA-reset declares `/` as the single canonical entry.
  void homeRouteFor
  const home = '/'
  const ssoHandled = useRef(false)

  // SSO callback hand-off: the WorkOS callback redirects to "/?sso_token=...".
  // Pull the token out, persist it, hydrate the user via /api/auth/me, and
  // strip the token from the URL so it doesn't linger in history / referrers.
  useEffect(() => {
    if (ssoHandled.current) return
    const search = new URLSearchParams(window.location.search)
    const ssoToken = search.get('sso_token')
    if (!ssoToken) return
    ssoHandled.current = true
    setToken(ssoToken)
    search.delete('sso_token')
    const cleaned = window.location.pathname + (search.toString() ? `?${search}` : '') + window.location.hash
    window.history.replaceState({}, '', cleaned)
    // Fire-and-forget — refreshUser handles its own errors.
    void refreshUser()
  }, [refreshUser])

  if (location.pathname === '/login') {
    if (isAuthenticated) return <Navigate to={home} replace />
    return <Login />
  }

  // Public marketing surface — Landing replaces the empty "/" for logged-out
  // visitors. Sub-pages render for everyone (logged in OR out) so existing
  // users can still hit /pricing for billing reference. The authed AppShell
  // sits behind these; we mount the marketing pages outside it.
  const MARKETING_PATHS = new Set(['/about', '/features', '/pricing', '/contact'])
  if (MARKETING_PATHS.has(location.pathname)) {
    return (
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/about"    element={<About />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing"  element={<Pricing />} />
          <Route path="/contact"  element={<Contact />} />
        </Routes>
      </Suspense>
    )
  }
  // Unauthenticated visitors landing on "/" see the marketing landing page
  // instead of being bounced to /login. Authed users keep the existing
  // MyDay home (handled by the protected route below).
  if (location.pathname === '/' && !isAuthenticated) {
    return (
      <Suspense fallback={<RouteLoader />}>
        <Landing />
      </Suspense>
    )
  }

  // Public password-reset flows — outside the authed AppShell so anyone with
  // a valid reset link can complete the flow.
  if (location.pathname === '/forgot-password') return <ForgotPassword />
  if (location.pathname === '/reset-password') return <ResetPassword />

  // Public verification — anyone with a report's token can check its authenticity.
  // Public auditor upload — one-shot token-authenticated.
  // Neither enters the authed AppShell.
  if (location.pathname.startsWith('/verify/')) {
    return (
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/verify/:token" element={<VerifyReport />} />
        </Routes>
      </Suspense>
    )
  }
  if (location.pathname.startsWith('/assure/')) {
    return (
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/assure/:token" element={<AuditorUpload />} />
        </Routes>
      </Suspense>
    )
  }
  // Public read-only report — token gated, no auth, outside AppShell.
  if (location.pathname.startsWith('/public/report/')) {
    return (
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/public/report/:token" element={<PublicReport />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <AppShell>
      {/* First-run product tour. Persists per-user; auto-hides forever once
          completed or skipped. Mounts only when we have a hydrated user so
          tour state keys are stable. */}
      {user && <ProductTour userId={user.id ?? user.email} />}
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          {/* MyDay — post-login home. /dashboard kept as alias for back-compat
              with any external links / docs. */}
          <Route path="/" element={<ProtectedRoute><MyDay /></ProtectedRoute>} />
          <Route path="/my-day" element={<ProtectedRoute><MyDay /></ProtectedRoute>} />

          {/* Core Modules */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
          <Route path="/work/calendar" element={<ProtectedRoute><WorkCalendar /></ProtectedRoute>} />
          <Route path="/work/review" element={<ProtectedRoute><WorkflowQueue kind="review" /></ProtectedRoute>} />
          <Route path="/work/approval" element={<ProtectedRoute><WorkflowQueue kind="approval" /></ProtectedRoute>} />

          {/* Legacy — kept for deep links, surfaced only for admin paths */}
          <Route path="/calculators" element={<ProtectedRoute><Calculators /></ProtectedRoute>} />
          <Route path="/calculators/scope3" element={<ProtectedRoute><Scope3CalculatorsPage /></ProtectedRoute>} />
          <Route path="/calculators/:moduleId" element={<ProtectedRoute><Placeholder title="Calculator Module" /></ProtectedRoute>} />
          <Route path="/questionnaires" element={<Navigate to="/reports" replace />} />

          {/* Data collection — redirect legacy picker/entry to My Tasks (canonical flow) */}
          <Route path="/data/entry" element={<Navigate to="/my-tasks" replace />} />
          <Route path="/data/entry/spreadsheet" element={<ProtectedRoute><DataEntrySpreadsheet /></ProtectedRoute>} />
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
          {/* IA-reset: rename "Frameworks" → Templates, "Content Index" → Disclosures Library */}
          <Route path="/reports/templates" element={<ProtectedRoute><FrameworkQuestions /></ProtectedRoute>} />
          <Route path="/reports/library" element={<ProtectedRoute><ContentIndex /></ProtectedRoute>} />
          {/* Workiva-style document-centric disclosure editor — three-pane shell. */}
          <Route path="/disclosure-editor/:frameworkId" element={<ProtectedRoute><DisclosureEditor /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/analytics/anomalies" element={<ProtectedRoute><AnomalyDetection /></ProtectedRoute>} />
          {/* IA-reset: data aliases */}
          <Route path="/data/anomalies" element={<ProtectedRoute><AnomalyDetection /></ProtectedRoute>} />
          <Route path="/data/spreadsheet" element={<ProtectedRoute><DataEntrySpreadsheet /></ProtectedRoute>} />
          <Route path="/data/evidence" element={<ProtectedRoute><EvidenceLibrary /></ProtectedRoute>} />
          <Route path="/data/ef-library" element={<ProtectedRoute><EFLibrary /></ProtectedRoute>} />

          {/* Organisation — onboarding is canonical; legacy /admin/org redirects there */}
          <Route path="/admin/org" element={<Navigate to="/onboarding" replace />} />
          <Route path="/admin/users" element={<ProtectedRoute><UsersRoles /></ProtectedRoute>} />
          <Route path="/admin/scim" element={<ProtectedRoute><ScimTokens /></ProtectedRoute>} />
          <Route path="/admin/api-keys" element={<ProtectedRoute><ApiKeys /></ProtectedRoute>} />
          <Route path="/admin/system-status" element={<ProtectedRoute><SystemStatus /></ProtectedRoute>} />
          <Route path="/data/connectors" element={<ProtectedRoute><Connectors /></ProtectedRoute>} />
          <Route path="/admin/assignments" element={<ProtectedRoute><AssignmentManager /></ProtectedRoute>} />
          <Route path="/admin/materiality" element={<ProtectedRoute><Materiality /></ProtectedRoute>} />
          <Route path="/admin/targets" element={<ProtectedRoute><ClimateTargets /></ProtectedRoute>} />
          <Route path="/admin/periods" element={<ProtectedRoute><ReportingPeriods /></ProtectedRoute>} />
          <Route path="/reports/index" element={<ProtectedRoute><ContentIndex /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><OrgOnboarding /></ProtectedRoute>} />
          <Route path="/welcome" element={<ProtectedRoute><WelcomeWizard /></ProtectedRoute>} />
          <Route path="/admin/org/legacy" element={<ProtectedRoute><OrgStructure /></ProtectedRoute>} />
          <Route path="/aggregator" element={<ProtectedRoute><GroupRollup /></ProtectedRoute>} />

          {/* Reference Data */}
          <Route path="/admin/ef-library" element={<ProtectedRoute><EFLibrary /></ProtectedRoute>} />
          <Route path="/admin/gwp" element={<ProtectedRoute><GWPValues /></ProtectedRoute>} />
          <Route path="/data/standard" element={<ProtectedRoute><DataStandard /></ProtectedRoute>} />
          <Route path="/admin/data-standard" element={<ProtectedRoute><DataStandard /></ProtectedRoute>} />

          {/* System */}
          <Route path="/admin/audit" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
          <Route path="/admin/audit/blockchain" element={<ProtectedRoute><BlockchainAudit /></ProtectedRoute>} />
          <Route path="/admin/blockchain" element={<ProtectedRoute><BlockchainAudit /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
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
