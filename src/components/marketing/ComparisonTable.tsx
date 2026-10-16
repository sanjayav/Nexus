import { Check, X, Circle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * ComparisonTable — Nexus vs <Competitor> matrix.
 *
 * Each row's value can be:
 *   - 'yes'     → green check
 *   - 'no'      → red cross
 *   - 'partial' → amber half-dot
 *   - string    → descriptive label (e.g. "$60K avg")
 *
 * Renders as a sticky-header table on md+, cards-per-row below.
 * Nexus column is tinted with accent emerald; competitor column is neutral.
 */

export type CellValue = 'yes' | 'no' | 'partial' | string

export interface ComparisonRow {
  feature: string
  nexus: CellValue
  competitor: CellValue
  honest_note?: string
}

interface ComparisonTableProps {
  competitorName: string
  rows: ComparisonRow[]
}

function Glyph({ value, mode }: { value: CellValue; mode: 'nexus' | 'competitor' }) {
  const { t } = useTranslation()
  if (value === 'yes') {
    return <Check className="w-5 h-5 mx-auto" style={{ color: 'var(--color-brand)' }} aria-label={t('marketing.comparison.ariaYes')} />
  }
  if (value === 'no') {
    return (
      <X
        className="w-5 h-5 mx-auto"
        style={{ color: 'var(--status-danger)' }}
        aria-label={t('marketing.comparison.ariaNo')}
      />
    )
  }
  if (value === 'partial') {
    return (
      <Circle
        className="w-4 h-4 mx-auto fill-current"
        style={{ color: 'var(--status-warning)' }}
        aria-label={t('marketing.comparison.ariaPartial')}
      />
    )
  }
  return (
    <span
      className="text-[13px] font-medium leading-snug inline-block"
      style={{
        color: mode === 'nexus' ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
    >
      {value}
    </span>
  )
}

export default function ComparisonTable({ competitorName, rows }: ComparisonTableProps) {
  const { t } = useTranslation()
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-[1180px] mx-auto px-4 sm:px-8">
        {/* Desktop / tablet table */}
        <div
          className="hidden md:block overflow-x-auto rounded-[14px] border"
          style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)' }}
        >
          <table className="w-full text-left text-[14px] min-w-[640px]">
            <thead
              className="sticky top-0 z-10"
              style={{
                background: 'var(--bg-primary)',
                borderBottom: '1px solid var(--border-default)',
              }}
            >
              <tr>
                <th
                  className="py-5 px-6 font-semibold type-small"
                  style={{ color: 'var(--text-tertiary)', width: '40%' }}
                >
                  {t('marketing.comparison.feature')}
                </th>
                <th
                  className="py-5 px-6 font-semibold text-center text-[14px]"
                  style={{
                    color: 'var(--text-link)',
                    background: 'color-mix(in srgb, var(--accent-500) 6%, transparent)',
                    borderLeft: '1px solid var(--border-subtle)',
                  }}
                >
                  Nexus
                </th>
                <th
                  className="py-5 px-6 font-semibold text-center text-[14px]"
                  style={{
                    color: 'var(--text-primary)',
                    borderLeft: '1px solid var(--border-subtle)',
                  }}
                >
                  {competitorName}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.feature}
                  style={{
                    borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                  }}
                >
                  <td
                    className="py-4 px-6 align-top"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <div className="font-medium">{row.feature}</div>
                    {row.honest_note && (
                      <p
                        className="mt-1 type-caption"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {row.honest_note}
                      </p>
                    )}
                  </td>
                  <td
                    className="py-4 px-6 text-center align-top"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-500) 3%, transparent)',
                      borderLeft: '1px solid var(--border-subtle)',
                    }}
                  >
                    <Glyph value={row.nexus} mode="nexus" />
                  </td>
                  <td
                    className="py-4 px-6 text-center align-top"
                    style={{ borderLeft: '1px solid var(--border-subtle)' }}
                  >
                    <Glyph value={row.competitor} mode="competitor" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile — card per row */}
        <div className="md:hidden space-y-3">
          {rows.map((row) => (
            <div
              key={row.feature}
              className="rounded-[12px] border p-4"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-default)',
              }}
            >
              <p
                className="text-[14px] font-semibold mb-3"
                style={{ color: 'var(--text-primary)' }}
              >
                {row.feature}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-[8px] py-3 px-3 text-center"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-500) 8%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--accent-500) 20%, transparent)',
                  }}
                >
                  <p
                    className="type-caption font-semibold mb-1.5"
                    style={{ color: 'var(--text-link)' }}
                  >
                    Nexus
                  </p>
                  <div className="flex items-center justify-center min-h-[24px]">
                    <Glyph value={row.nexus} mode="nexus" />
                  </div>
                </div>
                <div
                  className="rounded-[8px] py-3 px-3 text-center"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <p
                    className="type-caption font-semibold mb-1.5"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {competitorName}
                  </p>
                  <div className="flex items-center justify-center min-h-[24px]">
                    <Glyph value={row.competitor} mode="competitor" />
                  </div>
                </div>
              </div>
              {row.honest_note && (
                <p
                  className="mt-3 type-caption"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {row.honest_note}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div
          className="mt-6 flex flex-wrap items-center gap-5 type-caption"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Check className="w-4 h-4" style={{ color: 'var(--color-brand)' }} />
            {t('marketing.comparison.supported')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <X className="w-4 h-4" style={{ color: 'var(--status-danger)' }} />
            {t('marketing.comparison.notSupported')}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Circle className="w-3 h-3 fill-current" style={{ color: 'var(--status-warning)' }} />
            {t('marketing.comparison.partial')}
          </span>
        </div>
      </div>
    </section>
  )
}
