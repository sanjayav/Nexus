import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { cors, requirePermission } from '../_auth.js'

/**
 * POST /api/pcaf/calculate — server-side replica of the PCAF calculators
 *   in src/calculators/pcaf/. Math is intentionally kept in sync with the
 *   client implementation so the unit tests cover both paths (the client
 *   imports from src/, the server runs this file directly).
 *
 * Body: { assetClass, inputs, reportingYear }
 * Returns: PcafResult with attribution factor, financed emissions per
 *   scope, total, data-quality score, rationale, warnings.
 *
 * Does NOT persist — POST /api/pcaf/assets handles persistence so the user
 * can preview before saving.
 */

const ASSET_CLASSES = [
  'listed_equity', 'corporate_bond', 'business_loan', 'unlisted_equity',
  'project_finance', 'commercial_real_estate', 'mortgage',
  'motor_vehicle_loan', 'sovereign_debt',
] as const
type AssetClass = (typeof ASSET_CLASSES)[number]

const Body = z.object({
  assetClass: z.enum(ASSET_CLASSES),
  inputs: z.record(z.string(), z.unknown()),
  reportingYear: z.number().int().min(1990).max(2100),
})

type DQ = 1 | 2 | 3 | 4 | 5
interface PcafResult {
  attributionFactor: number
  financedScope1?: number
  financedScope2?: number
  financedScope3?: number
  financedTotal: number
  dataQualityScore: DQ
  rationale: string
  warnings: string[]
}

const toNum = (v: unknown, dflt = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : dflt
}
const toBool = (v: unknown): boolean => {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v === 'true' || v === '1' || v === 'yes'
  return false
}

function safeAttribution(outstanding: number, totalValue: number): { attr: number; warning?: string } {
  if (!(totalValue > 0)) {
    return { attr: 0, warning: 'Total value missing or zero — attribution set to 0' }
  }
  const raw = outstanding / totalValue
  if (raw > 1.5) return { attr: 1.5, warning: `Attribution factor ${raw.toFixed(2)} >1.5 capped to 1.5` }
  if (raw < 0) return { attr: 0, warning: 'Attribution factor negative — outstanding/total_value must be ≥0' }
  return { attr: raw }
}

function emissionsDataQuality(opts: { reportedEmissions: boolean; verified: boolean; valueKnown: boolean }): DQ {
  const { reportedEmissions, verified, valueKnown } = opts
  if (reportedEmissions && verified && valueKnown) return 1
  if (reportedEmissions && (verified || valueKnown)) return 2
  if (reportedEmissions) return 3
  if (valueKnown) return 4
  return 5
}

// ── Illustrative emission-factor tables (mirrors src/data/pcafEmissionFactors.ts).
// TODO: replace with real PCAF Annex 9 / EXIOBASE / Climate Watch datasets.
const SECTOR_INTENSITY: Record<string, number> = {
  Energy: 1.8, Materials: 1.2, Industrials: 0.5, Utilities: 2.5,
  'Real Estate': 0.15, Financials: 0.05, IT: 0.04, Healthcare: 0.10,
  'Consumer Staples': 0.18, 'Consumer Discretionary': 0.20, Communication: 0.06,
}
const RESIDENTIAL_INTENSITY: Record<string, number> = {
  UK: 22, US: 35, EU: 18, IN: 12, CN: 28, GLOBAL: 25,
}
const COMMERCIAL_BUILDING_INTENSITY: Record<string, number> = {
  Office: 75, Retail: 110, Industrial: 140, Warehouse: 60, Hotel: 160, Healthcare: 220, Mixed: 95,
}
const VEHICLE_ANNUAL: Record<string, number> = {
  car_petrol: 2.4, car_diesel: 2.6, car_hybrid: 1.5, car_ev: 0.5,
  motorcycle: 0.8, van: 3.2, truck: 9.0, unknown: 2.5,
}
const VEHICLE_PER_KM_KG: Record<string, number> = {
  car_petrol: 0.171, car_diesel: 0.165, car_hybrid: 0.110, car_ev: 0.045,
  motorcycle: 0.103, van: 0.220, truck: 0.600, unknown: 0.170,
}
const COUNTRY_PER_GDP: Record<string, number> = {
  US: 280, UK: 175, EU: 195, CN: 480, IN: 410, JP: 240, DE: 175, FR: 145, AU: 320, CA: 305, GLOBAL: 290,
}
const PROJECT_INTENSITY: Record<string, number> = {
  renewable_power: 0.01, fossil_power: 4.5, transmission: 0.02,
  transport_infrastructure: 0.15, oil_gas_upstream: 5.0, oil_gas_midstream: 2.5,
  mining: 1.8, industrial_plant: 1.2, other: 0.5,
}
const SCOPE_SPLIT = { s1: 0.7, s2: 0.3 }

