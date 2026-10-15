import type { PcafAssetCalculator } from './index'
import { safeAttribution, toBool, toNum, PCAF_METHODOLOGY_URL } from './index'
import type { PcafDataQuality } from './index'
import {
  COUNTRY_EMISSIONS_PER_GDP,
  COUNTRY_OPTIONS,
} from '../../data/pcafEmissionFactors'

/**
 * PCAF Asset Class G — Sovereign debt.
 *
 * Financed emissions = country annual emissions × (investment / GDP-PPP).
 * Country-level emissions intensity is sourced from World Bank Climate
 * Watch (here: illustrative table).
 */
export const sovereignDebt: PcafAssetCalculator = {
  id: 'pcaf_sovereign_debt',
  assetClass: 'sovereign_debt',
  name: 'Sovereign Debt',
  description:
    'PCAF Standard G. Financed emissions = country emissions × (investment / country GDP-PPP).',
  inputs: [
    { key: 'counterpartyName', label: 'Issuer (country)', type: 'text', required: true },
    {
      key: 'counterpartyCountry',
      label: 'Country code',
      type: 'select',
      options: COUNTRY_OPTIONS,
      required: true,
    },
    { key: 'outstandingAmount', label: 'Investment value', unit: 'USD', type: 'number', required: true },
    {
      key: 'gdpPppMillions',
      label: 'Country GDP-PPP',
      unit: 'USDm',
      type: 'number',
      help: 'GDP in PPP terms (USD millions). Used as the denominator.',
    },
    {
      key: 'reportedCountryEmissionsMt',
      label: 'Country annual emissions',
      unit: 'MtCO2e',
      type: 'number',
      help: 'From NDC inventory if available; else uses country-emissions-per-GDP table.',
    },
    {
      key: 'verifiedByThirdParty',
      label: 'Country emissions from official inventory?',
      type: 'boolean',
      default: false,
    },
  ],
  compute: (i) => {
    const warnings: string[] = []
    const outstanding = toNum(i.outstandingAmount)
    const gdpMillions = toNum(i.gdpPppMillions)
    const valueKnown = gdpMillions > 0
    const denomUsd = valueKnown ? gdpMillions * 1_000_000 : outstanding * 1_000_000
    if (!valueKnown) warnings.push('GDP-PPP missing — using outstanding as denominator (attribution will be ~1, expect low DQ)')

    const { attr, warning: attrWarn } = safeAttribution(outstanding, denomUsd)
    if (attrWarn) warnings.push(attrWarn)

    const country = String(i.counterpartyCountry ?? 'GLOBAL')
    const reportedMt = toNum(i.reportedCountryEmissionsMt)
    const verified = toBool(i.verifiedByThirdParty)

    let countryEmissionsTonnes = 0
    let rationale: string
    let dq: PcafDataQuality

    if (reportedMt > 0) {
      countryEmissionsTonnes = reportedMt * 1_000_000 // Mt → tonnes
      rationale = `Reported country emissions ${reportedMt} MtCO2e × attribution (${attr.toFixed(6)})`
      dq = verified && valueKnown ? 1 : valueKnown || verified ? 2 : 3
    } else {
      const perGdpRate = COUNTRY_EMISSIONS_PER_GDP[country] ?? COUNTRY_EMISSIONS_PER_GDP.GLOBAL
      // perGdpRate = tCO2e per USDm; multiply by GDP-millions to get tonnes
      countryEmissionsTonnes = perGdpRate * (valueKnown ? gdpMillions : 0)
      rationale = `Country EF ${perGdpRate} tCO2e/USDm (${country}) × GDP-PPP × attribution`
      dq = valueKnown ? 4 : 5
      warnings.push('Country emissions estimated from per-GDP intensity table — replace with NDC inventory data')
    }

    const financedTotal = countryEmissionsTonnes * attr

    return {
      attributionFactor: attr,
      // Country-level: we don't split sovereign emissions by scope.
      financedScope1: financedTotal,
      financedTotal,
      dataQualityScore: dq,
      rationale,
      warnings,
    }
  },
  methodologyUrl: PCAF_METHODOLOGY_URL,
}
