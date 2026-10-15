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
    status: 'active',
    color: '#2563EB',
    coverage: ['Transition plan', 'Physical risk', 'Mitigation', 'Adaptation', 'Financed emissions'],
    questionCount: 84,
  },
  {
    id: 'csrd-e2',
    code: 'CSRD E2',
    name: 'CSRD ESRS E2 — Pollution',
    body: 'European Sustainability Reporting Standards',
    description: 'EU-mandated pollution disclosures: emissions to air/water/soil, substances of concern, microplastics.',
    version: '2024',
    status: 'active',
    color: '#0EA5E9',
    coverage: ['Air', 'Water', 'Soil', 'Substances of concern'],
    questionCount: 31,
  },
  {
    id: 'csrd-e3',
    code: 'CSRD E3',
    name: 'CSRD ESRS E3 — Water & Marine Resources',
    body: 'European Sustainability Reporting Standards',
    description: 'Water withdrawal, consumption, discharge, water-stressed areas, and marine resource impacts.',
    version: '2024',
    status: 'active',
    color: '#06B6D4',
    coverage: ['Withdrawal', 'Consumption', 'Discharge', 'Water stress'],
    questionCount: 29,
  },
  {
    id: 'csrd-e4',
    code: 'CSRD E4',
    name: 'CSRD ESRS E4 — Biodiversity & Ecosystems',
    body: 'European Sustainability Reporting Standards',
    description: 'Biodiversity-sensitive sites, IUCN species impacted, restoration projects, no-net-loss ambition.',
    version: '2024',
    status: 'active',
    color: '#10B981',
    coverage: ['Sites', 'Species', 'Restoration', 'Transition plan'],
    questionCount: 30,
  },
  {
    id: 'csrd-e5',
    code: 'CSRD E5',
    name: 'CSRD ESRS E5 — Resource Use & Circular Economy',
    body: 'European Sustainability Reporting Standards',
    description: 'Material inflows, product circularity, waste by treatment route, recycled content.',
    version: '2024',
    status: 'active',
    color: '#84CC16',
    coverage: ['Inflows', 'Products', 'Waste', 'Circularity'],
    questionCount: 37,
  },
  {
    id: 'csrd-s1',
    code: 'CSRD S1',
    name: 'CSRD ESRS S1 — Own Workforce',
    body: 'European Sustainability Reporting Standards',
    description: 'Workforce characteristics, diversity, collective bargaining, health & safety, training, pay gaps, incidents.',
    version: '2024',
    status: 'active',
    color: '#F97316',
    coverage: ['Headcount', 'Diversity', 'H&S', 'Training', 'Pay'],
    questionCount: 78,
  },
  {
    id: 'csrd-s2',
    code: 'CSRD S2',
    name: 'CSRD ESRS S2 — Value Chain Workers',
    body: 'European Sustainability Reporting Standards',
    description: 'Human rights due diligence and severe incidents across the value chain workforce.',
    version: '2024',
    status: 'active',
    color: '#EAB308',
    coverage: ['Due diligence', 'Severe incidents', 'Remediation'],
    questionCount: 30,
  },
  {
    id: 'csrd-s3',
    code: 'CSRD S3',
    name: 'CSRD ESRS S3 — Affected Communities',
    body: 'European Sustainability Reporting Standards',
    description: 'Engagement, grievance channels, and community impact metrics including FPIC and resettlement.',
    version: '2024',
    status: 'active',
    color: '#A855F7',
    coverage: ['Engagement', 'Grievances', 'Impact metrics'],
    questionCount: 28,
  },
  {
    id: 'csrd-s4',
    code: 'CSRD S4',
    name: 'CSRD ESRS S4 — Consumers & End-Users',
    body: 'European Sustainability Reporting Standards',
    description: 'Product safety incidents, recalls, data privacy breaches, responsible marketing.',
    version: '2024',
    status: 'active',
    color: '#EC4899',
    coverage: ['Safety', 'Privacy', 'Marketing'],
    questionCount: 27,
  },
  {
    id: 'csrd-g1',
    code: 'CSRD G1',
    name: 'CSRD ESRS G1 — Business Conduct',
    body: 'European Sustainability Reporting Standards',
    description: 'Anti-corruption, whistleblower mechanisms, political contributions, payment practices.',
    version: '2024',
    status: 'active',
    color: '#64748B',
    coverage: ['Anti-corruption', 'Whistleblower', 'Political', 'Payments'],
    questionCount: 32,
  },
  {
    id: 'issb-s1',
    code: 'ISSB S1',
    name: 'ISSB IFRS S1 — General Sustainability',
    body: 'International Sustainability Standards Board',
    description: 'Investor-grade general sustainability disclosures: governance, strategy, risk, metrics across all topics.',
    version: '2023',
    status: 'active',
    color: '#B91C1C',
    coverage: ['Governance', 'Strategy', 'Risk mgmt', 'Metrics'],
    questionCount: 33,
  },
  {
    id: 'issb-s2',
    code: 'ISSB S2',
    name: 'ISSB IFRS S2 — Climate',
    body: 'International Sustainability Standards Board',
    description: 'Investor-grade climate disclosures harmonised with TCFD, mandatory in UK and several jurisdictions from 2025.',
    version: '2023',
    status: 'active',
    color: '#DC2626',
    coverage: ['Governance', 'Strategy', 'Risk mgmt', 'Metrics', 'Industry-specific'],
    questionCount: 58,
  },
  {
    id: 'tcfd',
    code: 'TCFD',
    name: 'TCFD Recommendations',
    body: 'Task Force on Climate-related Financial Disclosures',
    description: 'Four-pillar framework: Governance, Strategy, Risk Management, Metrics & Targets.',
    version: '2017',
    status: 'active',
    color: '#D97706',
    coverage: ['Governance', 'Strategy', 'Risk mgmt', 'Metrics'],
    questionCount: 27,
  },
  {
    id: 'cdp-2024',
    code: 'CDP CC',
    name: 'CDP Climate Change 2024',
    body: 'CDP Worldwide',
    description: 'Annual disclosure questionnaire across governance, risks, opportunities, targets, emissions, energy, verification, carbon pricing, and engagement.',
    version: '2024',
    status: 'active',
    color: '#7C3AED',
    coverage: ['Governance', 'Risks', 'Targets', 'Emissions', 'Energy', 'Verification'],
    questionCount: 91,
  },
  {
    id: 'sec-climate',
    code: 'SEC',
    name: 'SEC Climate Disclosure Rule',
    body: 'U.S. Securities and Exchange Commission',
    description: 'Final 2024 SEC rule: material climate risks, governance, targets, Scope 1+2 (where material), severe-weather financial-statement impacts.',
    version: '2024',
    status: 'active',
    color: '#1E40AF',
    coverage: ['Risks', 'Governance', 'Targets', 'GHG (stayed)', 'Financial statements'],
    questionCount: 24,
  },
  {
    id: 'ca-sb253',
    code: 'SB 253',
    name: 'California SB 253 (CCDAA)',
    body: 'California Air Resources Board',
    description: 'Scopes 1+2 from FY2026, Scope 3 from FY2027, with phased third-party assurance for $1bn+ revenue entities doing business in California.',
    version: '2023',
    status: 'active',
    color: '#0D9488',
    coverage: ['Scope 1', 'Scope 2', 'Scope 3', 'Assurance'],
    questionCount: 13,
  },
  {
    id: 'ca-sb261',
    code: 'SB 261',
    name: 'California SB 261 (Climate Risk)',
    body: 'California Air Resources Board',
    description: 'Biennial climate-related financial risk report aligned with TCFD for $500m+ revenue entities doing business in California.',
    version: '2023',
    status: 'active',
    color: '#15803D',
    coverage: ['Physical', 'Transition', 'Mitigation', 'TCFD alignment'],
    questionCount: 13,
  },
  {
    id: 'eu-taxonomy',
    code: 'EU Tax',
    name: 'EU Taxonomy Alignment',
    body: 'European Commission',
    description: 'Turnover, CapEx and OpEx eligibility/alignment across the six environmental objectives, plus DNSH and minimum safeguards.',
    version: 'Reg 2020/852',
    status: 'active',
    color: '#0369A1',
    coverage: ['Turnover', 'CapEx', 'OpEx', 'DNSH', 'Safeguards'],
    questionCount: 27,
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
