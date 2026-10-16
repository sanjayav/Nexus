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
 * ─ Grid: MEE notice 环办气候函〔2023〕43号 (关于做好2023—2025年发电行业企业温室气体
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
const GBT_SOURCE = 'GB/T 32150-2015 / MEE industry GHG accounting guidelines (default parameters, IPCC 2006 method)'

export const CN_EMISSION_FACTORS: CnEFRow[] = [
  // ── Scope 2 purchased electricity — China national grid (location-based) ──
  [2, 'purchased_electricity', 'grid', 'Grid electricity', 'CN', 'kgCO2e/kWh',
    0.5703, 0.5703, null, null,
    MEE_GRID_SOURCE, '2022', '2022-01-01',
    '全国电网平均排放因子 0.5703 tCO2/MWh (2022 data year). CO2 only per MEE definition. Location-based Scope 2 for mainland China sites.'],

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
