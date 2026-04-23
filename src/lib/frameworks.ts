import { createContext, useContext } from 'react'

/**
 * Framework catalog.
 *
 * Phase 1 ships with GRI 305 only. Every other framework is listed as
 * `coming_soon` so the Settings > Frameworks pane, selectors and badges all
 * render the product roadmap honestly. Adding a new framework in Phase 2 is a
 * single catalog entry + a seeder for its questionnaire_items — no UI rework.
 *
 * `id` is the canonical key stamped on assignments, reports, questionnaire_item
 * rows, etc. Keep it stable — it's a foreign key in spirit.
 */

export type FrameworkStatus = 'active' | 'coming_soon' | 'disabled'

export interface Framework {
  id: string
  code: string            // Short code shown in chips ('GRI 305')
  name: string            // Full human name
  body: string            // Governing organisation ('Global Reporting Initiative')
  description: string
  version: string         // '2016', 'v2024', etc.
  status: FrameworkStatus
  color: string           // CSS variable or hex for the accent chip
  coverage: string[]      // Themes / pillars ('Emissions', 'Energy', 'Water')
  questionCount?: number  // Approx. line items
}

export const FRAMEWORKS: Framework[] = [
  {
    id: 'gri',
    code: 'GRI',
    name: 'GRI Standards',
    body: 'Global Reporting Initiative',
    description: 'The full GRI Standards suite — Universal (GRI 2, 3), Economic (201–207), Environmental (301–308), and Social (401–419) disclosures. Phase 1 of the platform reports against GRI as a whole.',
    version: '2021 · topic standards 2016–2020',
    status: 'active',
    color: 'var(--color-brand)',
    coverage: ['Universal', 'Economic', 'Environmental', 'Social'],
    questionCount: 2003,
  },
  {
    id: 'csrd-e1',
    code: 'CSRD E1',
    name: 'CSRD ESRS E1 — Climate Change',
    body: 'European Sustainability Reporting Standards',
    description: 'EU-mandated climate disclosures: transition plan, physical/transition risk, adaptation, mitigation, financed emissions.',
    version: '2024',
    status: 'coming_soon',
    color: '#2563EB',
    coverage: ['Transition plan', 'Physical risk', 'Mitigation', 'Adaptation', 'Financed emissions'],
  },
  {
    id: 'cdp-cc',
    code: 'CDP CC',
    name: 'CDP Climate Change',
    body: 'CDP Worldwide',
    description: 'Annual disclosure questionnaire across governance, risks, opportunities, targets, emissions, and methodology.',
    version: '2026',
    status: 'coming_soon',
    color: '#7C3AED',
    coverage: ['Governance', 'Risks', 'Opportunities', 'Targets', 'Verification'],
  },
  {
    id: 'tcfd',
    code: 'TCFD',
    name: 'TCFD Recommendations',
    body: 'Task Force on Climate-related Financial Disclosures',
    description: 'Four-pillar framework: Governance, Strategy, Risk Management, Metrics & Targets.',
    version: '2017',
    status: 'coming_soon',
    color: '#D97706',
    coverage: ['Governance', 'Strategy', 'Risk mgmt', 'Metrics'],
  },
  {
    id: 'issb-s2',
    code: 'ISSB S2',
    name: 'ISSB IFRS S2 — Climate',
    body: 'International Sustainability Standards Board',
    description: 'Investor-grade climate disclosures harmonised with TCFD, mandatory in UK and several jurisdictions from 2025.',
    version: '2023',
    status: 'coming_soon',
    color: '#DC2626',
    coverage: ['Governance', 'Strategy', 'Risk mgmt', 'Metrics', 'Industry-specific'],
  },
]

export const DEFAULT_FRAMEWORK_ID = 'gri'

export function getFramework(id: string): Framework | undefined {
  return FRAMEWORKS.find(f => f.id === id)
}
export function getActiveFrameworks(): Framework[] {
  return FRAMEWORKS.filter(f => f.status === 'active')
}

// ── React context ────────────────────────────────────────────────

interface FrameworkCtx {
  active: Framework
  setActive: (id: string) => void
  enabled: string[]              // ids the tenant has turned on
  setEnabled: (ids: string[]) => void
}

export const FrameworkContext = createContext<FrameworkCtx | null>(null)

export function useFramework(): FrameworkCtx {
  const ctx = useContext(FrameworkContext)
  if (!ctx) throw new Error('useFramework must be used within FrameworkProvider')
  return ctx
}
