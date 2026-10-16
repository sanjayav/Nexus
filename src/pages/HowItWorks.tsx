import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Layers,
  Sparkles,
  GitMerge,
  Rocket,
  Check,
  Minus,
} from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import MarketingShell from '../components/marketing/MarketingShell'
import TimelineGraphic from '../components/marketing/TimelineGraphic'
import CTABand from '../components/marketing/CTABand'
import { FadeIn, Stagger, StaggerItem } from '../components/MotionPrimitives'

/**
 * /how-it-works — the flagship time-to-disclosure story.
 *
 * Sections:
 *   1. Hero — "From zero to CSRD-ready in 48 hours"
 *   2. TimelineGraphic — Hour 1 / 4 / 24 / 48 milestones
 *   3. "Why so fast?" — 4 design-choice cards
 *   4. Legacy-vs-Nexus comparison table (8 dimensions)
 *   5. CTABand — "Stop quoting six months."
 */

// Copy lives in locales/<lang>/howItWorks.json under `howItWorks.why.<id>`
// and `howItWorks.compare.rows.<id>`.
const DESIGN_CHOICES = [
  { id: 'frameworks', icon: Layers },
  { id: 'ai', icon: Sparkles },
  { id: 'linked', icon: GitMerge },
  { id: 'onboarding', icon: Rocket },
] as const

/** `true`/`false` render as check/minus; a string is an i18n key. */
type CompareValue = boolean | string

const rowKey = (id: string) => `howItWorks.compare.rows.${id}`

const LEGACY_COMPARE: { id: string; legacy: CompareValue; nexus: CompareValue }[] = [
  { id: 'time',     legacy: `${rowKey('time')}.legacy`,     nexus: `${rowKey('time')}.nexus` },
  { id: 'cost',     legacy: `${rowKey('cost')}.legacy`,     nexus: `${rowKey('cost')}.nexus` },
  { id: 'pricing',  legacy: false,                          nexus: true },
  { id: 'learning', legacy: `${rowKey('learning')}.legacy`, nexus: `${rowKey('learning')}.nexus` },
  { id: 'native',   legacy: `${rowKey('native')}.legacy`,   nexus: `${rowKey('native')}.nexus` },
  { id: 'reuse',    legacy: `${rowKey('reuse')}.legacy`,    nexus: `${rowKey('reuse')}.nexus` },
  { id: 'ai',       legacy: `${rowKey('ai')}.legacy`,       nexus: `${rowKey('ai')}.nexus` },
  { id: 'audit',    legacy: `${rowKey('audit')}.legacy`,    nexus: `${rowKey('audit')}.nexus` },
]

function CmpCell({ value }: { value: CompareValue }) {
  const { t } = useTranslation()
  if (value === true) {
    return <Check className="w-5 h-5 mx-auto" style={{ color: 'var(--accent-500)' }} />
  }
  if (value === false) {
    return <Minus className="w-5 h-5 mx-auto" style={{ color: 'var(--text-quaternary)' }} />
  }
  return (
    <span
      className="text-[13px] font-medium"
      style={{ color: 'var(--text-primary)' }}
    >
      {t(value)}
    </span>
  )
}

