import { STAGES, type CbamLine, type PassportStatus, type Product, type Stage } from './data'

/*
 * What-if model for product carbon footprints. Deliberately simple and linear so
 * a reviewer can reproduce it by hand:
 *
 *   ΔE_elec = kWh/unit × (g − g₀) × (EF_grid − EF_green)
 *   ΔE_al   = kg Al/unit × (r − r₀) × (EF_primary − EF_recycled)
 *   PCF′    = PCF − ΔE_elec − ΔE_al
 *
 * g / g₀: green-power share of manufacturing electricity (scenario / baseline)
 * r / r₀: recycled share of aluminium (scenario / baseline)
 * EF_grid: the product's grid factor (CN: 电力碳足迹因子 2024, 0.5777 kgCO₂e/kWh)
 * EF_green: green power evidenced by 绿电 / 绿证, taken as 0 here (illustrative)
 * EF_primary / EF_recycled: illustrative cradle-to-gate aluminium factors
 *
 * The electricity delta is taken off the product's configured stage (usually
 * manufacturing); the aluminium delta comes off raw-material acquisition. The
 * data is set up so neither stage can go negative at 100%.
 */

export const GREEN_POWER_FACTOR = 0
export const PRIMARY_ALUMINIUM_FACTOR = 16.5
export const RECYCLED_ALUMINIUM_FACTOR = 0.6

export interface Scenario {
  green: number
  recycled: number
}

export const baselineScenario = (p: Product): Scenario => ({
  green: p.electricity.baselineGreen,
  recycled: p.aluminium?.baselineRecycled ?? 0,
})

export const pcfOf = (stages: Record<Stage, number>) => STAGES.reduce((sum, st) => sum + stages[st], 0)

export function scenarioStages(p: Product, sc: Scenario): Record<Stage, number> {
  const elec = p.electricity.kwhPerUnit * ((sc.green - p.electricity.baselineGreen) / 100) * (p.electricity.factor - GREEN_POWER_FACTOR)
  const al = p.aluminium
    ? p.aluminium.kgPerUnit * ((sc.recycled - p.aluminium.baselineRecycled) / 100) * (PRIMARY_ALUMINIUM_FACTOR - RECYCLED_ALUMINIUM_FACTOR)
    : 0
  const out = { ...p.stages }
  out[p.electricity.stage] = Math.max(0, out[p.electricity.stage] - elec)
  out.raw = Math.max(0, out.raw - al)
  return out
}

/* ---------- Battery passport ---------- */

const STATUS_WEIGHT: Record<PassportStatus, number> = { done: 1, inProgress: 0.5, notStarted: 0, blocked: 0 }

/** Readiness %, with in-progress items counted at half weight. */
export const readiness = (statuses: PassportStatus[]) =>
  statuses.length === 0 ? 0 : (statuses.reduce((sum, st) => sum + STATUS_WEIGHT[st], 0) / statuses.length) * 100

/* ---------- CBAM ---------- */

/** Specific embedded emissions used for the estimate: actual where reported, else the EU default. */
export function seeOf(line: CbamLine, includeIndirect: boolean) {
  const src = line.basis === 'actual' && line.actual ? line.actual : line.defaults
  return src.direct + (includeIndirect ? src.indirect : 0)
}

export const embeddedOf = (line: CbamLine, includeIndirect: boolean) => line.tonnes * seeOf(line, includeIndirect)

/**
 * Gross certificate exposure = Σ tonnes × SEE × EU carbon price.
 * Not modelled (to be verified): phase-in of EU free allocation adjustment and
 * deduction of a carbon price effectively paid in China.
 */
export const cbamExposure = (lines: CbamLine[], price: number, includeIndirect: boolean) =>
  lines.reduce((sum, l) => sum + embeddedOf(l, includeIndirect), 0) * price

/** Round for machine-readable export without locale formatting. */
export const round = (n: number, digits: number) => Number(n.toFixed(digits))
