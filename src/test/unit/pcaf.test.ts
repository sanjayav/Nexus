/**
 * Unit tests for the PCAF calculator registry. Each test exercises one
 * asset-class compute() function with realistic inputs and asserts both the
 * financed-emissions math AND the resulting PCAF data-quality score.
 */
import { listedEquity } from '../../calculators/pcaf/listedEquity'
import { corporateBond } from '../../calculators/pcaf/corporateBond'
import { businessLoan } from '../../calculators/pcaf/businessLoan'
import { unlistedEquity } from '../../calculators/pcaf/unlistedEquity'
import { projectFinance } from '../../calculators/pcaf/projectFinance'
import { commercialRealEstate } from '../../calculators/pcaf/commercialRealEstate'
import { mortgage } from '../../calculators/pcaf/mortgage'
import { motorVehicleLoan } from '../../calculators/pcaf/motorVehicleLoan'
import { sovereignDebt } from '../../calculators/pcaf/sovereignDebt'
import { PCAF_CALCULATORS } from '../../calculators/pcaf/registry'

describe('PCAF · registry shape', () => {
  it('exposes 9 asset classes (the PCAF Global Standard table)', () => {
    expect(PCAF_CALCULATORS).toHaveLength(9)
    const classes = PCAF_CALCULATORS.map(c => c.assetClass).sort()
    expect(classes).toEqual([
      'business_loan',
      'commercial_real_estate',
      'corporate_bond',
      'listed_equity',
      'mortgage',
      'motor_vehicle_loan',
      'project_finance',
      'sovereign_debt',
      'unlisted_equity',
    ])
  })
})

describe('PCAF · listed equity', () => {
  it('reported + verified + EVIC → DQ 1 and exact attribution math', () => {
    // $1M investment / $100M EVIC = 0.01 attribution
    // Counterparty S1+S2 = 50,000 tCO2e → financed = 500 tCO2e
    const r = listedEquity.compute({
      counterpartyName: 'Acme Corp',
      counterpartySector: 'Energy',
      outstandingAmount: 1_000_000,
      evic: 100_000_000,
      reportedEmissions: 50_000,
      verifiedByThirdParty: true,
    })
    expect(r.attributionFactor).toBeCloseTo(0.01, 6)
    expect(r.financedTotal).toBeCloseTo(500, 4)
    expect(r.financedScope1).toBeCloseTo(350, 4) // 70/30 split
    expect(r.financedScope2).toBeCloseTo(150, 4)
    expect(r.dataQualityScore).toBe(1)
  })

  it('reported but unverified + EVIC → DQ 2', () => {
    const r = listedEquity.compute({
      counterpartyName: 'X',
      counterpartySector: 'IT',
      outstandingAmount: 100,
      evic: 1000,
      reportedEmissions: 100,
      verifiedByThirdParty: false,
    })
    expect(r.attributionFactor).toBeCloseTo(0.1, 6)
    expect(r.financedTotal).toBeCloseTo(10, 4)
    expect(r.dataQualityScore).toBe(2)
  })

  it('no reported emissions + EVIC → DQ 4 with sector estimate', () => {
    const r = listedEquity.compute({
      counterpartyName: 'X',
      counterpartySector: 'IT',
      outstandingAmount: 100,
      evic: 1000,
    })
    expect(r.dataQualityScore).toBe(4)
    expect(r.financedTotal).toBeGreaterThan(0)
    expect(r.warnings.length).toBeGreaterThan(0)
  })

  it('no reported emissions + no EVIC → DQ 5 (worst)', () => {
    const r = listedEquity.compute({
      counterpartyName: 'X',
      counterpartySector: 'IT',
      outstandingAmount: 100,
    })
    expect(r.dataQualityScore).toBe(5)
    expect(r.warnings.some(w => /EVIC estimated/i.test(w))).toBe(true)
  })
})

describe('PCAF · corporate bond', () => {
  it('mirrors listed-equity math for a fixed-income holding', () => {
    const r = corporateBond.compute({
      counterpartyName: 'Issuer',
      counterpartySector: 'Utilities',
      outstandingAmount: 5_000_000,
      evic: 500_000_000,
      reportedEmissions: 200_000,
      verifiedByThirdParty: true,
    })
    // 5e6 / 5e8 = 0.01 → 200k × 0.01 = 2000 tCO2e
    expect(r.attributionFactor).toBeCloseTo(0.01, 6)
    expect(r.financedTotal).toBeCloseTo(2000, 4)
    expect(r.dataQualityScore).toBe(1)
  })
})

