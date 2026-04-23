// PTTGC Sustainability Performance Data — report template.
// Drives both the Publish preview (/reports/preview) and the Auditor View (/reports/auditor).
// Section/subsection order mirrors the published FY2025 PDF so the regenerated report
// lands in the same layout with updated FY2026 values (SRD §15.2, AC-07, AC-10).

import type { NexusQuestionnaireItem, NexusDataValue, NexusHistoricalPoint } from '../lib/api'

export const CAPITAL_ORDER = [
  'Financial Capital',
  'Manufacture Capital',
  'Human Capital',
  'Social & Relationship Capital',
  'Natural Capital',
] as const

export type Capital = (typeof CAPITAL_ORDER)[number]

// Curated subsection order within each capital — matches the PTTGC PDF's section flow.
export const SUBSECTION_ORDER: Record<string, string[]> = {
  'Financial Capital': [
    'Direct Economic Value Generated',
    'Economic Value Distributed',
    'Procurement Practices',
  ],
  'Manufacture Capital': [
    'Return on Environmental Investment',
  ],
  'Human Capital': [
    'Workforce',
    'Workforce by Area',
    'New Employees',
    'Turnover',
    'Training and Development',
    'Gender Diversity',
    'Equal Remuneration',
    'Health & Safety',
    'Process Safety',
  ],
  'Social & Relationship Capital': [
    'Board Structure',
    'Board Effectiveness',
    'Executive Compensation',
    'CEO Pay Ratio',
    'Anti-Bribery and Corruption',
    'Code of Conduct Breaches',
    'Anticompetitive Practices',
    'Non-Compliance',
    'Supply Chain',
    'Philanthropic Activities',
    'Local Community',
  ],
  'Natural Capital': [
    'Materials',
    'Energy',
    'Greenhouse Gas Emissions (GHGs)',
    'Air Emissions',
    'Water',
    'Waste',
    'Spills',
    'Operational Eco-Efficiency',
    'Product Stewardship',
    'Hazardous Substances',
  ],
}

export interface TemplateRow {
  item: NexusQuestionnaireItem
  // FY2026 value (from data_value) — may be absent if not yet entered.
  current: NexusDataValue | null
  // 4-year history (FY2022–FY2025) from historical_value.
  history: NexusHistoricalPoint[]
}

export interface TemplateSection {
  capital: Capital
  subsections: {
    name: string
    rows: TemplateRow[]
  }[]
}

/**
 * Build the ordered section tree from raw questionnaire + historical + current data.
 * @param reportingScope 'group' | 'jv' — the template renders each scope separately
 *                      so the "Joint Ventures (JV)" block in the PDF is a distinct render pass.
 */
export function buildTemplate(
  items: NexusQuestionnaireItem[],
  historicalByItem: Map<string, NexusHistoricalPoint[]>,
  currentByItem: Map<string, NexusDataValue>,
  reportingScope: 'group' | 'jv' = 'group',
): TemplateSection[] {
  const scoped = items.filter(i => i.reporting_scope === reportingScope)

  return CAPITAL_ORDER.map(capital => {
    const inCapital = scoped.filter(i => i.section === capital)
    const knownSubs = SUBSECTION_ORDER[capital] || []
    const allSubs = Array.from(new Set([
      ...knownSubs.filter(s => inCapital.some(i => i.subsection === s)),
      ...inCapital.map(i => i.subsection).filter(s => !knownSubs.includes(s)),
    ]))

    return {
      capital,
      subsections: allSubs.map(sub => ({
        name: sub,
        rows: inCapital
          .filter(i => i.subsection === sub)
          .map(item => ({
            item,
            current: currentByItem.get(item.id) ?? null,
            history: historicalByItem.get(item.id) ?? [],
          })),
      })),
    }
  }).filter(s => s.subsections.length > 0)
}

export interface PublishReadiness {
  total: number
  approved: number
  published: number
  reviewed: number
  submitted: number
  draft: number
  notStarted: number
  pctApproved: number
  ready: boolean
}

export function computeReadiness(
  items: NexusQuestionnaireItem[],
  currentByItem: Map<string, NexusDataValue>,
): PublishReadiness {
  const required = items.filter(i => i.reporting_scope === 'group') // JV is tracked separately; publish gate is on group
  const tally = {
    approved: 0, published: 0, reviewed: 0, submitted: 0, draft: 0, notStarted: 0,
  }
  for (const it of required) {
    const dv = currentByItem.get(it.id)
    if (!dv) { tally.notStarted++; continue }
    switch (dv.status) {
      case 'approved':    tally.approved++;    break
      case 'published':   tally.published++;   break
      case 'reviewed':    tally.reviewed++;    break
      case 'submitted':   tally.submitted++;   break
      case 'draft':       tally.draft++;       break
      case 'rejected':    tally.draft++;       break
      case 'not_started': tally.notStarted++;  break
    }
  }
  const total = required.length
  const okForPublish = tally.approved + tally.published
  return {
    total,
    ...tally,
    pctApproved: total > 0 ? (okForPublish / total) * 100 : 0,
    ready: total > 0 && okForPublish === total,
  }
}

export function formatValue(v: number | null | undefined, unit?: string | null): string {
  if (v === null || v === undefined) return '—'
  const abs = Math.abs(v)
  let str: string
  if (abs >= 1e9) str = (v / 1e9).toFixed(2) + 'B'
  else if (abs >= 1e6) str = (v / 1e6).toFixed(2) + 'M'
  else if (abs >= 1e3) str = v.toLocaleString('en-US', { maximumFractionDigits: 2 })
  else if (abs < 1 && abs > 0) str = v.toFixed(3)
  else str = v.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return unit ? `${str}` : str
}

export function truncateHash(h: string | null | undefined, head = 6, tail = 4): string {
  if (!h) return '—'
  if (h.length <= head + tail + 2) return h
  return `${h.slice(0, head)}…${h.slice(-tail)}`
}
