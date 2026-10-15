import type { PcafAssetCalculator } from './index'
import { emissionsDataQuality, safeAttribution, toBool, toNum, PCAF_METHODOLOGY_URL } from './index'
import {
  DEFAULT_SCOPE_SPLIT,
  SECTOR_EMISSIONS_INTENSITY,
  SECTOR_OPTIONS,
  estimateEnterpriseValueFromOutstanding,
} from '../../data/pcafEmissionFactors'

/**
 * PCAF Asset Class A — Corporate bonds (mirrors listed equity math).
 *
 * Kept as a separate registry entry so the UI surfaces it distinctly under
 * fixed income, but shares the listed-equity calculation formula:
 * financed emissions = (reported or estimated) × outstanding / EVIC.
 */
export const corporateBond: PcafAssetCalculator = {
  id: 'pcaf_corporate_bond',
  assetClass: 'corporate_bond',
  name: 'Corporate Bonds',
  description:
    'PCAF Standard A. Same EVIC-based attribution as listed equity, applied to held bond face value.',
  inputs: [
    { key: 'counterpartyName', label: 'Issuer', type: 'text', required: true },
    {
      key: 'counterpartySector',
      label: 'GICS sector',
      type: 'select',
      options: SECTOR_OPTIONS,
      required: true,
    },
    { key: 'outstandingAmount', label: 'Bond holding value', unit: 'USD', type: 'number', required: true },
    {
      key: 'evic',
      label: 'Issuer EVIC',
      unit: 'USD',
      type: 'number',
      help: 'Enterprise Value Including Cash of the issuer.',
    },
    { key: 'reportedEmissions', label: 'Reported S1+S2 emissions', unit: 'tCO2e', type: 'number' },
    { key: 'reportedScope3', label: 'Reported Scope 3 emissions', unit: 'tCO2e', type: 'number' },
    {
      key: 'verifiedByThirdParty',
      label: 'Emissions independently verified?',
      type: 'boolean',
      default: false,
    },
  ],
  compute: (i) => {
    const warnings: string[] = []
    const outstanding = toNum(i.outstandingAmount)
    const valueKnown = toNum(i.evic) > 0
    const evic = valueKnown ? toNum(i.evic) : estimateEnterpriseValueFromOutstanding(outstanding)
    if (!valueKnown) warnings.push('EVIC estimated — supply issuer EVIC for higher data quality')

    const { attr, warning: attrWarn } = safeAttribution(outstanding, evic)
    if (attrWarn) warnings.push(attrWarn)

    const reported = toNum(i.reportedEmissions)
    const reportedS3 = toNum(i.reportedScope3)
    const verified = toBool(i.verifiedByThirdParty)
    const hasReported = reported > 0

    let financedS12 = 0
    let financedS3 = 0
    let rationale: string

    if (hasReported) {
      financedS12 = reported * attr
      financedS3 = reportedS3 * attr
      rationale = `Reported emissions × attribution factor (${attr.toFixed(4)})`
    } else {
      const sector = String(i.counterpartySector ?? '')
      const intensity = SECTOR_EMISSIONS_INTENSITY[sector] ?? 0.3
      const estimatedRevenue = evic * 0.6
      const estimatedEmissions = (estimatedRevenue * intensity) / 1000
      financedS12 = estimatedEmissions * attr
      rationale = `Sector intensity (${intensity} kgCO2e/USD revenue) × est. revenue × attribution`
      warnings.push('Emissions estimated from sector intensity — replace with issuer disclosure for DQ ≤3')
    }

    return {
      attributionFactor: attr,
      financedScope1: financedS12 * DEFAULT_SCOPE_SPLIT.scope1,
      financedScope2: financedS12 * DEFAULT_SCOPE_SPLIT.scope2,
      financedScope3: financedS3,
      financedTotal: financedS12 + financedS3,
      dataQualityScore: emissionsDataQuality({
        reportedEmissions: hasReported,
        verified,
        valueKnown,
      }),
      rationale,
      warnings,
    }
  },
  methodologyUrl: PCAF_METHODOLOGY_URL,
}