function computeListedOrBond(i: Record<string, unknown>): PcafResult {
  const warnings: string[] = []
  const outstanding = toNum(i.outstandingAmount)
  const valueKnown = toNum(i.evic) > 0
  const evic = valueKnown ? toNum(i.evic) : outstanding * 10
  if (!valueKnown) warnings.push('EVIC estimated — provide actual EVIC for higher data quality')
  const { attr, warning } = safeAttribution(outstanding, evic)
  if (warning) warnings.push(warning)
  const reported = toNum(i.reportedEmissions)
  const reportedS3 = toNum(i.reportedScope3)
  const verified = toBool(i.verifiedByThirdParty)
  const hasReported = reported > 0
  let financedS12 = 0, financedS3 = 0, rationale: string
  if (hasReported) {
    financedS12 = reported * attr
    financedS3 = reportedS3 * attr
    rationale = `Reported emissions × attribution factor (${attr.toFixed(4)})`
  } else {
    const sector = String(i.counterpartySector ?? '')
    const intensity = SECTOR_INTENSITY[sector] ?? 0.3
    const estimatedRevenue = evic * 0.6
    financedS12 = ((estimatedRevenue * intensity) / 1000) * attr
    rationale = `Sector intensity (${intensity} kgCO2e/USD revenue, ${sector}) × est. revenue × attribution`
    warnings.push('Emissions estimated from sector intensity')
  }
  return {
    attributionFactor: attr,
    financedScope1: financedS12 * SCOPE_SPLIT.s1,
    financedScope2: financedS12 * SCOPE_SPLIT.s2,
    financedScope3: financedS3,
    financedTotal: financedS12 + financedS3,
    dataQualityScore: emissionsDataQuality({ reportedEmissions: hasReported, verified, valueKnown }),
    rationale,
    warnings,
  }
}

function computeBusinessLoanOrUnlisted(i: Record<string, unknown>, ownerKey: 'borrower' | 'investee'): PcafResult {
  const warnings: string[] = []
  const outstanding = toNum(i.outstandingAmount)
  const equity = toNum(i[`${ownerKey}Equity`])
  const debt = toNum(i[`${ownerKey}Debt`])
  const total = equity + debt
  const valueKnown = total > 0
  const denom = valueKnown ? total : outstanding * 8
  if (!valueKnown) warnings.push('Equity + debt unknown — using outstanding × 8 proxy')
  const { attr, warning } = safeAttribution(outstanding, denom)
  if (warning) warnings.push(warning)
  const reported = toNum(i.reportedEmissions)
  const reportedS3 = toNum(i.reportedScope3)
  const verified = toBool(i.verifiedByThirdParty)
  const hasReported = reported > 0
  let financedS12 = 0, financedS3 = 0, rationale: string
  if (hasReported) {
    financedS12 = reported * attr
    financedS3 = reportedS3 * attr
    rationale = `Reported emissions × attribution factor (${attr.toFixed(4)})`
  } else {
    const sector = String(i.counterpartySector ?? '')
    const intensity = SECTOR_INTENSITY[sector] ?? 0.3
    const estimatedRevenue = denom * 0.8
    financedS12 = ((estimatedRevenue * intensity) / 1000) * attr
    rationale = `Sector intensity (${intensity} kgCO2e/USD, ${sector}) × revenue proxy × attribution`
    warnings.push('Emissions estimated from sector intensity')
  }
  return {
    attributionFactor: attr,
    financedScope1: financedS12 * SCOPE_SPLIT.s1,
    financedScope2: financedS12 * SCOPE_SPLIT.s2,
    financedScope3: financedS3,
    financedTotal: financedS12 + financedS3,
    dataQualityScore: emissionsDataQuality({ reportedEmissions: hasReported, verified, valueKnown }),
    rationale,
    warnings,
  }
}

