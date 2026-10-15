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

const DESIGN_CHOICES = [
  {
    icon: Layers,
    title: 'Frameworks pre-loaded',
    body:
      '24 frameworks and 700+ datapoints are ready on day one — CSRD, ISSB, GRI, TCFD, CDP, SEC, EU Taxonomy and more. No template buildouts, no consultant-led configuration.',
  },
  {
    icon: Sparkles,
    title: 'AI does the heavy lifting',
    body:
      'Claude-powered evidence extraction reads supplier PDFs and invoices, draft generators write the narrative, and a vendor-to-emission-factor matcher handles the spend-based maths.',
  },
  {
    icon: GitMerge,
    title: 'Linked data, set once',
    body:
      'Change a single value — say, your London facility electricity figure — and every framework, every disclosure, every chart referencing it updates in lockstep.',
  },
  {
    icon: Rocket,
    title: 'Self-serve onboarding',
    body:
      'The welcome wizard walks first-time admins through entity setup, framework selection, and team invites. No implementation consultant required, no professional services fees.',
  },
]

type CompareValue = boolean | string

const LEGACY_COMPARE: { dimension: string; legacy: CompareValue; nexus: CompareValue }[] = [
  { dimension: 'Time to first disclosure',     legacy: '~4–6 months',        nexus: '~48 hours' },
  { dimension: 'Implementation cost',          legacy: '$50K–$200K services', nexus: 'No setup fee' },
  { dimension: 'Pricing transparency',         legacy: false,                 nexus: true },
  { dimension: 'Learning curve',               legacy: 'Steep · training',    nexus: 'Hours, self-serve' },
  { dimension: 'Native ESG focus',             legacy: 'Bolted-on module',    nexus: 'ESG-first architecture' },
  { dimension: 'Multi-framework reuse',        legacy: 'Per-framework setup', nexus: 'One dataset, all frameworks' },
  { dimension: 'AI integration',               legacy: 'Add-on / partial',    nexus: 'Native Claude pipeline' },
  { dimension: 'Audit trail',                  legacy: 'Database logs',       nexus: 'Blockchain-anchored' },
]

function CmpCell({ value }: { value: CompareValue }) {
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
      {value}
    </span>
  )
}

export default function HowItWorks() {
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
              How it works
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
              From zero to CSRD-ready in 48 hours
            </h1>
            <p
              className="mt-5 mx-auto max-w-[640px] text-[17px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Most ESG platforms quote 4-month implementations. Nexus takes 2 days. Here's how.
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
              Why so fast?
            </p>
            <h2
              className="h-display"
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)',
                color: 'var(--text-primary)',
                lineHeight: 1.15,
              }}
            >
              Four design choices that compress months into days.
            </h2>
          </div>

          <Stagger
            staggerMs={70}
            className="grid grid-cols-1 md:grid-cols-2 gap-5"
          >
            {DESIGN_CHOICES.map((c) => (
              <StaggerItem key={c.title}>
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
                    {c.title}
                  </h3>
                  <p
                    className="text-[14px] leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {c.body}
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
              Side-by-side
            </p>
            <h2
              className="h-display"
              style={{
                fontSize: 'clamp(1.75rem, 3.5vw, 2.25rem)',
                color: 'var(--text-primary)',
                lineHeight: 1.15,
              }}
            >
              Legacy ESG platforms vs Nexus.
            </h2>
            <p
              className="mt-4 text-[16px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              The honest summary across eight dimensions — without naming names.
              For a head-to-head against Workiva specifically, see{' '}
              <Link to="/compare" className="underline" style={{ color: 'var(--accent-600)' }}>
                /compare
              </Link>.
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
                    Dimension
                  </th>
                  <th
                    className="py-4 px-6 font-semibold text-center"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Legacy ESG platforms
                  </th>
                  <th
                    className="py-4 px-6 font-semibold text-center"
                    style={{
                      color: 'var(--accent-600)',
                      background: 'color-mix(in srgb, var(--accent-500) 6%, transparent)',
                    }}
                  >
                    Nexus
                  </th>
                </tr>
              </thead>
              <tbody>
                {LEGACY_COMPARE.map((row, i) => (
                  <tr
                    key={row.dimension}
                    style={{
                      borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                    }}
                  >
                    <td
                      className="py-3.5 px-6 font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {row.dimension}
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
                key={row.dimension}
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
                  {row.dimension}
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
                      className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Legacy
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
                      className="text-[10px] font-semibold uppercase tracking-[0.1em] mb-1.5"
                      style={{ color: 'var(--accent-600)' }}
                    >
                      Nexus
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
              See the head-to-head vs Workiva
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <CTABand
        heading="Stop quoting six months. Start in two days."
        primary={{ label: 'Start free trial', to: '/login?mode=register' }}
        secondary={{ label: 'See pricing', to: '/pricing' }}
      />
    </MarketingShell>
  )
}
