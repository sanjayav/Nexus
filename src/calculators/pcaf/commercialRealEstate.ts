import type { PcafAssetCalculator } from './index'
import { safeAttribution, toBool, toNum, PCAF_METHODOLOGY_URL } from './index'
import type { PcafDataQuality } from './index'
import {
  COMMERCIAL_BUILDING_INTENSITY,
  COMMERCIAL_BUILDING_OPTIONS,
} from '../../data/pcafEmissionFactors'

/**
 * PCAF Asset Class D — Commercial real estate.
 *
 * Financed emissions = building annual emissions × (loan / property value).
 * Building emissions come from (a) measured energy bills, (b) energy
 * certificate (EPC/Energy Star), or (c) floor area × type-average intensity.
 *
 * Data-quality hierarchy:
 *   1 — measured energy data + verified property value
 *   2 — energy certificate (EPC/EnergyStar) + property value
 *   3 — floor area × type intensity + property value
 *   4 — floor area × type intensity, value estimated
 *   5 — building data unknown, value estimated
 */
export const commercialRealEstate: PcafAssetCalculator = {
  id: 'pcaf_commercial_real_estate',
  assetClass: 'commercial_real_estate',
  name: 'Commercial Real Estate',
  description:
    'PCAF Standard D. Financed emissions = building annual emissions × (loan / property value). Prefer measured energy; fall back to certificates, then floor-area × type intensity.',
  inputs: [
    { key: 'counterpartyName', label: 'Building / borrower', type: 'text', required: true },
    {
      key: 'buildingType',
      label: 'Building type',
      type: 'select',
      options: COMMERCIAL_BUILDING_OPTIONS,
      required: true,
    },
    { key: 'outstandingAmount', label: 'Loan outstanding', unit: 'USD', type: 'number', required: true },
    { key: 'propertyValue', label: 'Property value', unit: 'USD', type: 'number' },
    { key: 'floorAreaM2', label: 'Floor area', unit: 'm²', type: 'number' },
    {
      key: 'measuredAnnualEmissions',
      label: 'Measured annual emissions',
      unit: 'tCO2e',
      type: 'number',
      help: 'From utility bills or energy certificate (DQ ≤ 2).',
    },
    {
      key: 'verifiedByThirdParty',
      label: 'Energy data independently verified?',
      type: 'boolean',
      default: false,
    },
  ],
  compute: (i) => {
    const warnings: string[] = []
    const outstanding = toNum(i.outstandingAmount)
    const propertyValue = toNum(i.propertyValue)
    const valueKnown = propertyValue > 0
    const denom = valueKnown ? propertyValue : outstanding * 1.4
    if (!valueKnown) warnings.push('Property value missing — using loan × 1.4 proxy (assumes ~70% LTV)')

    const { attr, warning: attrWarn } = safeAttribution(outstanding, denom)
    if (attrWarn) warnings.push(attrWarn)

    const measured = toNum(i.measuredAnnualEmissions)
    const verified = toBool(i.verifiedByThirdParty)
    const floorArea = toNum(i.floorAreaM2)
    const buildingType = String(i.buildingType ?? '')
    const intensity = COMMERCIAL_BUILDING_INTENSITY[buildingType] ?? 100

    let buildingEmissions = 0
    let rationale: string
    let dq: PcafDataQuality = 5

    if (measured > 0) {
      buildingEmissions = measured
      rationale = `Measured annual emissions × attribution factor (${attr.toFixed(4)})`
      dq = verified && valueKnown ? 1 : valueKnown || verified ? 2 : 3
    } else if (floorArea > 0) {
      buildingEmissions = (floorArea * intensity) / 1000 // kg → tonnes
      rationale = `Floor area ${floorArea} m² × ${intensity} kgCO2e/m² (${buildingType}) × attribution`
      dq = valueKnown ? 3 : 4
      warnings.push('Floor-area intensity estimate — provide measured energy data for DQ ≤2')
    } else {
      rationale = 'No measured emissions, no floor area — cannot compute building emissions'
      warnings.push('Provide measured emissions or floor area + building type')
      dq = 5
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
  },
  methodologyUrl: PCAF_METHODOLOGY_URL,
}