function computeProjectFinance(i: Record<string, unknown>): PcafResult {
  const warnings: string[] = []
  const outstanding = toNum(i.outstandingAmount)
  const equity = toNum(i.projectEquity)
  const debt = toNum(i.projectDebt)
  const total = equity + debt
  const valueKnown = total > 0
  const denom = valueKnown ? total : outstanding * 1.3
  if (!valueKnown) warnings.push('Project capital stack unknown — using loan × 1.3 proxy')
  const { attr, warning } = safeAttribution(outstanding, denom)
  if (warning) warnings.push(warning)
  const reported = toNum(i.reportedEmissions)
  const verified = toBool(i.verifiedByThirdParty)
  const hasReported = reported > 0
  let financedTotal = 0, rationale: string
  if (hasReported) {
    financedTotal = reported * attr
    rationale = `Project annual emissions × attribution factor (${attr.toFixed(4)})`
  } else {
    const projectType = String(i.projectType ?? 'other')
    const intensity = PROJECT_INTENSITY[projectType] ?? 0.5
    financedTotal = ((denom * intensity) / 1000) * attr
    rationale = `Project-type intensity (${intensity} kgCO2e/USD, ${projectType}) × project value × attribution`
    warnings.push('Project emissions estimated from project-type intensity')
  }
  return {
    attributionFactor: attr,
    financedScope1: financedTotal * SCOPE_SPLIT.s1,
    financedScope2: financedTotal * SCOPE_SPLIT.s2,
    financedTotal,
    dataQualityScore: emissionsDataQuality({ reportedEmissions: hasReported, verified, valueKnown }),
    rationale,
    warnings,
  }
}

function computeCommercialRealEstate(i: Record<string, unknown>): PcafResult {
  const warnings: string[] = []
  const outstanding = toNum(i.outstandingAmount)
  const propertyValue = toNum(i.propertyValue)
  const valueKnown = propertyValue > 0
  const denom = valueKnown ? propertyValue : outstanding * 1.4
  if (!valueKnown) warnings.push('Property value missing — using loan × 1.4 proxy')
  const { attr, warning } = safeAttribution(outstanding, denom)
  if (warning) warnings.push(warning)
  const measured = toNum(i.measuredAnnualEmissions)
  const floorArea = toNum(i.floorAreaM2)
  const buildingType = String(i.buildingType ?? '')
  const intensity = COMMERCIAL_BUILDING_INTENSITY[buildingType] ?? 100
  const verified = toBool(i.verifiedByThirdParty)
  let buildingEmissions = 0, rationale: string, dq: DQ = 5
  if (measured > 0) {
    buildingEmissions = measured
    rationale = `Measured annual emissions × attribution factor (${attr.toFixed(4)})`
    dq = verified && valueKnown ? 1 : valueKnown || verified ? 2 : 3
  } else if (floorArea > 0) {
    buildingEmissions = (floorArea * intensity) / 1000
    rationale = `Floor area ${floorArea} m² × ${intensity} kgCO2e/m² (${buildingType}) × attribution`
    dq = valueKnown ? 3 : 4
    warnings.push('Floor-area intensity estimate')
  } else {
    rationale = 'No measured emissions, no floor area — cannot compute building emissions'
    warnings.push('Provide measured emissions or floor area + building type')
  }
  const financedTotal = buildingEmissions * attr
  return {
    attributionFactor: attr,
    financedScope1: financedTotal * 0.5,
    financedScope2: financedTotal * 0.5,
    financedTotal,
    dataQualityScore: dq,
    rationale,
    warnings,
  }
}

