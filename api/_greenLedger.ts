/**
 * Green power / energy attribute certificates and carbon-credit ledger —
 * validation schemas and the pure totals calculation used by
 * /api/green-certificates. Tables: energy_attribute_certificates and
 * carbon_credits (api/_cnSchema.ts).
 */
import { z } from 'zod'

/** 绿证 GEC, 绿电交易 green-power trade, I-REC, PPA, other. */
export const INSTRUMENT_TYPES = ['gec', 'green_power_trade', 'irec', 'ppa', 'other'] as const
/** CCER (国家核证自愿减排量), CEA (全国碳排放配额), VCS (Verra), GS (Gold Standard), CDM, other. */
export const CREDIT_STANDARDS = ['CCER', 'CEA', 'VCS', 'GS', 'CDM', 'other'] as const

/**
 * China market-based residual factor (2023 data, MEE/NBS) — national average
 * excluding market-traded non-fossil power. Verified:
 * https://www.mee.gov.cn/ywdt/zbft/202601/t20260105_1139911.shtml
 */
export const CN_RESIDUAL_FACTOR_KG_PER_KWH = 0.6096

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dates must be YYYY-MM-DD')
const optText = (max: number) => z.string().trim().max(max).nullable().optional()

export const certificateCreateSchema = z.object({
  kind: z.literal('eac'),
  instrument_type: z.enum(INSTRUMENT_TYPES),
  mwh: z.number().positive().max(1e9),
  period_start: isoDate,
  period_end: isoDate,
  certificate_id: optText(200),
  facility_id: z.string().uuid().nullable().optional(),
  entity_id: z.string().uuid().nullable().optional(),
  supplier: optText(200),
  energy_source: optText(60),
  province: optText(60),
  evidence_id: z.string().uuid().nullable().optional(),
  notes: optText(2000),
}).strict().refine(v => v.period_start <= v.period_end, { message: 'period_start must be on or before period_end' })

export const certificateUpdateSchema = z.object({
  instrument_type: z.enum(INSTRUMENT_TYPES).optional(),
  mwh: z.number().positive().max(1e9).optional(),
  period_start: isoDate.optional(),
  period_end: isoDate.optional(),
  certificate_id: optText(200),
  facility_id: z.string().uuid().nullable().optional(),
  entity_id: z.string().uuid().nullable().optional(),
  supplier: optText(200),
  energy_source: optText(60),
  province: optText(60),
  evidence_id: z.string().uuid().nullable().optional(),
  notes: optText(2000),
}).strict()

export const creditCreateSchema = z.object({
  kind: z.literal('credit'),
  standard: z.enum(CREDIT_STANDARDS),
  tco2e: z.number().positive().max(1e9),
  vintage: z.number().int().min(1990).max(2100).nullable().optional(),
  registry_id: optText(200),
  project_name: optText(300),
  project_type: optText(120),
  retired: z.boolean().optional(),
  retired_on: isoDate.nullable().optional(),
  reporting_year: z.number().int().min(2000).max(2100).nullable().optional(),
  purpose: optText(300),
  evidence_id: z.string().uuid().nullable().optional(),
  notes: optText(2000),
}).strict()

export const creditPatchSchema = z.object({
  standard: z.enum(CREDIT_STANDARDS).optional(),
  tco2e: z.number().positive().max(1e9).optional(),
  vintage: z.number().int().min(1990).max(2100).nullable().optional(),
  registry_id: optText(200),
  project_name: optText(300),
  project_type: optText(120),
  retired: z.boolean().optional(),
  retired_on: isoDate.nullable().optional(),
  reporting_year: z.number().int().min(2000).max(2100).nullable().optional(),
  purpose: optText(300),
  evidence_id: z.string().uuid().nullable().optional(),
  notes: optText(2000),
}).strict()

export interface CertificateRow {
  instrument_type: string
  mwh: number | string
  period_start: string | Date
  period_end: string | Date
}

export interface CreditRow {
  standard: string
  tco2e: number | string
  vintage: number | null
  retired: boolean
  retired_on: string | Date | null
  reporting_year: number | null
}

function toDateStr(v: string | Date): string {
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
}

const DAY = 86_400_000
function dayNum(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY)
}

