/**
 * Smoke test: every page module should evaluate cleanly (no top-level
 * crashes from missing imports, broken constant initialisers, etc.). This
 * does NOT exercise the component tree itself — that's covered by the
 * dedicated component tests — but it's the fastest possible safety net
 * against "page that won't even load".
 */

const PAGE_MODULES = [
  '../../pages/AIReport',
  '../../pages/Aggregator',
  '../../pages/Analytics',
  '../../pages/AnomalyDetection',
  '../../pages/ApiKeys',
  '../../pages/AssignmentManager',
  '../../pages/AssuranceReview',
  '../../pages/AuditLog',
  '../../pages/AuditorUpload',
  '../../pages/AuditorView',
  '../../pages/BlockchainAudit',
  '../../pages/Calculators',
  '../../pages/CarbonAccounting',
  '../../pages/ClimateTargets',
  '../../pages/Connectors',
  '../../pages/ContentIndex',
  '../../pages/Dashboard',
  '../../pages/DataEntry',
  '../../pages/DataEntryPicker',
  '../../pages/DataEntrySpreadsheet',
  '../../pages/DataIngestion',
  '../../pages/DataStandard',
  '../../pages/EFLibrary',
  '../../pages/EntitySubmissions',
  '../../pages/ForgotPassword',
  '../../pages/FrameworkQuestions',
  '../../pages/GWPValues',
  '../../pages/GroupRollup',
  '../../pages/Login',
  '../../pages/Materiality',
  '../../pages/MeasuredData',
  '../../pages/MyTasks',
  '../../pages/NotFound',
  '../../pages/Notifications',
  '../../pages/OrgOnboarding',
  '../../pages/OrgStructure',
  '../../pages/OrganisationSetup',
  '../../pages/RawSupplierIngestion',
  '../../pages/ReportPreview',
  '../../pages/ReportPublishing',
  '../../pages/ReportingFrameworks',
  '../../pages/ReportingPeriods',
  '../../pages/ResetPassword',
  '../../pages/ScimTokens',
  '../../pages/Scope3Calculators',
  '../../pages/ScopeCalculator',
  '../../pages/Settings',
  '../../pages/SustainabilityPerformanceReport',
  '../../pages/SystemStatus',
  '../../pages/UsersRoles',
  '../../pages/VerifyReport',
  '../../pages/Workflow',
  '../../pages/WorkflowQueue',
]

describe('Page modules — import smoke', () => {
  it.each(PAGE_MODULES)('imports cleanly: %s', async (path) => {
    const mod = await import(/* @vite-ignore */ path)
    // Either default export (most pages) or named export (some shells).
    expect(mod).toBeDefined()
    const hasDefault = typeof mod.default !== 'undefined'
    const hasNamed = Object.keys(mod).length > 0
    expect(hasDefault || hasNamed).toBe(true)
  })
})