function computeMortgage(i: Record<string, unknown>): PcafResult {
  const warnings: string[] = []
  const outstanding = toNum(i.outstandingAmount)
  const propertyValue = toNum(i.propertyValue)
  const valueKnown = propertyValue > 0
  const denom = valueKnown ? propertyValue : outstanding * 1.25
  if (!valueKnown) warnings.push('Property value missing — using loan × 1.25 proxy (~80% LTV)')
  const { attr, warning } = safeAttribution(outstanding, denom)
  if (warning) warnings.push(warning)
  const measured = toNum(i.measuredAnnualEmissions)
  const floorArea = toNum(i.floorAreaM2)
  const country = String(i.counterpartyCountry ?? 'GLOBAL')
  const intensity = RESIDENTIAL_INTENSITY[country] ?? RESIDENTIAL_INTENSITY.GLOBAL
  const verified = toBool(i.verifiedByThirdParty)
  let householdEmissions = 0, rationale: string, dq: DQ = 5
  if (measured > 0) {
    householdEmissions = measured
    rationale = `Measured household emissions × attribution factor (${attr.toFixed(4)})`
    dq = verified && valueKnown ? 1 : valueKnown || verified ? 2 : 3
  } else if (floorArea > 0) {
    householdEmissions = (floorArea * intensity) / 1000
    rationale = `Floor area ${floorArea} m² × ${intensity} kgCO2e/m² (${country}) × attribution`
    dq = valueKnown ? 4 : 5
    warnings.push('Household emissions estimated from country residential intensity')
  } else {
    householdEmissions = (100 * intensity) / 1000
    rationale = `Typical 100 m² × ${intensity} kgCO2e/m² (${country}) × attribution`
    warnings.push('Floor area missing — using typical 100 m² household')
  }
  const financedTotal = householdEmissions * attr
  return {
    attributionFactor: attr,
    financedScope1: financedTotal * 0.6,
    financedScope2: financedTotal * 0.4,
    financedTotal,
    dataQualityScore: dq,
    rationale,
    warnings,
  }
}

function computeMotorVehicleLoan(i: Record<string, unknown>): PcafResult {
  const warnings: string[] = []
  const outstanding = toNum(i.outstandingAmount)
  const vehicleValue = toNum(i.vehicleValue)
  const valueKnown = vehicleValue > 0
  const denom = valueKnown ? vehicleValue : outstanding * 1.15
  if (!valueKnown) warnings.push('Vehicle value missing — using loan × 1.15 proxy')
  const { attr, warning } = safeAttribution(outstanding, denom)
  if (warning) warnings.push(warning)
  const measured = toNum(i.measuredAnnualEmissions)
  const annualKm = toNum(i.annualDistanceKm)
  const vehicleType = String(i.vehicleType ?? 'unknown')
  const verified = toBool(i.verifiedByThirdParty)
  const fleet = VEHICLE_ANNUAL[vehicleType] ?? VEHICLE_ANNUAL.unknown
  let annualEmissions = 0, rationale: string, dq: DQ = 5
  if (measured > 0) {
    annualEmissions = measured
    rationale = `Measured annual emissions × attribution factor (${attr.toFixed(4)})`
    dq = verified && valueKnown ? 1 : valueKnown || verified ? 2 : 3
  } else if (annualKm > 0) {
    const ef = VEHICLE_PER_KM_KG[vehicleType] ?? VEHICLE_PER_KM_KG.unknown
    annualEmissions = (annualKm * ef) / 1000
    rationale = `${annualKm} km × ${ef} kgCO2e/km (${vehicleType}) × attribution`
    dq = valueKnown ? 3 : 4
  } else {
    annualEmissions = fleet
    rationale = `Fleet average ${fleet} tCO2e/year (${vehicleType}) × attribution`
    dq = valueKnown ? 4 : 5
    warnings.push('Annual distance unknown — using fleet average')
  }
  const financedTotal = annualEmissions * attr
  return {
    attributionFactor: attr,
    financedScope1: financedTotal,
    financedTotal,
    dataQualityScore: dq,
    rationale,
    warnings,
  }
}

