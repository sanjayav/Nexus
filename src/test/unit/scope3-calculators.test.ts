import { cat01 } from '../../calculators/scope3/cat01_purchasedGoods'
import { cat06 } from '../../calculators/scope3/cat06_businessTravel'
import { cat07 } from '../../calculators/scope3/cat07_employeeCommuting'
import { cat10 } from '../../calculators/scope3/cat10_processingSoldProducts'
import { cat15 } from '../../calculators/scope3/cat15_investments'
import type { Scope3ComputeContext, EmissionFactorRow } from '../../calculators/scope3'

function mockCtx(co2e_per_unit = 2): Scope3ComputeContext {
  return {
    lookupEF: async (q): Promise<EmissionFactorRow> => ({
      scope: q.scope,
      category: q.category,
      fuel_or_activity: q.fuel_or_activity,
      region: q.region ?? 'GLOBAL',
      unit: 'kgCO2e/unit',
      co2e_per_unit,
      source: 'mock',
    }),
  }
}

describe('Scope 3 Cat 1 — Purchased Goods', () => {
  it('supplier_specific returns the supplier-reported tCO2e directly', async () => {
    const method = cat01.methods.find(m => m.id === 'supplier_specific')!
    const out = await method.compute({ supplier_emissions: 42 }, mockCtx())
    expect(out.co2e_tonnes).toBe(42)
  })

  it('activity_based multiplies quantity by looked-up EF', async () => {
    const method = cat01.methods.find(m => m.id === 'activity_based')!
    const out = await method.compute(
      { quantity: 10, material: 'steel', region: 'EU' },
      mockCtx(3.5),
    )
    expect(out.co2e_tonnes).toBe(10 * 3.5)
    expect(out.ef_used?.co2e_per_unit).toBe(3.5)
  })

  it('spend_based applies the EEIO factor for the chosen sector', async () => {
    const method = cat01.methods.find(m => m.id === 'spend_based')!
    // iron_steel factor = 1.20 (kgCO2e/USD) → /1000 → tCO2e
    const out = await method.compute({ spend: 1_000_000, sector: 'iron_steel' }, mockCtx())
    expect(out.co2e_tonnes).toBeCloseTo((1_000_000 * 1.20) / 1000, 6)
  })

  it('spend_based falls back to 0.5 for unknown sectors', async () => {
    const method = cat01.methods.find(m => m.id === 'spend_based')!
    const out = await method.compute({ spend: 1000, sector: 'unknown_xyz' }, mockCtx())
    expect(out.co2e_tonnes).toBeCloseTo((1000 * 0.5) / 1000, 6)
  })
})

describe('Scope 3 Cat 6 — Business Travel', () => {
  it('distance_based — long-haul flight at 0.149 kgCO2e/pkm', async () => {
    const method = cat06.methods.find(m => m.id === 'distance_based')!
    const out = await method.compute({ mode: 'flight_long_haul', pax_km: 10_000 }, mockCtx())
    expect(out.co2e_tonnes).toBeCloseTo((10_000 * 0.149) / 1000, 6)
  })

  it('distance_based — falls back to 0.15 for unknown mode', async () => {
    const method = cat06.methods.find(m => m.id === 'distance_based')!
    const out = await method.compute({ mode: 'rocket', pax_km: 100 }, mockCtx())
    expect(out.co2e_tonnes).toBeCloseTo((100 * 0.15) / 1000, 6)
  })

  it('hotel_nights — UK = 25 kgCO2e/night', async () => {
    const method = cat06.methods.find(m => m.id === 'hotel_nights')!
    const out = await method.compute({ nights: 4, region: 'UK' }, mockCtx())
    expect(out.co2e_tonnes).toBeCloseTo((4 * 25) / 1000, 6)
  })
})

