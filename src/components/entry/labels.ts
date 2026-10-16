import type { TFunction } from 'i18next'
import { capitalLabelKey, subsectionLabelKey } from '../../reports/spdTemplate'
import { localeFor } from '../../lib/fmt'

/**
 * Section / subsection display names, from the one canonical dictionary:
 * `perfReport.capitals.*` / `perfReport.subsections.*` (via capitalLabelKey /
 * subsectionLabelKey in reports/spdTemplate). That dictionary also carries the
 * questionnaire names ("Emissions", "Governance", "Anti-corruption"…), so
 * Chinese screens never leak English; unknown names fall back to the raw name.
 */
export function sectionLabel(t: TFunction, name?: string | null): string {
  if (!name) return ''
  return t(capitalLabelKey(name), { defaultValue: name })
}

export function subsectionLabel(t: TFunction, name?: string | null): string {
  if (!name) return ''
  return t(subsectionLabelKey(name), { defaultValue: name })
}

/** Localised date + time (Asia/Shanghai-agnostic; follows the UI language). */
export function formatDateTime(iso: string | null | undefined, lng?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(localeFor(lng), { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatDate(iso: string | null | undefined, lng?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(localeFor(lng), { year: 'numeric', month: 'short', day: 'numeric' })
}

/** "2s ago" / "5 min ago" — used by the save indicator and cell metadata. */
export function relativeTime(t: TFunction, at: number | string, now = Date.now()): string {
  const then = typeof at === 'number' ? at : new Date(at).getTime()
  if (!Number.isFinite(then)) return ''
  const s = Math.max(0, Math.round((now - then) / 1000))
  if (s < 5) return t('entry.rel.justNow')
  if (s < 60) return t('entry.rel.seconds', { count: s })
  const m = Math.round(s / 60)
  if (m < 60) return t('entry.rel.minutes', { count: m })
  const h = Math.round(m / 60)
  if (h < 24) return t('entry.rel.hours', { count: h })
  return t('entry.rel.days', { count: Math.round(h / 24) })
}