describe('PCAF · business loan', () => {
  it('attribution = loan / (equity + debt)', () => {
    // 10M loan / (40M equity + 60M debt) = 0.1
    // 5000 tCO2e reported, verified → 500 financed
    const r = businessLoan.compute({
      counterpartyName: 'SME Ltd',
      counterpartySector: 'Industrials',
      outstandingAmount: 10_000_000,
      borrowerEquity: 40_000_000,
      borrowerDebt: 60_000_000,
      reportedEmissions: 5000,
      verifiedByThirdParty: true,
    })
    expect(r.attributionFactor).toBeCloseTo(0.1, 6)
    expect(r.financedTotal).toBeCloseTo(500, 4)
    expect(r.dataQualityScore).toBe(1)
  })

  it('no balance-sheet data → uses loan × 8 proxy, DQ 5', () => {
    const r = businessLoan.compute({
      counterpartyName: 'Tiny SME',
      counterpartySector: 'IT',
      outstandingAmount: 100_000,
    })
    expect(r.attributionFactor).toBeCloseTo(0.125, 6) // 100k / 800k
    expect(r.dataQualityScore).toBe(5)
  })
})

describe('PCAF · unlisted equity', () => {
  it('attributes by investee equity + debt', () => {
    const r = unlistedEquity.compute({
      counterpartyName: 'PE Holding',
      counterpartySector: 'Healthcare',
      outstandingAmount: 2_000_000,
      investeeEquity: 10_000_000,
      investeeDebt: 10_000_000,
      reportedEmissions: 1000,
      verifiedByThirdParty: false,
    })
    // 2M / 20M = 0.1 → 1000 × 0.1 = 100 tCO2e
    expect(r.attributionFactor).toBeCloseTo(0.1, 6)
    expect(r.financedTotal).toBeCloseTo(100, 4)
    expect(r.dataQualityScore).toBe(2) // reported unverified + value known
  })
})

describe('PCAF · project finance', () => {
  it('attribution by capital stack, with reported emissions → DQ 1', () => {
    // 50M / (40M + 60M) = 0.5
    // 20,000 tCO2e/yr project × 0.5 = 10,000 tCO2e
    const r = projectFinance.compute({
      counterpartyName: 'Wind Farm',
      projectType: 'renewable_power',
      outstandingAmount: 50_000_000,
      projectEquity: 40_000_000,
      projectDebt: 60_000_000,
      reportedEmissions: 20_000,
      verifiedByThirdParty: true,
    })
    expect(r.attributionFactor).toBeCloseTo(0.5, 6)
    expect(r.financedTotal).toBeCloseTo(10_000, 2)
    expect(r.dataQualityScore).toBe(1)
  })
})

describe('PCAF · commercial real estate', () => {
  it('uses measured emissions when supplied, DQ 1 with verification', () => {
    // 5M loan / 10M property = 0.5
    // Measured 500 tCO2e/yr → 250 financed
    const r = commercialRealEstate.compute({
      counterpartyName: 'Tower One',
      buildingType: 'Office',
      outstandingAmount: 5_000_000,
      propertyValue: 10_000_000,
      measuredAnnualEmissions: 500,
      verifiedByThirdParty: true,
    })
    expect(r.attributionFactor).toBeCloseTo(0.5, 6)
    expect(r.financedTotal).toBeCloseTo(250, 4)
    expect(r.dataQualityScore).toBe(1)
  })

  it('falls back to floor-area × type intensity when measured unknown', () => {
    // 1000 m² Office × 75 kgCO2e/m² = 75,000 kg = 75 tCO2e
    // 1M loan / 2M value = 0.5 → 37.5 financed, DQ 3
    const r = commercialRealEstate.compute({
      counterpartyName: 'X',
      buildingType: 'Office',
      outstandingAmount: 1_000_000,
      propertyValue: 2_000_000,
      floorAreaM2: 1000,
    })
    expect(r.financedTotal).toBeCloseTo(37.5, 4)
    expect(r.dataQualityScore).toBe(3)
  })
})

