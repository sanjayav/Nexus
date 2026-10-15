import type { PcafAssetCalculator } from './index'
import { emissionsDataQuality, safeAttribution, toBool, toNum, PCAF_METHODOLOGY_URL } from './index'
import {
  DEFAULT_SCOPE_SPLIT,
  SECTOR_EMISSIONS_INTENSITY,
  SECTOR_OPTIONS,
  estimateEnterpriseValueFromOutstanding,
} from '../../data/pcafEmissionFactors'

/**
 * PCAF Asset Class A — Listed equity & corporate bonds.
 *
 * Attribution factor = outstanding investment / EVIC (Enterprise Value
 *   Including Cash). When EVIC is unknown we fall back to outstanding × 10
 *   and tag DQ ≥ 4.
 *
 * Financed emissions = counterparty emissions × attribution factor.
 *   Preferred order: reported S1+S2 → sector-intensity × revenue proxy.
 */
export const listedEquity: PcafAssetCalculator = {
  id: 'pcaf_listed_equity',
  assetClass: 'listed_equity',
  name: 'Listed Equity & Corporate Bonds',
  description:
    'PCAF Standard A. Attribution factor = outstanding investment value / company EVIC. Use reported emissions where available; fall back to sector intensity × revenue proxy.',
  inputs: [
    { key: 'counterpartyName', label: 'Counterparty (issuer)', type: 'text', required: true },
    {
      key: 'counterpartySector',
      label: 'GICS sector',
      type: 'select',
      options: SECTOR_OPTIONS,
      required: true,
    },
    { key: 'outstandingAmount', label: 'Outstanding investment value', unit: 'USD', type: 'number', required: true },
    {
      key: 'evic',
      label: 'Counterparty EVIC',
      unit: 'USD',
      type: 'number',
      help: 'Enterprise Value Including Cash. Leave blank to estimate (lower data quality).',
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
    if (!valueKnown) warnings.push('EVIC estimated — provide actual EVIC for higher data quality')

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
      // Revenue ≈ 0.6 × EVIC as a crude proxy (sector-agnostic placeholder).
      // TODO: replace with PCAF Annex 9 revenue-to-EVIC ratios per sector.
      const estimatedRevenue = evic * 0.6
      const estimatedEmissions = (estimatedRevenue * intensity) / 1000 // kg → tonnes
      financedS12 = estimatedEmissions * attr
      rationale = `Sector intensity (${intensity} kgCO2e/USD revenue, ${sector}) × est. revenue × attribution`
      warnings.push('Emissions estimated from sector intensity — replace with counterparty disclosure for DQ ≤3')
    }

    const dq = emissionsDataQuality({ reportedEmissions: hasReported, verified, valueKnown })

    return {
      attributionFactor: attr,
      financedScope1: financedS12 * DEFAULT_SCOPE_SPLIT.scope1,
      financedScope2: financedS12 * DEFAULT_SCOPE_SPLIT.scope2,
      financedScope3: financedS3,
      financedTotal: financedS12 + financedS3,
      dataQualityScore: dq,
      rationale,
      warnings,
    }
  },
  methodologyUrl: PCAF_METHODOLOGY_URL,
}
