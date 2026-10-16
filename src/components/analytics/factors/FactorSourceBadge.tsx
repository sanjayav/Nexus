import { useTranslation } from 'react-i18next'
import { BadgeCheck } from 'lucide-react'
import { sourceKey, sourceShort, dataYear } from './factorMeta'

/**
 * FactorSourceBadge — publisher chip for an emission factor. Official China
 * sources (生态环境部 / MEE, MEE-NBS, GB/T) read in brand emerald; every other
 * publisher (IEA, DEFRA, IPCC, EPA…) is neutral, so MEE vs IEA is visible at a
 * glance. The full source string is the tooltip.
 */
export function FactorSourceBadge({
  source,
  version,
  validFrom,
  size = 'sm',
  showYear = true,
}: {
  source: string
  version?: string | null
  validFrom?: string | null
  size?: 'sm' | 'md'
  showYear?: boolean
}) {
  const { t } = useTranslation()
  const k = sourceKey(source)
  const official = k === 'mee' || k === 'meeNbs' || k === 'gbt'
  const year = showYear ? dataYear({ source_version: version, valid_from: validFrom }) : ''
  return (
    <span
      className="nx-pill"
      data-tone={official ? 'brand' : 'neutral'}
      data-size={size}
      title={[source, version].filter(Boolean).join(' · ')}
    >
      <span className="truncate max-w-[16ch]">{sourceShort(t, source)}</span>
      {year && <span className="tabular-nums opacity-75">{year}</span>}
    </span>
  )
}

/** "Preferred for your region" — the row the server ranks first for this org. */
export function PreferredMarker({ regional = true, size = 'sm' }: { regional?: boolean; size?: 'sm' | 'md' }) {
  const { t } = useTranslation()
  return (
    <span className="nx-pill" data-tone="success" data-size={size}>
      <BadgeCheck className="w-3 h-3" aria-hidden />
      {regional ? t('calculators.factors.preferredForRegion') : t('calculators.factors.preferred')}
    </span>
  )
}

export default FactorSourceBadge
