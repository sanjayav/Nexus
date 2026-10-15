import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { cors, requirePermission } from '../_auth.js'

// POST /api/calculators/compute
// Body: { calculatorId, methodId, inputs }
// Returns { co2e_tonnes, ef_used, breakdown }
//
// Server-side replication is provided for the 3 most-used Scope 3 categories:
//   - Cat 1 (Purchased Goods)
//   - Cat 6 (Business Travel)
//   - Cat 7 (Employee Commuting)
// Other categories return 501 with "client-side only" — TODO server-side parity.

const Body = z.object({
  calculatorId: z.string(),
  methodId: z.string(),
  inputs: z.record(z.string(), z.union([z.string(), z.number()])),
})

const toNum = (v: unknown, dflt = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : dflt
}

const EEIO_FACTORS: Record<string, number> = {
  agriculture: 0.62, mining: 0.95, utilities: 1.10, construction: 0.48,
  food_beverage: 0.55, textiles_apparel: 0.45, wood_paper: 0.62, chemicals: 0.88,
  pharmaceuticals: 0.34, plastics_rubber: 0.78, cement_concrete: 1.05,
  iron_steel: 1.20, nonferrous_metals: 0.95, fabricated_metal: 0.60,
  machinery: 0.42, electronics: 0.40, electrical_equipment: 0.45,
  motor_vehicles: 0.50, other_transport_equipment: 0.55, furniture: 0.55,
  wholesale_retail: 0.18, transport_warehousing: 0.85, information_telecom: 0.15,
  financial_services: 0.10, real_estate: 0.12, professional_services: 0.16,
  admin_support: 0.22, education_health: 0.18, arts_entertainment: 0.20,
  food_services: 0.38, other_services: 0.30,
}

const TRAVEL_EF: Record<string, number> = {
  flight_short_haul: 0.158, flight_medium_haul: 0.130, flight_long_haul: 0.149,
  rail_intercity: 0.035, rail_metro: 0.029,
  car_petrol: 0.171, car_diesel: 0.165, car_hybrid: 0.110, car_ev: 0.045,
  bus_coach: 0.027, taxi: 0.149,
}
const HOTEL_EF: Record<string, number> = { GLOBAL: 22, UK: 25, US: 30, EU: 18, APAC: 28 }

const COMMUTE_EF: Record<string, number> = {
  car_petrol: 0.171, car_diesel: 0.165, car_hybrid: 0.110, car_ev: 0.045,
  motorcycle: 0.103, bus: 0.103, rail: 0.035, metro: 0.029,
  bicycle: 0, walk: 0, work_from_home: 0,
}

type Result = { co2e_tonnes: number; ef_used?: unknown; breakdown?: Record<string, unknown>; notes?: string }

function computeCat01(methodId: string, inputs: Record<string, string | number>): Result {
  if (methodId === 'supplier_specific') {
    return { co2e_tonnes: toNum(inputs.supplier_emissions) }
  }
  if (methodId === 'activity_based') {
    // Simple mass × generic 2.0 kgCO2e/kg for demo. (Real impl: ctx.lookupEF.)
    return {
      co2e_tonnes: toNum(inputs.quantity) * 2.0,
      notes: 'Server fallback factor — use client EF lookup for production.',
    }
  }
  if (methodId === 'spend_based') {
    const f = EEIO_FACTORS[String(inputs.sector)] ?? 0.5
    return { co2e_tonnes: (toNum(inputs.spend) * f) / 1000, breakdown: { factor_kgCO2e_per_USD: f } }
  }
  throw new Error('Unknown method for Cat 1')
}

function computeCat06(methodId: string, inputs: Record<string, string | number>): Result {
  if (methodId === 'distance_based') {
    const ef = TRAVEL_EF[String(inputs.mode)] ?? 0.15
    return { co2e_tonnes: (toNum(inputs.pax_km) * ef) / 1000, breakdown: { ef_kgCO2e_per_pkm: ef } }
  }
  if (methodId === 'hotel_nights') {
    const ef = HOTEL_EF[String(inputs.region ?? 'GLOBAL')] ?? 22
    return { co2e_tonnes: (toNum(inputs.nights) * ef) / 1000, breakdown: { ef_kgCO2e_per_night: ef } }
  }
  if (methodId === 'spend_based') {
    return { co2e_tonnes: (toNum(inputs.spend) * 0.42) / 1000, breakdown: { factor_kgCO2e_per_USD: 0.42 } }
  }
  throw new Error('Unknown method for Cat 6')
}

function computeCat07(methodId: string, inputs: Record<string, string | number>): Result {
  if (methodId === 'distance_based') {
    const ef = COMMUTE_EF[String(inputs.mode)] ?? 0.15
    const pkm = toNum(inputs.avg_one_way_km) * 2 * toNum(inputs.fte) * toNum(inputs.workdays, 220)
    return { co2e_tonnes: (pkm * ef) / 1000, breakdown: { passenger_km: pkm, ef_kgCO2e_per_pkm: ef } }
  }
  if (methodId === 'survey_avg') {
    return { co2e_tonnes: (toNum(inputs.fte) * toNum(inputs.avg_ef_per_fte, 800)) / 1000 }
  }
  throw new Error('Unknown method for Cat 7')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const t = await requirePermission(req, res, 'calculators.edit')
  if (!t) return

  const parsed = Body.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', issues: parsed.error.flatten() })
  }
  const { calculatorId, methodId, inputs } = parsed.data

  try {
    let result: Result
    switch (calculatorId) {
      case 'scope3_cat01': result = computeCat01(methodId, inputs); break
      case 'scope3_cat06': result = computeCat06(methodId, inputs); break
      case 'scope3_cat07': result = computeCat07(methodId, inputs); break
      default:
        return res.status(501).json({
          error: 'Server-side compute not implemented for this calculator',
          calculatorId,
          note: 'Run client-side for v1; TODO add server parity for Cat 2–5, 8–15.',
        })
    }
    return res.status(200).json(result)
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : 'Compute failed' })
  }
}
