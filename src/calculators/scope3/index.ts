// Scope 3 calculator registry — one entry per GHG Protocol Scope 3 category (1–15).
// Each calculator declares 1+ "methods" (e.g. supplier-specific, activity-based,
// spend-based). The UI lets the user pick a method, fills the declared inputs,
// then runs `compute(inputs, ctx)` to produce a tCO2e result. Spend-based factors
// are illustrative averages until USEEIO v2.0 / EXIOBASE is wired in.

export type Scope3InputType = 'number' | 'select' | 'text'

export interface Scope3Input {
  key: string
  label: string
  unit?: string
  type: Scope3InputType
  required?: boolean
  options?: string[]
  default?: string | number
  hint?: string
}

export interface EmissionFactorRow {
  scope: 1 | 2 | 3
  category?: string
  fuel_or_activity?: string
  region?: string
  unit?: string
  co2e_per_unit: number
  source?: string
  source_version?: string
  notes?: string
}

export interface Scope3ComputeContext {
  /** Fetch a single EF row from the platform DB (`/api/emission-factors`). */
  lookupEF: (q: {
    scope: 1 | 2 | 3
    category?: string
    fuel_or_activity?: string
    region?: string
  }) => Promise<EmissionFactorRow>
}

export interface Scope3MethodResult {
  co2e_tonnes: number
  ef_used?: EmissionFactorRow | null
  breakdown?: Record<string, number | string>
  notes?: string
}

export interface Scope3Method {
  id: string
  name: string
  priority: number
  inputs: Scope3Input[]
  compute: (
    inputs: Record<string, string | number>,
    ctx: Scope3ComputeContext,
  ) => Promise<Scope3MethodResult> | Scope3MethodResult
  notes?: string
}

export interface Scope3Calculator {
  id: string
  category: number
  name: string
  shortName: string
  description: string
  methods: Scope3Method[]
}

import { cat01 } from './cat01_purchasedGoods'
import { cat02 } from './cat02_capitalGoods'
import { cat03 } from './cat03_fuelEnergy'
import { cat04 } from './cat04_upstreamTransport'
import { cat05 } from './cat05_wasteOperations'
import { cat06 } from './cat06_businessTravel'
import { cat07 } from './cat07_employeeCommuting'
import { cat08 } from './cat08_upstreamLeased'
import { cat09 } from './cat09_downstreamTransport'
import { cat10 } from './cat10_processingSoldProducts'
import { cat11 } from './cat11_useSoldProducts'
import { cat12 } from './cat12_endOfLife'
import { cat13 } from './cat13_downstreamLeased'
import { cat14 } from './cat14_franchises'
import { cat15 } from './cat15_investments'

export const SCOPE3_CALCULATORS: Scope3Calculator[] = [
  cat01, cat02, cat03, cat04, cat05,
  cat06, cat07, cat08, cat09, cat10,
  cat11, cat12, cat13, cat14, cat15,
]

export function findScope3Calculator(id: string): Scope3Calculator | undefined {
  return SCOPE3_CALCULATORS.find(c => c.id === id)
}

// ─── Shared illustrative EEIO sector factors ──────────────────────────
// kgCO2e per USD spend. TODO: replace with USEEIO v2.0 / EXIOBASE values.
export const EEIO_FACTORS: Record<string, number> = {
  'agriculture': 0.62,
  'mining': 0.95,
  'utilities': 1.10,
  'construction': 0.48,
  'food_beverage': 0.55,
  'textiles_apparel': 0.45,
  'wood_paper': 0.62,
  'chemicals': 0.88,
  'pharmaceuticals': 0.34,
  'plastics_rubber': 0.78,
  'cement_concrete': 1.05,
  'iron_steel': 1.20,
  'nonferrous_metals': 0.95,
  'fabricated_metal': 0.60,
  'machinery': 0.42,
  'electronics': 0.40,
  'electrical_equipment': 0.45,
  'motor_vehicles': 0.50,
  'other_transport_equipment': 0.55,
  'furniture': 0.55,
  'wholesale_retail': 0.18,
  'transport_warehousing': 0.85,
  'information_telecom': 0.15,
  'financial_services': 0.10,
  'real_estate': 0.12,
  'professional_services': 0.16,
  'admin_support': 0.22,
  'education_health': 0.18,
  'arts_entertainment': 0.20,
  'food_services': 0.38,
  'other_services': 0.30,
}

export const EEIO_SECTOR_OPTIONS = Object.keys(EEIO_FACTORS)
export const REGION_OPTIONS = ['GLOBAL', 'UK', 'US', 'EU', 'APAC']

export const ILLUSTRATIVE_NOTE =
  'Illustrative spend-based factor; replace with USEEIO v2.0 / EXIOBASE for production.'

/** Convenience: number coercion with default. */
export const toNum = (v: unknown, dflt = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : dflt
}

/** Default EF fetcher hitting `/api/emission-factors`. Returns a row or a synthetic
 *  fallback so calculators don't blow up in demo environments. */
export function makeBrowserEFContext(getToken: () => string | null): Scope3ComputeContext {
  return {
    lookupEF: async (q) => {
      const token = getToken()
      const params = new URLSearchParams()
      params.set('scope', String(q.scope))
      if (q.category) params.set('category', q.category)
      if (q.region) params.set('region', q.region)
      try {
        const res = await fetch(`/api/emission-factors?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error(`EF lookup failed ${res.status}`)
        const rows = (await res.json()) as EmissionFactorRow[]
        // Best-effort match on fuel_or_activity if provided.
        if (q.fuel_or_activity) {
          const match = rows.find(r => r.fuel_or_activity === q.fuel_or_activity)
          if (match) return match
        }
        if (rows.length > 0) return rows[0]
      } catch { /* fall through to synthetic */ }
      return {
        scope: q.scope,
        category: q.category,
        fuel_or_activity: q.fuel_or_activity,
        region: q.region ?? 'GLOBAL',
        unit: 'kgCO2e/unit',
        co2e_per_unit: 1,
        source: 'illustrative-fallback',
        notes: 'No matching EF row in DB; using 1 kgCO2e/unit placeholder.',
      }
    },
  }
}
