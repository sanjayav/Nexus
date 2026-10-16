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
import FeatureGrid, { type Feature } from '../components/marketing/FeatureGrid'
import PageHero, { SectionHeading } from '../components/marketing/PageHero'
import { FRAMEWORK_COUNT, DISCLOSURE_ITEM_COUNT } from '../components/marketing/FrameworkStrip'
import { Reveal, RevealGroup, RevealItem } from '../components/marketing/motion'

/**
 * /how-it-works — the flagship time-to-disclosure story.
 *
 *   1. Hero — "From zero to CSRD-ready in 48 hours"
 *   2. TimelineGraphic — Hour 1 / 4 / 24 / 48 milestones (draws on scroll)
 *   3. "Why so fast?" — four design choices, ruled ledger
 *   4. Legacy-vs-Nexus comparison (8 dimensions)
 *   5. CTABand
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

function CmpCell({ value, strong }: { value: CompareValue; strong?: boolean }) {
  const { t } = useTranslation()
  if (value === true) {
    return <Check className="w-5 h-5 mx-auto" style={{ color: 'var(--color-brand)' }} aria-label={t('marketing.comparison.ariaYes')} />
  }
  if (value === false) {
    return <Minus className="w-5 h-5 mx-auto" style={{ color: 'var(--text-quaternary)' }} aria-label={t('marketing.comparison.ariaNo')} />
  }
  return (
    <span className={`type-small ${strong ? 'font-semibold' : ''}`} style={{ color: strong ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
      {t(value)}
    </span>
  )
}

export default function HowItWorks() {
  const { t } = useTranslation()
  const why: Feature[] = DESIGN_CHOICES.map((c) => ({
    icon: c.icon,
    title: t(`howItWorks.why.${c.id}.title`),
    body: t(`howItWorks.why.${c.id}.body`, { count: FRAMEWORK_COUNT, items: DISCLOSURE_ITEM_COUNT.toLocaleString() }),
  }))

  return (
    <MarketingShell>
      <PageHero kicker={t('howItWorks.eyebrow')} title={t('howItWorks.title')} intro={t('howItWorks.intro')} />

      <TimelineGraphic />

      <div style={{ background: 'var(--bg-secondary)' }}>
        <FeatureGrid variant="ledger" heading={t('howItWorks.why.heading')} features={why} columns={2} />
      </div>

      {/* ── Compare to legacy ── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8">
          <Reveal>
            <SectionHeading
              title={t('howItWorks.compare.heading')}
              lead={
                <Trans
                  i18nKey="howItWorks.compare.intro"
                  components={{
                    compareLink: <Link to="/compare" className="underline underline-offset-4" style={{ color: 'var(--text-link)' }} />,
                  }}
                />
              }
              className="mb-10"
            />
          </Reveal>

          {/* Desktop table */}
          <Reveal className="hidden md:block surface-paper !rounded-[20px] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <th scope="col" className="py-4 px-6 type-small font-semibold" style={{ color: 'var(--text-tertiary)' }}>
                    {t('howItWorks.compare.dimension')}
                  </th>
                  <th scope="col" className="py-4 px-6 type-small font-semibold text-center" style={{ color: 'var(--text-secondary)' }}>
                    {t('howItWorks.compare.legacyPlatforms')}
                  </th>
                  <th scope="col" className="py-4 px-6 type-small font-semibold text-center" style={{ color: 'var(--text-link)', background: 'var(--color-brand-soft)' }}>
                    {t('howItWorks.compare.nexus')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {LEGACY_COMPARE.map((row, i) => (
                  <tr key={row.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)' }}>
                    <th scope="row" className="py-4 px-6 type-body font-medium" style={{ color: 'var(--text-primary)' }}>
                      {t(`howItWorks.compare.rows.${row.id}.dimension`)}
                    </th>
                    <td className="py-4 px-6 text-center"><CmpCell value={row.legacy} /></td>
                    <td className="py-4 px-6 text-center" style={{ background: 'color-mix(in srgb, var(--color-brand-soft) 60%, transparent)' }}>
                      <CmpCell value={row.nexus} strong />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>

          {/* Mobile cards */}
          <RevealGroup className="md:hidden space-y-3">
            {LEGACY_COMPARE.map((row) => (
              <RevealItem key={row.id} className="surface-paper p-4">
                <p className="type-h3 mb-3" style={{ color: 'var(--text-primary)' }}>
                  {t(`howItWorks.compare.rows.${row.id}.dimension`)}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-[10px] py-3 px-3 text-center" style={{ background: 'var(--bg-secondary)' }}>
                    <p className="type-caption font-medium mb-1.5" style={{ color: 'var(--text-tertiary)' }}>{t('howItWorks.compare.legacy')}</p>
                    <CmpCell value={row.legacy} />
                  </div>
                  <div className="rounded-[10px] py-3 px-3 text-center" style={{ background: 'var(--color-brand-soft)' }}>
                    <p className="type-caption font-semibold mb-1.5" style={{ color: 'var(--text-link)' }}>{t('howItWorks.compare.nexus')}</p>
                    <CmpCell value={row.nexus} strong />
                  </div>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>

          <div className="mt-10 flex justify-center">
            <Link to="/compare" className="btn-secondary h-11 px-5 text-[14px]">
              {t('howItWorks.compare.seeWorkiva')}
              <ArrowRight className="w-4 h-4" aria-hidden />
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
