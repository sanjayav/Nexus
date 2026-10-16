/**
 * Mainland China emission factors for the DB-backed EF library
 * (`emission_factors` table, see api/setup.ts).
 *
 * Row shape is identical to the `EFRow` tuple used by the main EF seed in
 * api/setup.ts, and the insert below is the same idempotent
 * `ON CONFLICT DO NOTHING` statement, so calling this from setup is safe to
 * re-run. It is NOT wired into setup automatically — the caller (setup.ts
 * owner) adds `await seedCnEmissionFactors(sql)` right after the main
 * `efRows` loop.
 *
 * Sources
 * ─ Grid (2023 data, MEE + NBS): 《关于发布2023年电力二氧化碳排放因子的公告》
 *   (生态环境部、国家统计局, published 2025-12-31). Values verified against the
 *   MEE press Q&A of 2026-01-05:
 *     https://www.mee.gov.cn/ywdt/zbft/202601/t20260105_1139911.shtml
 *   announcement: https://www.mee.gov.cn/xxgk2018/xxgk/xxgk01/202512/t20251231_1139517.html
 *     national average (location-based)                    0.5306 kgCO2/kWh
 *     national average excl. market-traded non-fossil
 *       power (market-based residual; green power = 0)      0.6096 kgCO2/kWh
 *     national fossil-fuel power                            0.8273 kgCO2/kWh
 *     regional: North 0.6361, Northeast 0.5122, East 0.5500, Central 0.5271,
 *       Northwest 0.5543, South 0.4042, Southwest 0.2472 kgCO2/kWh
 *   Provincial factors were published in the announcement's annex but are not
 *   seeded here (not verified row by row).
 * ─ Grid (carbon market): MEE notice 环办气候函〔2023〕43号 (关于做好2023—2025年发电行业企业温室气体
 *   排放报告管理有关工作的通知) — 2022 national grid average emission factor
 *   0.5703 tCO2/MWh. CO2 only, as defined by MEE.
 * ─ Fuels: GB/T 32150-2015 (工业企业温室气体排放核算和报告通则) and the MEE/NDRC
 *   industry GHG accounting guidelines — the same default parameters appear in
 *   both. Factor = NCV × carbon content per unit heat × oxidation rate × 44/12
 *   (IPCC 2006 Tier 1/2 method with Chinese default parameters). The MEE
 *   method accounts combustion CO2 only, so CH4/N2O are left NULL rather than
 *   implying a zero.
 *
 * Deliberately omitted (defaults vary materially by coal rank/mine and the
 * guidelines expect measured NCV / carbon content): raw coal, bituminous coal,
 * anthracite, coke. Use site-measured values for these.
 */
import type { Sql } from './_db.js'

export type CnEFRow = [
  scope: 1 | 2 | 3,
  category: string,
  subcategory: string | null,
  fuel_or_activity: string,
  region: string,
  unit: string,
  co2e_per_unit: number,
  co2_per_unit: number | null,
  ch4_per_unit: number | null,
  n2o_per_unit: number | null,
  source: string,
  source_version: string | null,
  valid_from: string,
  notes: string | null,
]

const MEE_GRID_SOURCE = 'MEE 环办气候函〔2023〕43号 — national grid average emission factor'
const MEE_NBS_2023_SOURCE = 'MEE/NBS 关于发布2023年电力二氧化碳排放因子的公告'
const MEE_NBS_2023_URL = 'https://www.mee.gov.cn/ywdt/zbft/202601/t20260105_1139911.shtml'

/**
 * Display names for the 2023 market-based residual and fossil-only rows.
 * They deliberately sort AFTER 'Grid electricity' so callers that take the
 * first CN purchased-electricity row (src/calculators/scope3 makeBrowserEFContext)
 * keep getting a location-based factor.
 */
export const CN_GRID_MARKET_BASED = 'Grid electricity — market-based residual (excl. traded non-fossil)'
export const CN_GRID_FOSSIL_ONLY = 'Grid electricity — fossil-fuel power only'
const GBT_SOURCE = 'GB/T 32150-2015 / MEE industry GHG accounting guidelines (default parameters, IPCC 2006 method)'

