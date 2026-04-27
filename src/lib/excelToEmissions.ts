import type { ExcelRow } from '../data/pttepDemoData'
import { STATIONARY_FUELS, MOBILE_FUELS, REFRIGERANTS, GRID_FACTORS } from '../data/emissionFactors'

const GWP_CH4 = 28
const GWP_N2O = 273

function fuelKgCo2e(factor: { co2: number; ch4: number; n2o: number }, qty: number): number {
  return qty * (factor.co2 + factor.ch4 * GWP_CH4 + factor.n2o * GWP_N2O)
}

function matchByName<T extends { name: string }>(list: T[], q: string): T | undefined {
  const lq = q.toLowerCase()
  return list.find(x => lq.includes(x.name.toLowerCase()) || x.name.toLowerCase().includes(lq))
}

function computeRowKgCo2e(row: ExcelRow): number {
  const fuel = (row.fuelOrFactor || '').toLowerCase()
  const cat = (row.category || '').toLowerCase()
  const qty = Number(row.quantity) || 0
  if (qty <= 0) return 0

  if (cat.includes('refrigerant') || cat.includes('hfc') || cat.includes('pfc')) {
    const r = matchByName(REFRIGERANTS, fuel)
    if (r) return qty * r.gwp
  }

  if (cat.includes('mobile')) {
    const f = matchByName(MOBILE_FUELS, fuel)
    if (f) return fuelKgCo2e(f, qty)
  }

  if (cat.includes('stationary') || cat.includes('combustion') || cat.includes('flaring') || cat.includes('venting')) {
    const f = matchByName(STATIONARY_FUELS, fuel) ?? matchByName(MOBILE_FUELS, fuel)
    if (f) return fuelKgCo2e(f, qty)
  }

  if (cat.includes('electricity') || row.unit?.toLowerCase() === 'kwh') {
    const g = matchByName(GRID_FACTORS, fuel) ?? GRID_FACTORS.find(g => g.region === 'TH')
    if (g) return qty * g.ef
  }

  if (cat.includes('heat') || cat.includes('steam') || cat.includes('cooling')) {
    return qty * 0.27
  }

  // Scope 3 — spend-based and transport-based estimators
  const unit = (row.unit || '').toLowerCase()
  if (unit === 'usd') return qty * 0.3 // ~0.3 kg CO2e / USD spend (mid-range EEIO)
  if (unit === 'tonne-km') return qty * 0.1
  if (unit === 'pax-km') return qty * 0.15
  if (unit === 'room-nights') return qty * 25
  if (unit === 'tonnes' && cat.includes('waste')) return qty * 450 // landfill avg

  return 0
}

export interface EmissionsTotals {
  scope1: number
  scope2: number
  scope3: number
  total: number
  rows: number
  perScope: Record<string, { rows: number; tCo2e: number }>
}

export function computeEmissionsTotals(rows: ExcelRow[]): EmissionsTotals {
  const perScope: Record<string, { rows: number; tCo2e: number }> = {}
  let scope1 = 0, scope2 = 0, scope3 = 0
  for (const r of rows) {
    const kg = computeRowKgCo2e(r)
    const t = kg / 1000
    const key = r.scope || 'Unknown'
    if (!perScope[key]) perScope[key] = { rows: 0, tCo2e: 0 }
    perScope[key].rows += 1
    perScope[key].tCo2e += t
    if (key.includes('1')) scope1 += t
    else if (key.includes('2')) scope2 += t
    else if (key.includes('3')) scope3 += t
  }
  return {
    scope1: round1(scope1),
    scope2: round1(scope2),
    scope3: round1(scope3),
    total: round1(scope1 + scope2 + scope3),
    rows: rows.length,
    perScope,
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Pick the value (in tCO2e) for an assignment based on its gri_code. */
export function valueForAssignment(gri_code: string, totals: EmissionsTotals): number | null {
  const code = gri_code.trim()
  if (code === '305-1' || code.startsWith('305-1')) return totals.scope1
  if (code === '305-2' || code.startsWith('305-2')) return totals.scope2
  if (code === '305-3' || code.startsWith('305-3')) return totals.scope3
  if (code === '305-4' || code.startsWith('305-4')) return totals.total
  return null
}
