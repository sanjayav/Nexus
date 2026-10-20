import { lazy, type ComponentType } from 'react'

// Route-level code splitting keeps first load small on slow or high-latency
// networks (notably cross-border links into mainland China).
const page = (load: () => Promise<{ default: ComponentType }>) => lazy(load)

export const ROUTES: [path: string, Page: ComponentType][] = [
  // Overview
  ['/executive', page(() => import('@/features/overview/CommandCenterPage'))],
  ['/portfolio', page(() => import('@/features/overview/PortfolioPage'))],
  ['/analytics', page(() => import('@/features/analytics/AnalyticsPage'))],
  ['/analytics/gaps', page(() => import('@/features/analytics/GapAnalysisPage'))],
  ['/analytics/benchmark', page(() => import('@/features/analytics/BenchmarkPage'))],
  ['/ratings', page(() => import('@/features/ratings/RatingsPage'))],

  // Collect & collaborate
  ['/frameworks', page(() => import('@/features/frameworks/FrameworksPage'))],
  ['/modules', page(() => import('@/features/frameworks/FrameworksPage'))],
  ['/modules/:moduleId', page(() => import('@/features/frameworks/ModuleHubPage'))],
  ['/modules/:moduleId/questionnaire', page(() => import('@/features/frameworks/QuestionnairePage'))],
  ['/modules/:moduleId/review', page(() => import('@/features/frameworks/ModuleReviewPage'))],
  ['/workbench', page(() => import('@/features/frameworks/WorkbenchPage'))],
  ['/tasks', page(() => import('@/features/tasks/TaskInboxPage'))],
  ['/import', page(() => import('@/features/data-import/DataImportPage'))],
  ['/evidence', page(() => import('@/features/evidence/EvidenceLibraryPage'))],

  // Measure & manage
  ['/carbon', page(() => import('@/features/carbon/CarbonAccountingPage'))],
  ['/carbon/assets', page(() => import('@/features/carbon-assets/CarbonAssetsPage'))],
  ['/scope3', page(() => import('@/features/carbon/Scope3Page'))],
  ['/ghg', page(() => import('@/features/carbon/GhgTargetsPage'))],
  ['/products', page(() => import('@/features/products/ProductFootprintPage'))],
  ['/suppliers', page(() => import('@/features/suppliers/SuppliersPage'))],
  ['/dma', page(() => import('@/features/materiality/DoubleMaterialityPage'))],
  ['/ai', page(() => import('@/features/ai/AiStudioPage'))],

  // Trust & publish
  ['/verify', page(() => import('@/features/trust/VerificationPage'))],
  ['/events', page(() => import('@/features/trust/AnchorsEventsPage'))],
  ['/timeline', page(() => import('@/features/trust/IntegrityTimelinePage'))],
  ['/roles', page(() => import('@/features/trust/RolesCredentialsPage'))],
  ['/publish', page(() => import('@/features/reporting/ReportBuilderPage'))],
  ['/publish/index', page(() => import('@/features/reporting/IndexTablePage'))],
  ['/reports/:periodId/build', page(() => import('@/features/reporting/ReportBuilderPage'))],
  ['/period/create', page(() => import('@/features/reporting/PeriodCreatePage'))],

  // Settings
  ['/connectors', page(() => import('@/features/admin/DataConnectorsPage'))],
  ['/workflow', page(() => import('@/features/admin/WorkflowConfigPage'))],
  ['/iam', page(() => import('@/features/admin/IamCenterPage'))],
  ['/admin', page(() => import('@/features/admin/AdminSettingsPage'))],
  ['/admin/organization', page(() => import('@/features/admin/OrganizationSetupPage'))],
  ['/settings/analytics', page(() => import('@/features/analytics/AnalyticsSettingsPage'))],
]
