/**
 * PCAF illustrative emission-factor data.
 *
 * Numbers here are intentionally bounded, sensible placeholders so the
 * calculators produce realistic outputs in demo / sandbox environments.
 * They should be replaced with sourced data before any client-facing
 * disclosure:
 *   • Sector intensity → EXIOBASE 3.x / USEEIO v2.0 / PCAF Annex 9
 *   • Residential / commercial floor-area EF → IEA + national grid mix
 *   • Vehicle EF → DEFRA / EPA fleet averages by drivetrain
 *   • Country emissions per GDP → World Bank Climate Watch (WRI)
 *
 * TODO: replace each table below with the production dataset.
 */

/** kgCO2e per USD revenue (Scope 1+2 of the counterparty, GICS sector). */
// TODO: real PCAF Annex 9 / EXIOBASE 3.x dataset
export const SECTOR_EMISSIONS_INTENSITY: Record<string, number> = {
  Energy: 1.8,
  Materials: 1.2,
  Industrials: 0.5,
  Utilities: 2.5,
  'Real Estate': 0.15,
  Financials: 0.05,
  IT: 0.04,
  Healthcare: 0.10,
  'Consumer Staples': 0.18,
  'Consumer Discretionary': 0.20,
  Communication: 0.06,
}

export const SECTOR_OPTIONS = Object.keys(SECTOR_EMISSIONS_INTENSITY)

/**
 * Commercial real estate building emissions intensity, kgCO2e / m² / year.
 * Bounded illustrative figures — replace with measured-stock averages.
 */
// TODO: real CRREM / DEFRA dataset
export const COMMERCIAL_BUILDING_INTENSITY: Record<string, number> = {
  Office: 75,
  Retail: 110,
  Industrial: 140,
  Warehouse: 60,
  Hotel: 160,
  Healthcare: 220,
  Mixed: 95,
}

/**
 * Residential primary-energy emissions intensity, kgCO2e / m² / year.
 * Country averages — depend on heating mix + grid carbon intensity.
 */
// TODO: real IEA + national grid data
export const RESIDENTIAL_INTENSITY: Record<string, number> = {
  UK: 22,
  US: 35,
  EU: 18,
  IN: 12,
  CN: 28,
  GLOBAL: 25,
}

/**
 * Annual vehicle emissions, tCO2e / vehicle / year. National fleet averages.
 * Used when vehicle-specific data is unavailable.
 */
// TODO: real DEFRA / EPA dataset
export const VEHICLE_ANNUAL_EMISSIONS: Record<string, number> = {
  car_petrol: 2.4,
  car_diesel: 2.6,
  car_hybrid: 1.5,
  car_ev: 0.5,
  motorcycle: 0.8,
  van: 3.2,
  truck: 9.0,
  unknown: 2.5,
}

/**
 * Sovereign emissions per USD-million of GDP-PPP, tCO2e / USDm.
 * Source: World Bank / WRI Climate Watch (illustrative aggregates).
 */
// TODO: real World Bank Climate Watch dataset
export const COUNTRY_EMISSIONS_PER_GDP: Record<string, number> = {
  US: 280,
  UK: 175,
  EU: 195,
  CN: 480,
  IN: 410,
  JP: 240,
  DE: 175,
  FR: 145,
  AU: 320,
  CA: 305,
  GLOBAL: 290,
}

export const COUNTRY_OPTIONS = Object.keys(COUNTRY_EMISSIONS_PER_GDP)
export const RESIDENTIAL_COUNTRY_OPTIONS = Object.keys(RESIDENTIAL_INTENSITY)
export const VEHICLE_TYPE_OPTIONS = Object.keys(VEHICLE_ANNUAL_EMISSIONS)
export const COMMERCIAL_BUILDING_OPTIONS = Object.keys(COMMERCIAL_BUILDING_INTENSITY)

/**
 * Crude fallback when EVIC / enterprise value is not provided.
 * Estimates value as outstanding × multiple. Used only to keep the
 * attribution math defined; result tagged as data-quality 4 or 5.
 */
export function estimateEnterpriseValueFromOutstanding(outstanding: number): number {
  if (!Number.isFinite(outstanding) || outstanding <= 0) return 1
  return outstanding * 10
}

/** Default split between scope 1 and scope 2 when only S1+S2 is reported. */
export const DEFAULT_SCOPE_SPLIT = { scope1: 0.7, scope2: 0.3 }
