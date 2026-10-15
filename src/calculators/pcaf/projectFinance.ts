import type { PcafAssetCalculator } from './index'
import { emissionsDataQuality, safeAttribution, toBool, toNum, PCAF_METHODOLOGY_URL } from './index'
import { DEFAULT_SCOPE_SPLIT } from '../../data/pcafEmissionFactors'

/**
 * PCAF Asset Class C — Project finance.
 *
 * Attribution = loan / (project equity + project debt). Project-level
 * emissions (annual operating CO2e) are typically modelled at financial
 * close and revised at COD; if absent we fall back to a coarse intensity
 * estimate.
 */
const PROJECT_TYPE_OPTIONS = [
  'renewable_power',
  'fossil_power',
  'transmission',
  'transport_infrastructure',
  'oil_gas_upstream',
  'oil_gas_midstream',
  'mining',
  'industrial_plant',
  'other',
]

/** kgCO2e per USD project value-at-risk — illustrative ranking only. */
// TODO: real PCAF Annex 9 project-finance intensities
const PROJECT_INTENSITY: Record<string, number> = {
  renewable_power: 0.01,
  fossil_power: 4.5,
  transmission: 0.02,
  transport_infrastructure: 0.15,
  oil_gas_upstream: 5.0,
  oil_gas_midstream: 2.5,
  mining: 1.8,
  industrial_plant: 1.2,
  other: 0.5,
}

export const projectFinance: PcafAssetCalculator = {
  id: 'pcaf_project_finance',
  assetClass: 'project_finance',
  name: 'Project Finance',
  description:
    'PCAF Standard C. Attribution = loan amount / (project equity + project debt). Uses project-level annual emissions where available.',
  inputs: [
    { key: 'counterpartyName', label: 'Project name', type: 'text', required: true },
    {
      key: 'projectType',
      label: 'Project type',
      type: 'select',
      options: PROJECT_TYPE_OPTIONS,
      required: true,
    },
    { key: 'outstandingAmount', label: 'Loan amount outstanding', unit: 'USD', type: 'number', required: true },
    { key: 'projectEquity', label: 'Project equity', unit: 'USD', type: 'number' },
    { key: 'projectDebt', label: 'Project total debt', unit: 'USD', type: 'number' },
    { key: 'reportedEmissions', label: 'Project annual emissions', unit: 'tCO2e', type: 'number' },
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
    const equity = toNum(i.projectEquity)
    const debt = toNum(i.projectDebt)
    const total = equity + debt
    const valueKnown = total > 0
    const denom = valueKnown ? total : outstanding * 1.3 // project debt usually ~70% of capital stack
    if (!valueKnown) warnings.push('Project capital stack unknown — using loan × 1.3 proxy')

    const { attr, warning: attrWarn } = safeAttribution(outstanding, denom)
    if (attrWarn) warnings.push(attrWarn)

    const reported = toNum(i.reportedEmissions)
    const verified = toBool(i.verifiedByThirdParty)
    const hasReported = reported > 0

    let financedTotal = 0
    let rationale: string
    if (hasReported) {
      financedTotal = reported * attr
      rationale = `Project annual emissions × attribution factor (${attr.toFixed(4)})`
    } else {
      const projectType = String(i.projectType ?? 'other')
      const intensity = PROJECT_INTENSITY[projectType] ?? 0.5
      const estimatedEmissions = (denom * intensity) / 1000
      financedTotal = estimatedEmissions * attr
      rationale = `Project-type intensity (${intensity} kgCO2e/USD, ${projectType}) × project value × attribution`
      warnings.push('Project emissions estimated from project-type intensity')
    }

    return {
      attributionFactor: attr,
      financedScope1: financedTotal * DEFAULT_SCOPE_SPLIT.scope1,
      financedScope2: financedTotal * DEFAULT_SCOPE_SPLIT.scope2,
      financedTotal,
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