/** Share of a certificate's MWh that falls inside calendar `year` (inclusive day pro-rata). */
export function mwhInYear(c: CertificateRow, year: number): number {
  const start = dayNum(toDateStr(c.period_start))
  const end = dayNum(toDateStr(c.period_end))
  const total = end - start + 1
  if (!Number.isFinite(total) || total <= 0) return 0
  const ys = dayNum(`${year}-01-01`)
  const ye = dayNum(`${year}-12-31`)
  const overlap = Math.min(end, ye) - Math.max(start, ys) + 1
  if (overlap <= 0) return 0
  return Number(c.mwh) * (overlap / total)
}

/** Year a retired credit counts toward: reporting_year, else the retirement date's year. */
export function creditYear(c: CreditRow): number | null {
  if (c.reporting_year != null) return c.reporting_year
  if (c.retired_on) return Number(toDateStr(c.retired_on).slice(0, 4))
  return null
}

const round = (x: number, dp = 3) => Math.round(x * 10 ** dp) / 10 ** dp

export interface LedgerTotals {
  year: number
  certificates: {
    total_mwh: number
    by_type: Record<string, number>
  }
  credits: {
    retired_tco2e: number
    ccer_retired_tco2e: number
    by_standard: Record<string, number>
    by_vintage: Record<string, number>
  }
  market_based_scope2: {
    purchased_mwh: number | null
    certified_mwh: number
    /** Certified MWh actually applied (capped at purchased MWh when known). */
    applied_certified_mwh: number
    residual_mwh: number | null
    residual_factor_kg_per_kwh: number | null
    market_based_tco2e: number | null
    note: string
  }
  cn_sse_climate: {
    carbon_credits_retired_tco2e: number
    ccer_retired_tco2e: number
    green_certificate_mwh: number
    green_power_trade_mwh: number
    renewable_share_pct: number | null
  }
}

export function computeLedgerTotals(args: {
  year: number
  certificates: CertificateRow[]
  credits: CreditRow[]
  purchasedMwh?: number | null
  residualFactorKgPerKwh?: number | null
}): LedgerTotals {
  const byType: Record<string, number> = {}
  let certified = 0
  for (const c of args.certificates) {
    const m = mwhInYear(c, args.year)
    if (m <= 0) continue
    byType[c.instrument_type] = (byType[c.instrument_type] ?? 0) + m
    certified += m
  }
  for (const k of Object.keys(byType)) byType[k] = round(byType[k])

  const byStandard: Record<string, number> = {}
  const byVintage: Record<string, number> = {}
  let retired = 0
  for (const c of args.credits) {
    if (!c.retired) continue
    if (creditYear(c) !== args.year) continue
    const v = Number(c.tco2e)
    if (!Number.isFinite(v)) continue
    retired += v
    byStandard[c.standard] = round((byStandard[c.standard] ?? 0) + v)
    const vk = c.vintage != null ? String(c.vintage) : 'unknown'
    byVintage[vk] = round((byVintage[vk] ?? 0) + v)
  }

  const purchased = args.purchasedMwh != null && Number.isFinite(args.purchasedMwh) ? args.purchasedMwh : null
  const applied = purchased != null ? Math.min(certified, purchased) : certified
  const residual = purchased != null ? Math.max(purchased - applied, 0) : null
  const factor = args.residualFactorKgPerKwh ?? null
  // kg/kWh == t/MWh
  const marketBased = residual != null && factor != null ? residual * factor : null

  return {
    year: args.year,
    certificates: { total_mwh: round(certified), by_type: byType },
    credits: {
      retired_tco2e: round(retired),
      ccer_retired_tco2e: round(byStandard.CCER ?? 0),
      by_standard: byStandard,
      by_vintage: byVintage,
    },
    market_based_scope2: {
      purchased_mwh: purchased != null ? round(purchased) : null,
      certified_mwh: round(certified),
      applied_certified_mwh: round(applied),
      residual_mwh: residual != null ? round(residual) : null,
      residual_factor_kg_per_kwh: factor,
      market_based_tco2e: marketBased != null ? round(marketBased) : null,
      note: 'Market-based Scope 2 = (purchased MWh − certified green MWh) × residual factor; certified green power counts as 0 (MEE/NBS 2023 guidance). CO2 only.',
    },
    cn_sse_climate: {
      carbon_credits_retired_tco2e: round(retired),
      ccer_retired_tco2e: round(byStandard.CCER ?? 0),
      green_certificate_mwh: round(byType.gec ?? 0),
      green_power_trade_mwh: round(byType.green_power_trade ?? 0),
      renewable_share_pct: purchased != null && purchased > 0 ? round((applied / purchased) * 100, 2) : null,
    },
  }
}
