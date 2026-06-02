import type { PcafAssetCalculator } from './index'
import { safeAttribution, toBool, toNum, PCAF_METHODOLOGY_URL } from './index'
import type { PcafDataQuality } from './index'
import {
  RESIDENTIAL_COUNTRY_OPTIONS,
  RESIDENTIAL_INTENSITY,
} from '../../data/pcafEmissionFactors'

/**
 * PCAF Asset Class E — Residential mortgages.
 *
 * Financed emissions = household primary energy emissions × (loan /
 *   property value). Household emissions = floor area × residential
 *   intensity (kgCO2e/m²/year) for the country.
 */
export const mortgage: PcafAssetCalculator = {
  id: 'pcaf_mortgage',
  assetClass: 'mortgage',
  name: 'Residential Mortgages',
  description:
    'PCAF Standard E. Financed emissions = (floor area × country residential intensity) × (loan / property value).',
  inputs: [
    { key: 'counterpartyName', label: 'Borrower / property reference', type: 'text', required: true },
    {
      key: 'counterpartyCountry',
      label: 'Country',
      type: 'select',
      options: RESIDENTIAL_COUNTRY_OPTIONS,
      required: true,
    },
    { key: 'outstandingAmount', label: 'Outstanding mortgage balance', unit: 'USD', type: 'number', required: true },
    { key: 'propertyValue', label: 'Property appraised value', unit: 'USD', type: 'number' },
    { key: 'floorAreaM2', label: 'Property floor area', unit: 'm²', type: 'number' },
    {
      key: 'measuredAnnualEmissions',
      label: 'Measured household emissions',
      unit: 'tCO2e',
      type: 'number',
      help: 'From utility bills if available (DQ ≤ 2).',
    },
    {
      key: 'verifiedByThirdParty',
      label: 'Energy / property data independently verified?',
      type: 'boolean',
      default: false,
    },
  ],
  compute: (i) => {
    const warnings: string[] = []
    const outstanding = toNum(i.outstandingAmount)
    const propertyValue = toNum(i.propertyValue)
    const valueKnown = propertyValue > 0
    const denom = valueKnown ? propertyValue : outstanding * 1.25 // ~80% LTV typical
    if (!valueKnown) warnings.push('Property value missing — using loan × 1.25 proxy (~80% LTV)')

    const { attr, warning: attrWarn } = safeAttribution(outstanding, denom)
    if (attrWarn) warnings.push(attrWarn)

    const measured = toNum(i.measuredAnnualEmissions)
    const floorArea = toNum(i.floorAreaM2)
    const country = String(i.counterpartyCountry ?? 'GLOBAL')
    const intensity = RESIDENTIAL_INTENSITY[country] ?? RESIDENTIAL_INTENSITY.GLOBAL
    const verified = toBool(i.verifiedByThirdParty)

    let householdEmissions = 0
    let rationale: string
    let dq: PcafDataQuality = 5

    if (measured > 0) {
      householdEmissions = measured
      rationale = `Measured household emissions × attribution factor (${attr.toFixed(4)})`
      dq = verified && valueKnown ? 1 : valueKnown || verified ? 2 : 3
    } else if (floorArea > 0) {
      householdEmissions = (floorArea * intensity) / 1000 // kg → tonnes
      rationale = `Floor area ${floorArea} m² × ${intensity} kgCO2e/m² (${country}) × attribution`
      dq = valueKnown ? 4 : 5
      warnings.push('Household emissions estimated from country residential intensity')
    } else {
      // No floor area — use typical household size (100 m²) × intensity.
      const typicalFloorArea = 100
      householdEmissions = (typicalFloorArea * intensity) / 1000
      rationale = `Typical 100 m² × ${intensity} kgCO2e/m² (${country}) × attribution`
      dq = 5
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
  },
  methodologyUrl: PCAF_METHODOLOGY_URL,
}
