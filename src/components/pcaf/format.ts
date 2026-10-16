import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { PcafAssetClass } from '../../lib/api'
import { useFmt, toNumber, type Numeric } from '../../lib/fmt'

export const ASSET_CLASS_LABEL: Record<PcafAssetClass, string> = {
  listed_equity: 'Listed equity',
  corporate_bond: 'Corporate bonds',
  business_loan: 'Business loans',
  unlisted_equity: 'Unlisted equity',
  project_finance: 'Project finance',
  commercial_real_estate: 'Commercial real estate',
  mortgage: 'Mortgages',
  motor_vehicle_loan: 'Motor vehicle loans',
  sovereign_debt: 'Sovereign debt',
}

export const ASSET_CLASSES = Object.keys(ASSET_CLASS_LABEL) as PcafAssetClass[]

/** Postgres NUMERIC arrives as a string — coerce, defaulting to 0. */
export const num = (v: Numeric): number => toNumber(v) ?? 0

export function useAssetClassLabel() {
  const { t } = useTranslation()
  return useCallback(
    (ac: PcafAssetClass): string => t(`pcaf.assetClasses.${ac}.label`, { defaultValue: ASSET_CLASS_LABEL[ac] ?? ac }),
    [t],
  )
}

/**
 * PCAF number formatting: money in the reporting currency (USD), compact in
 * KPIs (US$165M · US$1.65亿), and tonnes with tCO₂e.
 */
export function usePcafFormat() {
  const f = useFmt()
  const locale = f.localeFor()
  const money = useCallback(
    (v: Numeric, o: { compact?: boolean; currency?: string } = {}) => {
      const n = toNumber(v)
      if (n == null) return '—'
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: o.currency ?? 'USD',
        notation: o.compact === false ? 'standard' : 'compact',
        maximumFractionDigits: o.compact === false ? 0 : 2,
      }).format(n)
    },
    [locale],
  )
  const tonnes = useCallback((v: Numeric, compact = false) => f.value(v, 'tCO2e', compact ? { compact: true } : { maxFraction: 1 }), [f])
  return { f, money, tonnes }
}

/** DQ 1–2 good, 3 fair, 4–5 weak — PCAF data-quality tone. */
export function dqTone(score: number): 'success' | 'warning' | 'danger' {
  return score <= 2 ? 'success' : score <= 3 ? 'warning' : 'danger'
}