export const CN_EMISSION_FACTORS: CnEFRow[] = [
  // ── Scope 2 purchased electricity — China national grid (location-based) ──
  [2, 'purchased_electricity', 'grid', 'Grid electricity', 'CN', 'kgCO2e/kWh',
    0.5703, 0.5703, null, null,
    MEE_GRID_SOURCE, '2022', '2022-01-01',
    '全国电网平均排放因子 0.5703 tCO2/MWh (2022 data year). CO2 only per MEE definition. National carbon market (cn_ets) factor for power-sector MRV; for corporate location-based Scope 2 prefer the 2023 MEE/NBS 0.5306 row.'],

  // ── 2023 MEE/NBS electricity CO2 factors (verified, see header) ──
  [2, 'purchased_electricity', 'grid', 'Grid electricity', 'CN', 'kgCO2e/kWh',
    0.5306, 0.5306, null, null,
    MEE_NBS_2023_SOURCE, '2023', '2023-01-01',
    `全国电力平均二氧化碳排放因子 0.5306 kgCO2/kWh (2023 data; 2022: 0.5366). Location-based Scope 2. CO2 only. Source: ${MEE_NBS_2023_URL}`],
  [2, 'purchased_electricity', 'grid_market_based', CN_GRID_MARKET_BASED, 'CN', 'kgCO2e/kWh',
    0.6096, 0.6096, null, null,
    MEE_NBS_2023_SOURCE, '2023', '2023-01-01',
    `全国电力平均二氧化碳排放因子（不包括市场化交易的非化石能源电量）0.6096 kgCO2/kWh (2023 data; 2022: 0.5856). Market-based Scope 2: green power / 绿证-backed MWh count as 0, remaining purchased MWh use this factor. CO2 only. Source: ${MEE_NBS_2023_URL}`],
  [2, 'purchased_electricity', 'grid_fossil', CN_GRID_FOSSIL_ONLY, 'CN', 'kgCO2e/kWh',
    0.8273, 0.8273, null, null,
    MEE_NBS_2023_SOURCE, '2023', '2023-01-01',
    `全国化石能源电力二氧化碳排放因子 0.8273 kgCO2/kWh (2023 data; 2022: 0.8325). For cases that account only fossil-fuel electricity. CO2 only. Source: ${MEE_NBS_2023_URL}`],
  ...([
    ['CN-NORTH', '华北', 0.6361],
    ['CN-NORTHEAST', '东北', 0.5122],
    ['CN-EAST', '华东', 0.5500],
    ['CN-CENTRAL', '华中', 0.5271],
    ['CN-NORTHWEST', '西北', 0.5543],
    ['CN-SOUTH', '南方', 0.4042],
    ['CN-SOUTHWEST', '西南', 0.2472],
  ] as const).map(([region, name, v]): CnEFRow => [
    2, 'purchased_electricity', 'grid', 'Grid electricity', region, 'kgCO2e/kWh',
    v, v, null, null,
    MEE_NBS_2023_SOURCE, '2023', '2023-01-01',
    `${name}区域电力平均二氧化碳排放因子 ${v.toFixed(4)} kgCO2/kWh (2023 data). Location-based Scope 2 for sites on the ${name} grid. CO2 only. Source: ${MEE_NBS_2023_URL}`,
  ]),

  // ── Scope 1 stationary combustion — Chinese default parameters ──
  [1, 'stationary_combustion', 'gaseous_fuel', 'Natural gas', 'CN', 'kgCO2e/m3',
    2.1622, 2.1622, null, null,
    GBT_SOURCE, '2015', '2016-06-01',
    '天然气: NCV 389.31 GJ/10⁴Nm³ × 15.30 tC/TJ × 99% oxidation × 44/12 = 21.622 tCO2/10⁴Nm³ (per Nm³). CO2 only.'],
  [1, 'stationary_combustion', 'liquid_fuel', 'Diesel oil', 'CN', 'kgCO2e/tonne',
    3095.9, 3095.9, null, null,
    GBT_SOURCE, '2015', '2016-06-01',
    '柴油: NCV 42.652 GJ/t × 20.20 tC/TJ × 98% × 44/12 = 3.0959 tCO2/t. CO2 only.'],
  [1, 'stationary_combustion', 'liquid_fuel', 'Gasoline', 'CN', 'kgCO2e/tonne',
    2925.1, 2925.1, null, null,
    GBT_SOURCE, '2015', '2016-06-01',
    '汽油: NCV 43.070 GJ/t × 18.90 tC/TJ × 98% × 44/12 = 2.9251 tCO2/t. CO2 only.'],
  [1, 'stationary_combustion', 'liquid_fuel', 'Fuel oil', 'CN', 'kgCO2e/tonne',
    3170.5, 3170.5, null, null,
    GBT_SOURCE, '2015', '2016-06-01',
    '燃料油: NCV 41.816 GJ/t × 21.10 tC/TJ × 98% × 44/12 = 3.1705 tCO2/t. CO2 only.'],
  [1, 'stationary_combustion', 'liquid_fuel', 'LPG', 'CN', 'kgCO2e/tonne',
    3101.3, 3101.3, null, null,
    GBT_SOURCE, '2015', '2016-06-01',
    '液化石油气: NCV 50.179 GJ/t × 17.20 tC/TJ × 98% × 44/12 = 3.1013 tCO2/t. CO2 only.'],
]