function computeSovereignDebt(i: Record<string, unknown>): PcafResult {
  const warnings: string[] = []
  const outstanding = toNum(i.outstandingAmount)
  const gdpMillions = toNum(i.gdpPppMillions)
  const valueKnown = gdpMillions > 0
  const denomUsd = valueKnown ? gdpMillions * 1_000_000 : outstanding * 1_000_000
  if (!valueKnown) warnings.push('GDP-PPP missing — using outstanding as denominator')
  const { attr, warning } = safeAttribution(outstanding, denomUsd)
  if (warning) warnings.push(warning)
  const country = String(i.counterpartyCountry ?? 'GLOBAL')
  const reportedMt = toNum(i.reportedCountryEmissionsMt)
  const verified = toBool(i.verifiedByThirdParty)
  let countryEmissions = 0, rationale: string, dq: DQ
  if (reportedMt > 0) {
    countryEmissions = reportedMt * 1_000_000
    rationale = `Reported country emissions ${reportedMt} MtCO2e × attribution (${attr.toFixed(6)})`
    dq = verified && valueKnown ? 1 : valueKnown || verified ? 2 : 3
  } else {
    const per = COUNTRY_PER_GDP[country] ?? COUNTRY_PER_GDP.GLOBAL
    countryEmissions = per * (valueKnown ? gdpMillions : 0)
    rationale = `Country EF ${per} tCO2e/USDm (${country}) × GDP-PPP × attribution`
    dq = valueKnown ? 4 : 5
    warnings.push('Country emissions estimated from per-GDP intensity table')
  }
  const financedTotal = countryEmissions * attr
  return {
    attributionFactor: attr,
    financedScope1: financedTotal,
    financedTotal,
    dataQualityScore: dq,
    rationale,
    warnings,
  }
}

function dispatch(assetClass: AssetClass, inputs: Record<string, unknown>): PcafResult {
  switch (assetClass) {
    case 'listed_equity':
    case 'corporate_bond':
      return computeListedOrBond(inputs)
    case 'business_loan':
      return computeBusinessLoanOrUnlisted(inputs, 'borrower')
    case 'unlisted_equity':
      return computeBusinessLoanOrUnlisted(inputs, 'investee')
    case 'project_finance':
      return computeProjectFinance(inputs)
    case 'commercial_real_estate':
      return computeCommercialRealEstate(inputs)
    case 'mortgage':
      return computeMortgage(inputs)
    case 'motor_vehicle_loan':
      return computeMotorVehicleLoan(inputs)
    case 'sovereign_debt':
      return computeSovereignDebt(inputs)
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res, req)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const token = await requirePermission(req, res, 'calculators.edit')
  if (!token) return

  const parsed = Body.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid body', issues: parsed.error.flatten() })
  }
  // Guard against negative money / emissions sneaking in via the unknown record.
  for (const [k, v] of Object.entries(parsed.data.inputs)) {
    if (typeof v === 'number' && v < 0) {
      return res.status(400).json({ error: `Field "${k}" must be ≥ 0` })
    }
  }

  try {
    const result = dispatch(parsed.data.assetClass, parsed.data.inputs)
    return res.status(200).json({
      ...result,
      methodologyUrl: 'https://carbonaccountingfinancials.com/files/downloads/PCAF-Global-GHG-Standard.pdf',
    })
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : 'PCAF compute failed' })
  }
}
