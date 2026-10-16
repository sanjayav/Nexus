import type { TFunction } from 'i18next'

/**
 * Display helpers for emission-factor rows (`/api/emission-factors`).
 * Server-side ranking lives in api/_efCnFactors.ts; these only decide how a
 * row reads on screen (short source name, region name, tone).
 */

/** Mainland China region code: 'CN' or 'CN-<GRID>'. */
export function isCnRegion(region: string | null | undefined): boolean {
  if (!region) return false
  const r = region.toUpperCase()
  return r === 'CN' || r.startsWith('CN-')
}

/** Official mainland source (MEE, MEE/NBS joint, GB/T national standard). */
export function isOfficialCnSource(source: string | null | undefined): boolean {
  if (!source) return false
  return /^(MEE|GB\/T|生态环境部)/.test(source.trim())
}

export type SourceKey = 'meeNbs' | 'mee' | 'gbt' | 'iea' | 'defra' | 'ipcc' | 'epa' | 'other'

export function sourceKey(source: string | null | undefined): SourceKey {
  const s = (source ?? '').trim()
  if (/^MEE\s*\/\s*NBS/i.test(s)) return 'meeNbs'
  if (/^(MEE|生态环境部)/i.test(s)) return 'mee'
  if (/^GB\/T/i.test(s)) return 'gbt'
  if (/^IEA/i.test(s)) return 'iea'
  if (/^DEFRA/i.test(s)) return 'defra'
  if (/^IPCC/i.test(s)) return 'ipcc'
  if (/^(US\s*)?EPA/i.test(s)) return 'epa'
  return 'other'
}

/** Short publisher name for chips: "MEE" / "生态环境部", "IEA", "DEFRA" … */
export function sourceShort(t: TFunction, source: string | null | undefined): string {
  const k = sourceKey(source)
  if (k === 'other') {
    const s = (source ?? '').trim()
    return s.length > 28 ? `${s.slice(0, 26)}…` : s || '—'
  }
  return t(`calculators.factors.sources.${k}`)
}

/** Grid region display name: CN → China national grid, CN-EAST → East China grid. */
export function regionLabel(t: TFunction, region: string | null | undefined): string {
  if (!region) return '—'
  const r = region.toUpperCase()
  if (r === 'CN') return t('calculators.factors.regions.CN')
  if (r.startsWith('CN-')) {
    const key = r.slice(3)
    return t(`calculators.factors.regions.CN_${key}`, { defaultValue: region })
  }
  if (r === 'GLOBAL') return t('calculators.factors.regions.GLOBAL')
  return t(`calculators.factors.regions.${r}`, { defaultValue: region })
}

/** Location-based / market-based / fossil-only, from the factor name. */
export type GridBasis = 'location' | 'market' | 'fossil'
export function gridBasis(name: string, subcategory?: string | null): GridBasis {
  const s = `${subcategory ?? ''} ${name}`.toLowerCase()
  if (/market/.test(s)) return 'market'
  if (/fossil/.test(s)) return 'fossil'
  return 'location'
}

/** Electricity-like category ('electricity', 'purchased_electricity'). */
export function isElectricity(category: string | null | undefined): boolean {
  return /electric/i.test(category ?? '')
}

/** Data year for display: source_version when it is a year, else valid_from's year. */
export function dataYear(row: { source_version?: string | null; valid_from?: string | null }): string {
  const v = row.source_version ?? ''
  const m = /(19|20)\d{2}/.exec(v)
  if (m) return m[0]
  return row.valid_from ? String(row.valid_from).slice(0, 4) : ''
}