/**
 * Idempotent insert of the China factors. Same statement as the main EF seed
 * in api/setup.ts; the UNIQUE(scope, category, fuel_or_activity, region,
 * source, source_version, valid_from) constraint makes re-runs a no-op, and
 * the existing IEA 'CN' grid row is untouched (different source).
 */
export async function seedCnEmissionFactors(sql: Sql): Promise<number> {
  let n = 0
  for (const [scope, cat, sub, fa, region, unit, co2e, co2, ch4, n2o, source, sver, vfrom, notes] of CN_EMISSION_FACTORS) {
    await sql`
      INSERT INTO emission_factors
        (scope, category, subcategory, fuel_or_activity, region, unit,
         co2e_per_unit, co2_per_unit, ch4_per_unit, n2o_per_unit,
         source, source_version, valid_from, notes)
      VALUES
        (${scope}, ${cat}, ${sub}, ${fa}, ${region}, ${unit},
         ${co2e}, ${co2}, ${ch4}, ${n2o},
         ${source}, ${sver}, ${vfrom}, ${notes})
      ON CONFLICT DO NOTHING
    `
    n++
  }
  return n
}

// ─────────────────────────────────────────────────────────────────────────
// Factor preference (api/emission-factors.ts)
// ─────────────────────────────────────────────────────────────────────────

export interface RankableFactor {
  scope: number
  category: string
  fuel_or_activity: string
  region: string
  source: string
  valid_from: string | Date
  notes: string | null
}

/** Unverified values never become a default. */
export function isUnverifiedFactor(f: Pick<RankableFactor, 'notes'>): boolean {
  return Boolean(f.notes && f.notes.includes('[unverified]'))
}

/** Official mainland sources: MEE (生态环境部, incl. MEE/NBS joint) and GB/T national standards. */
export function isOfficialCnSource(source: string): boolean {
  return /^(MEE|GB\/T|生态环境部)/.test(source.trim())
}

export function isCnRegion(region: string): boolean {
  return region === 'CN' || region.startsWith('CN-')
}

function ts(v: string | Date): number {
  const n = (v instanceof Date ? v : new Date(v)).getTime()
  return Number.isFinite(n) ? n : 0
}

/**
 * Preference rank within one (scope, category, fuel_or_activity, region)
 * group — lower is better.
 *   market 'cn' + CN region: verified official China source (newest first) → other verified → unverified.
 *   otherwise: verified (newest first) → unverified. (The previous ordering,
 *   valid_from DESC, is preserved for verified rows.)
 */
export function factorPreferenceRank(f: RankableFactor, market: 'global' | 'cn'): number {
  if (isUnverifiedFactor(f)) return 2
  if (market === 'cn' && isCnRegion(f.region)) return isOfficialCnSource(f.source) ? 0 : 1
  return 0
}

/**
 * Sort factors so that, within each (scope, category, fuel_or_activity,
 * region) group, the preferred row comes first, and flag it `preferred`.
 * Group order is unchanged from the SQL ordering (scope, category,
 * fuel_or_activity, region).
 */
export function sortFactorsByPreference<T extends RankableFactor>(rows: T[], market: 'global' | 'cn'): Array<T & { preferred: boolean }> {
  const groupKey = (r: T) => `${r.scope}|${r.category}|${r.fuel_or_activity}|${r.region}`
  const groupOrder = new Map<string, number>()
  rows.forEach((r, i) => { if (!groupOrder.has(groupKey(r))) groupOrder.set(groupKey(r), i) })
  const sorted = rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const ga = groupOrder.get(groupKey(a.r))!
      const gb = groupOrder.get(groupKey(b.r))!
      if (ga !== gb) return ga - gb
      const ra = factorPreferenceRank(a.r, market)
      const rb = factorPreferenceRank(b.r, market)
      if (ra !== rb) return ra - rb
      const td = ts(b.r.valid_from) - ts(a.r.valid_from)
      if (td !== 0) return td
      return a.i - b.i
    })
  const seen = new Set<string>()
  return sorted.map(({ r }) => {
    const k = groupKey(r)
    const preferred = !seen.has(k) && !isUnverifiedFactor(r)
    seen.add(k)
    return { ...r, preferred }
  })
}
