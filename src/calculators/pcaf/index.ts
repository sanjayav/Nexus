/**
 * PCAF (Partnership for Carbon Accounting Financials) calculator registry.
 *
 * One entry per asset class. Each calculator declares the inputs the user
 * sees in the AssetCalculator form + a pure `compute(inputs)` function that
 * returns financed emissions, attribution factor, and a PCAF data-quality
 * score (1 = best, 5 = worst).
 *
 * Methodology reference: PCAF Global GHG Accounting and Reporting Standard
 *   https://carbonaccountingfinancials.com/files/downloads/PCAF-Global-GHG-Standard.pdf
 *
 * Math is deliberately pure (no DB calls) so it runs identically client-side
 * (preview while typing) and server-side (POST /api/pcaf/calculate). The
 * fallback sector / country / vehicle factors live in
 * src/data/pcafEmissionFactors.ts and are marked TODO for replacement with
 * sourced PCAF Annex 9 / EXIOBASE data.
 */

export type PcafAssetClass =
  | 'listed_equity'
  | 'corporate_bond'
  | 'business_loan'
  | 'unlisted_equity'
  | 'project_finance'
  | 'commercial_real_estate'
  | 'mortgage'
  | 'motor_vehicle_loan'
  | 'sovereign_debt'

export type PcafInputType = 'number' | 'text' | 'select' | 'boolean'

export interface PcafInput {
  key: string
  label: string
  type: PcafInputType
  unit?: string
  required?: boolean
  options?: string[]
  default?: string | number | boolean
  help?: string
}

export type PcafDataQuality = 1 | 2 | 3 | 4 | 5

export interface PcafResult {
  attributionFactor: number
  financedScope1?: number
  financedScope2?: number
  financedScope3?: number
  financedTotal: number
  dataQualityScore: PcafDataQuality
  rationale: string
  warnings: string[]
}

export interface PcafAssetCalculator {
  id: string
  assetClass: PcafAssetClass
  name: string
  description: string
  inputs: PcafInput[]
  compute: (inputs: Record<string, unknown>) => PcafResult
  methodologyUrl: string
}

export const PCAF_METHODOLOGY_URL =
  'https://carbonaccountingfinancials.com/files/downloads/PCAF-Global-GHG-Standard.pdf'

// Registry lives in ./registry.ts. Importing it from this barrel would
// re-introduce a circular import (registry imports the asset-class files,
// each of which imports from this module) — consumers should import the
// array directly: `import { PCAF_CALCULATORS } from '...pcaf/registry'`.

// ─── Shared helpers ──────────────────────────────────────────

export const toNum = (v: unknown, dflt = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : dflt
}

export const toBool = (v: unknown): boolean => {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v === 'true' || v === '1' || v === 'yes'
  return false
}

/** Bounds the attribution factor to [0, 1.5]. PCAF expects ≤1; >1 happens
 *  when outstanding > total_value (rare, e.g. junior tranches) — we cap to
 *  avoid runaway results and emit a warning instead. */
export function safeAttribution(outstanding: number, totalValue: number): {
  attr: number
  warning?: string
} {
  if (!(totalValue > 0)) {
    return { attr: 0, warning: 'Total value missing or zero — attribution set to 0; provide enterprise value or property value' }
  }
  const raw = outstanding / totalValue
  if (raw > 1.5) return { attr: 1.5, warning: `Attribution factor ${raw.toFixed(2)} >1.5 capped to 1.5 — outstanding may exceed total value` }
  if (raw < 0) return { attr: 0, warning: 'Attribution factor negative — outstanding/total_value must be ≥0' }
  return { attr: raw }
}

/** PCAF data-quality lookup for emissions-based asset classes (1–3 of the
 *  6 PCAF asset classes that share the "reported emissions × attribution"
 *  pattern: listed equity, corporate bonds, business loans, unlisted
 *  equity, project finance). */
export function emissionsDataQuality(opts: {
  reportedEmissions: boolean
  verified: boolean
  valueKnown: boolean
}): PcafDataQuality {
  const { reportedEmissions, verified, valueKnown } = opts
  if (reportedEmissions && verified && valueKnown) return 1
  if (reportedEmissions && (verified || valueKnown)) return 2
  if (reportedEmissions) return 3
  if (valueKnown) return 4
  return 5
}