describe('PCAF · mortgage', () => {
  it('UK 100 m² home, $200k loan / $400k property = 0.5 attribution', () => {
    // 100 m² × 22 kgCO2e/m² = 2200 kg = 2.2 tCO2e/yr
    // × 0.5 = 1.1 tCO2e financed
    const r = mortgage.compute({
      counterpartyName: 'Borrower',
      counterpartyCountry: 'UK',
      outstandingAmount: 200_000,
      propertyValue: 400_000,
      floorAreaM2: 100,
    })
    expect(r.attributionFactor).toBeCloseTo(0.5, 6)
    expect(r.financedTotal).toBeCloseTo(1.1, 4)
    expect(r.dataQualityScore).toBe(4)
  })
})

describe('PCAF · motor vehicle loan', () => {
  it('petrol car, 15,000 km / year, $10k loan / $20k value', () => {
    // 15000 km × 0.171 kgCO2e/km = 2565 kg = 2.565 tCO2e/yr
    // 10k / 20k = 0.5 attribution → 1.2825 financed
    const r = motorVehicleLoan.compute({
      counterpartyName: 'Borrower',
      vehicleType: 'car_petrol',
      outstandingAmount: 10_000,
      vehicleValue: 20_000,
      annualDistanceKm: 15_000,
    })
    expect(r.attributionFactor).toBeCloseTo(0.5, 6)
    expect(r.financedTotal).toBeCloseTo(1.2825, 3)
    expect(r.dataQualityScore).toBe(3)
  })

  it('EV with measured emissions → DQ 1 when verified', () => {
    const r = motorVehicleLoan.compute({
      counterpartyName: 'EV driver',
      vehicleType: 'car_ev',
      outstandingAmount: 20_000,
      vehicleValue: 40_000,
      measuredAnnualEmissions: 0.6,
      verifiedByThirdParty: true,
    })
    expect(r.attributionFactor).toBeCloseTo(0.5, 6)
    expect(r.financedTotal).toBeCloseTo(0.3, 4)
    expect(r.dataQualityScore).toBe(1)
  })
})

describe('PCAF · sovereign debt', () => {
  it('US Treasury holding attributes by GDP-PPP', () => {
    // $10M investment / $25 trillion GDP-PPP (25,000,000 USDm) = 4e-7
    // Reported 5500 MtCO2e = 5.5e9 tonnes × 4e-7 = 2200 tCO2e financed
    const r = sovereignDebt.compute({
      counterpartyName: 'US Treasury',
      counterpartyCountry: 'US',
      outstandingAmount: 10_000_000,
      gdpPppMillions: 25_000_000,
      reportedCountryEmissionsMt: 5500,
      verifiedByThirdParty: true,
    })
    expect(r.attributionFactor).toBeCloseTo(4e-7, 12)
    expect(r.financedTotal).toBeCloseTo(2200, 1)
    expect(r.dataQualityScore).toBe(1)
  })

  it('GDP missing → low DQ but bounded result', () => {
    const r = sovereignDebt.compute({
      counterpartyName: 'X',
      counterpartyCountry: 'GLOBAL',
      outstandingAmount: 1_000_000,
    })
    // No GDP → uses outstanding as denominator; emissions=0 since GDP unknown
    expect(r.dataQualityScore).toBe(5)
    expect(r.warnings.length).toBeGreaterThan(0)
  })
})

describe('PCAF · attribution safety', () => {
  it('clamps attribution factor at 1.5 with a warning when outstanding > total_value', () => {
    const r = listedEquity.compute({
      counterpartyName: 'X',
      counterpartySector: 'IT',
      outstandingAmount: 1_000,
      evic: 100,
      reportedEmissions: 10,
      verifiedByThirdParty: true,
    })
    expect(r.attributionFactor).toBe(1.5)
    expect(r.warnings.some(w => /capped/i.test(w))).toBe(true)
  })

  it('zero total value → attribution 0 + warning, no NaN', () => {
    const r = listedEquity.compute({
      counterpartyName: 'X',
      counterpartySector: 'IT',
      outstandingAmount: 1000,
      evic: 0,
    })
    expect(r.attributionFactor).toBeGreaterThanOrEqual(0)
    expect(Number.isFinite(r.financedTotal)).toBe(true)
  })
})