export default function HowItWorks() {
  const { t } = useTranslation()
  return (
    <MarketingShell>
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            'radial-gradient(75% 50% at 50% 0%, color-mix(in srgb, var(--accent-500) 8%, transparent), transparent 70%)',
        }}
      >
        <div className="max-w-[920px] mx-auto px-5 sm:px-8 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center">
          <FadeIn>
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.18em] mb-5"
              style={{ color: 'var(--accent-600)' }}
            >
              {t('howItWorks.eyebrow')}
            </p>
            <h1
              className="h-display"
              style={{
                fontSize: 'clamp(2rem, 4.8vw, 3.5rem)',
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.08,
              }}
            >
              {t('howItWorks.title')}
            </h1>
            <p
              className="mt-5 mx-auto max-w-[640px] text-[17px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('howItWorks.intro')}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── Timeline ── */}
      <TimelineGraphic />

      {/* ── Why so fast? ── */}
      <section className="py-16 sm:py-20" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-[1180px] mx-auto px-5 sm:px-8">
          <div className="max-w-[680px] mb-10">
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-3"
              style={{ color: 'var(--accent-600)' }}
            >
              {t('howItWorks.why.eyebrow')}
            </p>
            <h2
              className="h-display"
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)',
                color: 'var(--text-primary)',
                lineHeight: 1.15,
              }}
            >
              {t('howItWorks.why.heading')}
            </h2>
          </div>

          <Stagger
            staggerMs={70}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {DESIGN_CHOICES.map((c) => (
              <StaggerItem key={c.id}>
                <article
                  className="h-full rounded-[16px] border p-7"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border-default)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-[10px] flex items-center justify-center mb-5"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-500) 12%, transparent)',
                      color: 'var(--accent-600)',
                    }}
                  >
                    <c.icon className="w-5 h-5" />
                  </div>
                  <h3
                    className="h-section mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t(`howItWorks.why.${c.id}.title`)}
                  </h3>
                  <p
                    className="text-[14px] leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {t(`howItWorks.why.${c.id}.body`)}
                  </p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── Compare to legacy ── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-[1180px] mx-auto px-5 sm:px-8">
          <div className="max-w-[680px] mb-10">
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-3"
              style={{ color: 'var(--accent-600)' }}
            >
              {t('howItWorks.compare.eyebrow')}
            </p>
            <h2
              className="h-display"
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)',
                color: 'var(--text-primary)',
                lineHeight: 1.15,
              }}
            >
              {t('howItWorks.compare.heading')}
            </h2>
            <p
              className="mt-4 text-[16px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Trans
                i18nKey="howItWorks.compare.intro"
                components={{
                  compareLink: <Link to="/compare" className="underline" style={{ color: 'var(--accent-600)' }} />,
                }}
              />
            </p>
          </div>

          {/* Desktop table */}
          <div
            className="hidden md:block overflow-x-auto rounded-[12px] border"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)' }}
          >
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <th
                    className="py-4 px-6 font-semibold text-[12px] uppercase tracking-[0.1em]"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {t('howItWorks.compare.dimension')}
                  </th>
                  <th
                    className="py-4 px-6 font-semibold text-center"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t('howItWorks.compare.legacyPlatforms')}
                  </th>
                  <th
                    className="py-4 px-6 font-semibold text-center"
                    style={{
                      color: 'var(--accent-600)',
                      background: 'color-mix(in srgb, var(--accent-500) 6%, transparent)',
                    }}
                  >
                    {t('howItWorks.compare.nexus')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {LEGACY_COMPARE.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{
                      borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                    }}
                  >
                    <td
                      className="py-3.5 px-6 font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {t(`howItWorks.compare.rows.${row.id}.dimension`)}
                    </td>
                    <td className="py-3.5 px-6 text-center" style={{ color: 'var(--text-secondary)' }}>
                      <CmpCell value={row.legacy} />
                    </td>
                    <td
                      className="py-3.5 px-6 text-center"
                      style={{ background: 'color-mix(in srgb, var(--accent-500) 3%, transparent)' }}
                    >
                      <CmpCell value={row.nexus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {LEGACY_COMPARE.map((row) => (
              <div
                key={row.id}
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
                  {t(`howItWorks.compare.rows.${row.id}.dimension`)}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className="rounded-[8px] py-3 px-3 text-center"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <p
                      className="text-micro font-semibold uppercase tracking-[0.06em] mb-1.5"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {t('howItWorks.compare.legacy')}
                    </p>
                    <CmpCell value={row.legacy} />
                  </div>
                  <div
                    className="rounded-[8px] py-3 px-3 text-center"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-500) 8%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--accent-500) 20%, transparent)',
                    }}
                  >
                    <p
                      className="text-micro font-semibold uppercase tracking-[0.06em] mb-1.5"
                      style={{ color: 'var(--accent-600)' }}
                    >
                      {t('howItWorks.compare.nexus')}
                    </p>
                    <CmpCell value={row.nexus} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/compare"
              className="btn-secondary"
              style={{ height: 42, paddingInline: 20, fontSize: 14 }}
            >
              {t('howItWorks.compare.seeWorkiva')}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <CTABand
        heading={t('howItWorks.cta.heading')}
        primary={{ label: t('howItWorks.cta.primary'), to: '/login?mode=register' }}
        secondary={{ label: t('howItWorks.cta.secondary'), to: '/pricing' }}
      />
    </MarketingShell>
  )
}
