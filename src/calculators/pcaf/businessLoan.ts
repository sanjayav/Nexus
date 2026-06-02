import type { PcafAssetCalculator } from './index'
import { emissionsDataQuality, safeAttribution, toBool, toNum, PCAF_METHODOLOGY_URL } from './index'
import {
  DEFAULT_SCOPE_SPLIT,
  SECTOR_EMISSIONS_INTENSITY,
  SECTOR_OPTIONS,
} from '../../data/pcafEmissionFactors'

/**
 * PCAF Asset Class B — Business loans to non-listed companies.
 *
 * Attribution = outstanding loan / (borrower equity + total debt).
 * When borrower equity / debt are unknown we fall back to outstanding × 8
 * (loan-to-EV proxy) and tag DQ ≥ 4.
 */
export const businessLoan: PcafAssetCalculator = {
  id: 'pcaf_business_loan',
  assetClass: 'business_loan',
  name: 'Business Loans',
  description:
    'PCAF Standard B. Attribution = outstanding loan / (borrower equity + debt). Use reported emissions where available; otherwise estimate from sector intensity × revenue.',
  inputs: [
    { key: 'counterpartyName', label: 'Borrower', type: 'text', required: true },
    {
      key: 'counterpartySector',
      label: 'GICS sector',
      type: 'select',
      options: SECTOR_OPTIONS,
      required: true,
    },
    { key: 'outstandingAmount', label: 'Outstanding loan amount', unit: 'USD', type: 'number', required: true },
    { key: 'borrowerEquity', label: 'Borrower equity', unit: 'USD', type: 'number' },
    { key: 'borrowerDebt', label: 'Borrower total debt', unit: 'USD', type: 'number' },
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
    const equity = toNum(i.borrowerEquity)
    const debt = toNum(i.borrowerDebt)
    const totalValue = equity + debt
    const valueKnown = totalValue > 0
    const denom = valueKnown ? totalValue : outstanding * 8
    if (!valueKnown) warnings.push('Borrower equity + debt unknown — using loan × 8 proxy. Provide actual balance-sheet figures for DQ ≤3.')

    const { attr, warning: attrWarn } = safeAttribution(outstanding, denom)
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
      // Revenue proxy: 0.8 × (equity + debt). Tighter than listed-equity ratio
      // since private-co. balance sheets are smaller than EVIC.
      const estimatedRevenue = denom * 0.8
      const estimatedEmissions = (estimatedRevenue * intensity) / 1000
      financedS12 = estimatedEmissions * attr
      rationale = `Sector intensity (${intensity} kgCO2e/USD, ${sector}) × revenue proxy × attribution`
      warnings.push('Emissions estimated from sector intensity — request borrower disclosure for DQ ≤3')
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
