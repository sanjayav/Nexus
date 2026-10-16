import { useTranslation } from 'react-i18next'
import { StatusPill } from '../../ui'
import { useFmt, type Fmt } from '../../../lib/fmt'
import { measureCode, type IxFact, type IxPeriod } from './ixbrlFacts'

export interface FactMeta {
  label?: string
  framework?: string
  griCode?: string
}

/**
 * Unit display. Codes with a localised name (CNY → 元, tce → 吨标准煤) come
 * from ixbrl.units.*; ratios split on `_per_`; chemistry is subscripted.
 */
export function useUnitLabel() {
  const { t, i18n } = useTranslation()
  const f = useFmt()
  const one = (code: string) => {
    const key = `ixbrl.units.${code}`
    return i18n.exists(key) ? t(key) : f.unit(code)
  }
  return (measure: string | null): string => {
    const code = measureCode(measure)
    if (!code) return ''
    if (code.includes('_per_')) {
      const [num, den] = code.split('_per_')
      return `${one(num)}/${one(den)}`
    }
    return one(code)
  }
}

function periodText(p: IxPeriod, f: Fmt, t: (k: string, o?: Record<string, unknown>) => string): string {
  if (p.kind === 'instant' && p.instant) return t('ixbrl.facts.asAt', { date: f.date(p.instant) })
  if (p.kind === 'duration') return t('ixbrl.facts.range', { from: f.date(p.start), to: f.date(p.end) })
  return '—'
}

function valueText(fact: IxFact, f: Fmt): string {
  if (fact.nil) return '—'
  if (fact.kind === 'numeric' && fact.value != null) {
    // Exact tagged value — never rounded for display.
    return f.exact(fact.value)
  }
  return fact.raw
}

/** Tagged-fact table (md+) and stacked list (mobile). Exact values, never compacted. */
export default function FactTable({ facts, meta }: { facts: IxFact[]; meta: Map<string, FactMeta> }) {
  const { t } = useTranslation()
  const f = useFmt()
  const unitLabel = useUnitLabel()

  const rows = facts.map(fact => {
    const m = meta.get(fact.name) ?? {}
    return {
      fact,
      label: m.label ?? fact.name.split(':').pop() ?? fact.name,
      source: [m.framework ? t(`ixbrl.frameworks.${m.framework}`, { defaultValue: m.framework.toUpperCase() }) : null, m.griCode ? `GRI ${m.griCode}` : null]
        .filter(Boolean)
        .join(t('ixbrl.sep')),
      value: valueText(fact, f),
      unit: unitLabel(fact.measure),
      period: periodText(fact.period, f, t),
    }
  })

  const pill = (fact: IxFact) =>
    fact.nil ? (
      <StatusPill tone="warning" size="sm" dot>{t('ixbrl.facts.nil')}</StatusPill>
    ) : (
      <StatusPill tone="success" size="sm">{t('ixbrl.facts.tagged')}</StatusPill>
    )

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">{t('ixbrl.tabs.facts')}</caption>
          <thead className="bg-[var(--bg-secondary)]">
            <tr className="text-left text-caption font-medium text-[var(--text-secondary)]">
              <th scope="col" className="px-5 py-2.5 font-medium">{t('ixbrl.facts.concept')}</th>
              <th scope="col" className="px-4 py-2.5 font-medium text-right">{t('ixbrl.facts.value')}</th>
              <th scope="col" className="px-4 py-2.5 font-medium">{t('ixbrl.facts.unit')}</th>
              <th scope="col" className="px-4 py-2.5 font-medium">{t('ixbrl.facts.period')}</th>
              <th scope="col" className="px-4 py-2.5 font-medium">{t('ixbrl.facts.source')}</th>
              <th scope="col" className="px-5 py-2.5 font-medium">{t('ixbrl.facts.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
            {rows.map(r => (
              <tr key={r.fact.id} className="hover:bg-[var(--bg-hover)] transition-colors align-top">
                <th scope="row" className="px-5 py-3 text-left font-normal max-w-[420px]">
                  <span className="block text-small text-[var(--text-primary)]">{r.label}</span>
                  <span className="block text-caption font-mono text-[var(--text-tertiary)] mt-0.5 break-all">{r.fact.name}</span>
                </th>
                <td className={`px-4 py-3 text-right text-small tabular-nums whitespace-nowrap ${r.fact.nil ? 'text-[var(--text-quaternary)]' : 'text-[var(--text-primary)] font-medium'}`}>
                  {r.value}
                </td>
                <td className="px-4 py-3 text-small text-[var(--text-secondary)] whitespace-nowrap">{r.unit || '—'}</td>
                <td className="px-4 py-3 text-small text-[var(--text-secondary)] whitespace-nowrap tabular-nums">{r.period}</td>
                <td className="px-4 py-3 text-caption text-[var(--text-tertiary)] whitespace-nowrap">{r.source || '—'}</td>
                <td className="px-5 py-3">{pill(r.fact)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <ul className="md:hidden divide-y divide-[var(--border-subtle)]">
        {rows.map(r => (
          <li key={r.fact.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-small text-[var(--text-primary)]">{r.label}</p>
                <p className="text-caption font-mono text-[var(--text-tertiary)] mt-0.5 break-all">{r.fact.name}</p>
              </div>
              {pill(r.fact)}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`type-h3 tabular-nums ${r.fact.nil ? 'text-[var(--text-quaternary)]' : 'text-[var(--text-primary)]'}`}>{r.value}</span>
              {r.unit && !r.fact.nil && <span className="text-caption text-[var(--text-tertiary)]">{r.unit}</span>}
            </div>
            <p className="mt-1 text-caption text-[var(--text-tertiary)]">
              {r.period}
              {r.source ? `${t('ixbrl.sep')}${r.source}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </>
  )
}