describe('Scope 3 Cat 7 — Employee Commuting', () => {
  it('distance_based applies 2-trip factor and 220-day default workdays', async () => {
    const method = cat07.methods.find(m => m.id === 'distance_based')!
    const out = await method.compute(
      { mode: 'car_petrol', avg_one_way_km: 10, fte: 1, workdays: 220 },
      mockCtx(),
    )
    // pkm = 10 * 2 * 1 * 220 = 4400; co2e = 4400 * 0.171 / 1000
    expect(out.co2e_tonnes).toBeCloseTo((4400 * 0.171) / 1000, 6)
    expect((out.breakdown as { passenger_km: number }).passenger_km).toBe(4400)
  })

  it('bicycle and walk yield zero emissions', async () => {
    const method = cat07.methods.find(m => m.id === 'distance_based')!
    const bike = await method.compute(
      { mode: 'bicycle', avg_one_way_km: 5, fte: 100, workdays: 220 },
      mockCtx(),
    )
    expect(bike.co2e_tonnes).toBe(0)
  })

  it('survey_avg multiplies FTE × per-FTE EF', async () => {
    const method = cat07.methods.find(m => m.id === 'survey_avg')!
    const out = await method.compute({ fte: 50, avg_ef_per_fte: 800 }, mockCtx())
    expect(out.co2e_tonnes).toBeCloseTo((50 * 800) / 1000, 6)
  })
})

describe('Scope 3 Cat 10 — Processing of Sold Products', () => {
  it('mass_based — steel downstream at 850 kgCO2e/t', async () => {
    const method = cat10.methods.find(m => m.id === 'mass_based')!
    const out = await method.compute({ intermediate: 'steel_downstream', tonnes_sold: 100 }, mockCtx())
    expect(out.co2e_tonnes).toBeCloseTo((100 * 850) / 1000, 6)
  })

  it('mass_based — falls back to 400 for unknown intermediate', async () => {
    const method = cat10.methods.find(m => m.id === 'mass_based')!
    const out = await method.compute({ intermediate: 'unobtainium', tonnes_sold: 10 }, mockCtx())
    expect(out.co2e_tonnes).toBeCloseTo((10 * 400) / 1000, 6)
  })
})

describe('Scope 3 Cat 15 — Investments (PCAF)', () => {
  it('equity_share — 25% share of 1000 tCO2e investee → 250 tCO2e', async () => {
    const method = cat15.methods.find(m => m.id === 'equity_share')!
    const out = await method.compute({ investee_scope1_2: 1000, equity_share_pct: 25 }, mockCtx())
    expect(out.co2e_tonnes).toBe(250)
  })

  it('equity_share — defaults to 100% when share omitted', async () => {
    const method = cat15.methods.find(m => m.id === 'equity_share')!
    const out = await method.compute({ investee_scope1_2: 1000 }, mockCtx())
    expect(out.co2e_tonnes).toBe(1000)
  })

  it('project_finance — outstanding / total × emissions', async () => {
    const method = cat15.methods.find(m => m.id === 'project_finance')!
    const out = await method.compute(
      { project_emissions: 800, outstanding_amount: 25_000_000, project_total_value: 100_000_000 },
      mockCtx(),
    )
    expect(out.co2e_tonnes).toBeCloseTo(800 * 0.25, 6)
  })

  it('project_finance — zero project value → zero share (no NaN)', async () => {
    const method = cat15.methods.find(m => m.id === 'project_finance')!
    const out = await method.compute(
      { project_emissions: 800, outstanding_amount: 100, project_total_value: 0 },
      mockCtx(),
    )
    expect(out.co2e_tonnes).toBe(0)
  })

  it('economic_intensity — outstanding × sector_ef / 1000', async () => {
    const method = cat15.methods.find(m => m.id === 'economic_intensity')!
    const out = await method.compute(
      { outstanding_amount: 1_000_000, sector_ef: 0.3 },
      mockCtx(),
    )
    expect(out.co2e_tonnes).toBeCloseTo((1_000_000 * 0.3) / 1000, 6)
  })
})
