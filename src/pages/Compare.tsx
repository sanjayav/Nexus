import { useTranslation } from 'react-i18next'
import MarketingShell from '../components/marketing/MarketingShell'
import ComparisonTable, { type ComparisonRow } from '../components/marketing/ComparisonTable'
import CTABand from '../components/marketing/CTABand'
import { FadeIn } from '../components/MotionPrimitives'

/**
 * /compare — Nexus vs Workiva head-to-head.
 *
 * Honest comparison: we admit where Workiva is stronger (iXBRL tagging,
 * connector breadth, SOC 2 Type II) and where Nexus wins (pricing,
 * time-to-disclosure, ESG-native architecture, blockchain audit).
 *
 * 20-row matrix is rendered by <ComparisonTable />.
 */

/**
 * Rows keep the English text as the fallback; display copy is looked up by
 * `id` (and `nexusKey` / `competitorKey` for translatable cell labels) at
 * render time. 'yes' / 'no' / 'partial' are glyph sentinels — never translated.
 */
type RowDef = ComparisonRow & { id: string; nexusKey?: string; competitorKey?: string }

const ROWS: RowDef[] = [
  { id: 'pricingTransparency', feature: 'Pricing transparency', nexus: 'yes', competitor: 'no', honest_note: 'Nexus publishes tier pricing. Workiva requires a custom quote.' },
  { id: 'starterTier', feature: 'Starter tier', nexus: 'Free', nexusKey: 'free', competitor: '~$60K avg', competitorKey: 'avg60k', honest_note: 'Industry estimate; Workiva does not publish.' },
  { id: 'implementationTime', feature: 'Implementation time', nexus: '~2 days', nexusKey: 'twoDays', competitor: '~4 months', competitorKey: 'fourMonths' },
  { id: 'frameworksSupported', feature: 'Frameworks supported', nexus: '24', competitor: '18+' },
  { id: 'ixbrl', feature: 'iXBRL tagging', nexus: 'partial', competitor: 'yes', honest_note: 'Honest: Workiva is industry-leading on iXBRL. Nexus is partner-ready, not yet best-in-class.' },
  { id: 'esgNative', feature: 'ESG-native architecture', nexus: 'yes', competitor: 'no', honest_note: 'Workiva\'s ESG module sits atop a finance/disclosure platform; Nexus was built ESG-first.' },
  { id: 'blockchainAudit', feature: 'Blockchain audit trail', nexus: 'yes', competitor: 'no' },
  { id: 'aiEvidence', feature: 'AI evidence extraction', nexus: 'Claude Sonnet 4.6', competitor: 'yes' },
  { id: 'aiGap', feature: 'AI gap analysis', nexus: 'yes', competitor: 'yes', honest_note: 'Workiva markets this as "ESRS Intelligence". Both ship a comparable capability.' },
  { id: 'aiFactorMatcher', feature: 'AI vendor → emission-factor matcher', nexus: 'yes', competitor: 'yes' },
  { id: 'linkedData', feature: 'Linked data', nexus: 'yes', competitor: 'yes', honest_note: 'Both platforms propagate values across disclosures from a single source.' },
  { id: 'multiLlm', feature: 'Multi-LLM routing', nexus: 'Anthropic', competitor: 'Gemini + OpenAI + Anthropic', honest_note: 'Workiva claims multi-vendor LLM routing; Nexus uses Anthropic only by design.' },
  { id: 'realtimeCollab', feature: 'Real-time collaboration', nexus: 'Liveblocks', competitor: 'yes' },
  { id: 'spreadsheetFormulas', feature: 'Spreadsheet formulas', nexus: 'no', competitor: 'yes', honest_note: 'Honest: Workiva\'s spreadsheet engine is a mature differentiator. Nexus offers bulk entry but not full formulas.' },
  { id: 'erpConnectors', feature: '70+ pre-built ERP connectors', nexus: '6 templates', nexusKey: 'sixTemplates', competitor: 'yes', honest_note: 'Honest: Workiva\'s connector library is far broader. Nexus offers 6 templates plus open API.' },
  { id: 'pcaf', feature: 'PCAF financed emissions', nexus: 'yes', competitor: 'no' },
  { id: 'scim', feature: 'SCIM 2.0', nexus: 'yes', competitor: 'yes' },
  { id: 'samlSso', feature: 'SAML SSO', nexus: 'yes', competitor: 'yes' },
  { id: 'soc2', feature: 'SOC 2 Type II', nexus: 'In progress', nexusKey: 'inProgress', competitor: 'yes', honest_note: 'Honest: Workiva holds SOC 2 Type II. Nexus is mid-audit and will publish once attested.' },
  { id: 'selfServeTrial', feature: 'Self-serve trial', nexus: 'yes', competitor: 'no' },
]

export default function Compare() {
  const { t } = useTranslation()
  const rows: ComparisonRow[] = ROWS.map(({ id, nexusKey, competitorKey, ...r }) => ({
    feature: t(`compare.rows.${id}.feature`, { defaultValue: r.feature }),
    nexus: nexusKey ? t(`compare.values.${nexusKey}`, { defaultValue: r.nexus }) : r.nexus,
    competitor: competitorKey ? t(`compare.values.${competitorKey}`, { defaultValue: r.competitor }) : r.competitor,
    honest_note: r.honest_note ? t(`compare.rows.${id}.note`, { defaultValue: r.honest_note }) : undefined,
  }))
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
        <div className="max-w-[920px] mx-auto px-5 sm:px-8 pt-16 pb-10 sm:pt-24 sm:pb-12 text-center">
          <FadeIn>
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.18em] mb-5"
              style={{ color: 'var(--accent-600)' }}
            >
              {t('compare.hero.eyebrow')}
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
              {t('compare.hero.title')}
            </h1>
            <p
              className="mt-5 mx-auto max-w-[640px] text-[17px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('compare.hero.subtitle')}
            </p>
          </FadeIn>
        </div>
      </section>

      <ComparisonTable competitorName="Workiva" rows={rows} />

      {/* ── The honest take ── */}
      <section className="pb-16 sm:pb-20">
        <div className="max-w-[840px] mx-auto px-5 sm:px-8">
          <div
            className="rounded-[16px] border p-7 sm:p-9"
            style={{
              background: 'var(--bg-primary)',
              borderColor: 'var(--border-default)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-3"
              style={{ color: 'var(--accent-600)' }}
            >
              {t('compare.honestTake.eyebrow')}
            </p>
            <h2
              className="h-section mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('compare.honestTake.title')}
            </h2>
            <p
              className="text-[15px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('compare.honestTake.body')}
            </p>
          </div>
        </div>
      </section>

      <CTABand
        heading={t('compare.cta.heading')}
        primary={{ label: t('compare.cta.primary'), to: '/login?mode=register' }}
        secondary={{ label: t('compare.cta.secondary'), to: '/how-it-works' }}
      />
    </MarketingShell>
  )
}
