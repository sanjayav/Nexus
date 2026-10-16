// Scope 3 calculator registry — one entry per GHG Protocol Scope 3 category (1–15).
// Types live in ./types and shared constants in ./constants (leaf modules) so the
// category modules never import this file — no circular import at evaluation time.

export * from './types'
export * from './constants'

import type { Scope3Calculator, Scope3ComputeContext, EmissionFactorRow } from './types'
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
