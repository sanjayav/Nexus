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

const ROWS: ComparisonRow[] = [
  {
    feature: 'Pricing transparency',
    nexus: 'yes',
    competitor: 'no',
    honest_note: 'Nexus publishes tier pricing. Workiva requires a custom quote.',
  },
  {
    feature: 'Starter tier',
    nexus: 'Free',
    competitor: '~$60K avg',
    honest_note: 'Industry estimate; Workiva does not publish.',
  },
  {
    feature: 'Implementation time',
    nexus: '~2 days',
    competitor: '~4 months',
  },
  {
    feature: 'Frameworks supported',
    nexus: '24',
    competitor: '18+',
  },
  {
    feature: 'iXBRL tagging',
    nexus: 'partial',
    competitor: 'yes',
    honest_note: 'Honest: Workiva is industry-leading on iXBRL. Nexus is partner-ready, not yet best-in-class.',
  },
  {
    feature: 'ESG-native architecture',
    nexus: 'yes',
    competitor: 'no',
    honest_note: 'Workiva\'s ESG module sits atop a finance/disclosure platform; Nexus was built ESG-first.',
  },
  {
    feature: 'Blockchain audit trail',
    nexus: 'yes',
    competitor: 'no',
  },
  {
    feature: 'AI evidence extraction',
    nexus: 'Claude Sonnet 4.6',
    competitor: 'yes',
  },
  {
    feature: 'AI gap analysis',
    nexus: 'yes',
    competitor: 'yes',
    honest_note: 'Workiva markets this as "ESRS Intelligence". Both ship a comparable capability.',
  },
  {
    feature: 'AI vendor → emission-factor matcher',
    nexus: 'yes',
    competitor: 'yes',
  },
  {
    feature: 'Linked data',
    nexus: 'yes',
    competitor: 'yes',
    honest_note: 'Both platforms propagate values across disclosures from a single source.',
  },
  {
    feature: 'Multi-LLM routing',
    nexus: 'Anthropic',
    competitor: 'Gemini + OpenAI + Anthropic',
    honest_note: 'Workiva claims multi-vendor LLM routing; Nexus uses Anthropic only by design.',
  },
  {
    feature: 'Real-time collaboration',
    nexus: 'Liveblocks',
    competitor: 'yes',
  },
  {
    feature: 'Spreadsheet formulas',
    nexus: 'no',
    competitor: 'yes',
    honest_note: 'Honest: Workiva\'s spreadsheet engine is a mature differentiator. Nexus offers bulk entry but not full formulas.',
  },
  {
    feature: '70+ pre-built ERP connectors',
    nexus: '6 templates',
    competitor: 'yes',
    honest_note: 'Honest: Workiva\'s connector library is far broader. Nexus offers 6 templates plus open API.',
  },
  {
    feature: 'PCAF financed emissions',
    nexus: 'yes',
    competitor: 'no',
  },
  {
    feature: 'SCIM 2.0',
    nexus: 'yes',
    competitor: 'yes',
  },
  {
    feature: 'SAML SSO',
    nexus: 'yes',
    competitor: 'yes',
  },
  {
    feature: 'SOC 2 Type II',
    nexus: 'In progress',
    competitor: 'yes',
    honest_note: 'Honest: Workiva holds SOC 2 Type II. Nexus is mid-audit and will publish once attested.',
  },
  {
    feature: 'Self-serve trial',
    nexus: 'yes',
    competitor: 'no',
  },
]

export default function Compare() {
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
              Compare
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
              Nexus vs Workiva — honestly.
            </h1>
            <p
              className="mt-5 mx-auto max-w-[640px] text-[17px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              We respect Workiva's track record. Here's where each platform wins,
              including the places Nexus has work to do.
            </p>
          </FadeIn>
        </div>
      </section>

      <ComparisonTable competitorName="Workiva" rows={ROWS} />

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
              The honest take
            </p>
            <h2
              className="h-section mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Different teams, different choices.
            </h2>
            <p
              className="text-[15px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Workiva is a great choice if you're a Fortune 500 with a 4-month
              implementation budget, need industry-leading iXBRL tagging, and want
              every connector pre-built. Nexus is for teams that need to ship CSRD
              now, want transparent pricing, and value a modern UX without the
              steep learning curve. Both platforms deliver auditor-ready reports —
              we take different paths to get there.
            </p>
          </div>
        </div>
      </section>

      <CTABand
        heading="Try Nexus free for 14 days."
        primary={{ label: 'Start free trial', to: '/login?mode=register' }}
        secondary={{ label: 'See how it works', to: '/how-it-works' }}
      />
    </MarketingShell>
  )
}
