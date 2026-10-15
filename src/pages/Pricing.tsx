import { Check, Minus } from 'lucide-react'
import { Link } from 'react-router-dom'
import MarketingShell from '../components/marketing/MarketingShell'
import PricingTable, { type PricingTier } from '../components/marketing/PricingTable'
import FAQ from '../components/marketing/FAQ'
import CTABand from '../components/marketing/CTABand'
import { FadeIn } from '../components/MotionPrimitives'

/**
 * /pricing — full pricing page.
 *
 * NOTE: All prices are ILLUSTRATIVE for v1 marketing. They should be
 * reviewed and confirmed with the commercial team before public launch.
 */

const TIERS: PricingTier[] = [
  {
    name: 'Starter',
    price: '£0',
    cadence: '/mo',
    description: 'For a single team validating Nexus before committing.',
    features: [
      'One workspace, up to 3 users',
      'GRI framework only',
      'Up to 100 disclosures / year',
      'Community support',
    ],
    cta: { label: 'Start free', to: '/login?mode=register' },
  },
  {
    name: 'Team',
    price: '£500',
    cadence: '/mo, billed yearly · £600/mo monthly',
    description: 'Production use across every framework, unlimited users.',
    features: [
      'Unlimited users',
      'All frameworks (CSRD, ISSB, GRI, TCFD, CDP, SEC)',
      'SAML SSO + SCIM provisioning',
      'Blockchain-anchored audit trail',
      'Evidence library + supplier portal',
      'Email + chat support · 24h SLA',
    ],
    cta: { label: 'Start free trial', to: '/login?mode=register' },
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For groups, regulated industries, and on-prem deployments.',
    features: [
      'Dedicated CSM + onboarding',
      'On-prem / private-cloud option',
      'Custom DPA + SLA + premium support',
      'Multi-region data residency',
      'Custom integrations + sandbox',
    ],
    cta: { label: 'Contact sales', to: '/contact' },
  },
]

// Comparison matrix — 20 features × 3 tiers. Use Check / Minus for clarity.
const MATRIX: { feature: string; starter: boolean | string; team: boolean | string; enterprise: boolean | string }[] = [
  { feature: 'Workspaces',                    starter: '1',        team: 'Unlimited',  enterprise: 'Unlimited' },
  { feature: 'Users',                          starter: '3',        team: 'Unlimited',  enterprise: 'Unlimited' },
  { feature: 'GRI framework',                  starter: true,       team: true,         enterprise: true },
  { feature: 'CSRD / ESRS',                    starter: false,      team: true,         enterprise: true },
  { feature: 'ISSB (IFRS S1 + S2)',            starter: false,      team: true,         enterprise: true },
  { feature: 'TCFD',                           starter: false,      team: true,         enterprise: true },
  { feature: 'CDP (Climate, Water, Forests)',  starter: false,      team: true,         enterprise: true },
  { feature: 'SEC climate disclosure',         starter: false,      team: true,         enterprise: true },
  { feature: 'GHG Protocol calculators',       starter: true,       team: true,         enterprise: true },
  { feature: 'Scope 3 modules (all 15)',       starter: false,      team: true,         enterprise: true },
  { feature: 'Evidence library + AI extract',  starter: false,      team: true,         enterprise: true },
  { feature: 'Workflow + approvals',           starter: false,      team: true,         enterprise: true },
  { feature: 'Blockchain audit trail',         starter: false,      team: true,         enterprise: true },
  { feature: 'SAML SSO + SCIM',                starter: false,      team: true,         enterprise: true },
  { feature: 'API + SDKs',                     starter: false,      team: true,         enterprise: true },
  { feature: 'EU + US data residency',         starter: 'EU only',  team: true,         enterprise: true },
  { feature: 'On-prem / private-cloud',        starter: false,      team: false,        enterprise: true },
  { feature: 'Custom DPA',                     starter: false,      team: false,        enterprise: true },
  { feature: 'Dedicated CSM',                  starter: false,      team: false,        enterprise: true },
  { feature: 'SLA',                            starter: false,      team: '24h',        enterprise: 'Custom' },
]

const FAQS = [
  {
    q: 'Can I change plans later?',
    a: 'Yes. Upgrades take effect immediately and are prorated. Downgrades take effect at the end of your current billing period.',
  },
  {
    q: 'Do you offer non-profit or academic pricing?',
    a: 'Yes — contact sales. We typically offer the Team plan at 50% off for verified non-profits and academic institutions.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'Credit card and ACH/wire for Team. Invoice + purchase order for Enterprise. Multi-year contracts available with discount.',
  },
  {
    q: 'Is there a setup fee?',
    a: 'No setup fee for Starter or Team. Enterprise may include a one-time onboarding fee scoped during procurement.',
  },
]

function Cell({ value }: { value: boolean | string }) {
  if (value === true) {
    return <Check className="w-4 h-4 mx-auto" style={{ color: 'var(--accent-600)' }} />
  }
  if (value === false) {
    return <Minus className="w-4 h-4 mx-auto" style={{ color: 'var(--text-quaternary)' }} />
  }
  return <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{value}</span>
}

export default function Pricing() {
  return (
    <MarketingShell>
      {/* Header */}
      <section className="pt-16 pb-8 sm:pt-24 sm:pb-12">
        <div className="max-w-[920px] mx-auto px-5 sm:px-8 text-center">
          <FadeIn>
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.18em] mb-4"
              style={{ color: 'var(--accent-600)' }}
            >
              Published Pricing — No Sales Calls Required
            </p>
            <h1
              className="h-display"
              style={{
                fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}
            >
              Pricing
            </h1>
            <p
              className="mt-5 text-[17px] leading-relaxed mx-auto max-w-[680px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              We publish our prices because we think you should be able to compare us to
              Workiva, Watershed, Persefoni, and everyone else without booking a demo first.
            </p>
          </FadeIn>
        </div>
      </section>

      <PricingTable tiers={TIERS} />

      {/* Why we publish our pricing */}
      <section className="pt-4 pb-16 sm:pb-20">
        <div className="max-w-[920px] mx-auto px-5 sm:px-8">
          <div
            className="rounded-[16px] border p-7 sm:p-10"
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
              Why we publish our pricing
            </p>
            <h2
              className="h-section mb-5"
              style={{ color: 'var(--text-primary)' }}
            >
              Transparency is the product.
            </h2>
            <div
              className="space-y-4 text-[15px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              <p>
                Most ESG platforms hide their numbers behind a "Request a demo" button.
                The reason is simple: they price every customer differently, and they
                don't want you comparing notes. We think that's the wrong instinct for
                a category whose job is making companies more transparent.
              </p>
              <p>
                So we publish ours. £0 to start, £500/month for the Team tier, custom
                for Enterprise. No per-disclosure overages, no implementation tax, no
                surprise renewal hikes. If you outgrow a tier we'll tell you ahead of
                renewal — not blindside you with a bill.
              </p>
              <p>
                If you need to procure a budget, you can do the maths from this page.
                If you want to compare us against{' '}
                <Link to="/compare" className="underline" style={{ color: 'var(--accent-600)' }}>
                  Workiva
                </Link>
                {' '}or anyone else, you can do that too. That's the point.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison matrix */}
      <section className="pb-20 sm:pb-24">
        <div className="max-w-[1180px] mx-auto px-5 sm:px-8">
          <h2
            className="h-display text-center mb-10"
            style={{
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
              color: 'var(--text-primary)',
            }}
          >
            Compare plans
          </h2>

          <div
            className="overflow-x-auto rounded-[12px] border"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)' }}
          >
            <table className="w-full text-left text-[14px] min-w-[640px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <th className="py-4 px-5 font-semibold" style={{ color: 'var(--text-tertiary)' }}>Feature</th>
                  <th className="py-4 px-5 font-semibold text-center" style={{ color: 'var(--text-primary)' }}>Starter</th>
                  <th
                    className="py-4 px-5 font-semibold text-center"
                    style={{
                      color: 'var(--accent-600)',
                      background: 'color-mix(in srgb, var(--accent-500) 5%, transparent)',
                    }}
                  >
                    Team
                  </th>
                  <th className="py-4 px-5 font-semibold text-center" style={{ color: 'var(--text-primary)' }}>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row, i) => (
                  <tr
                    key={row.feature}
                    style={{ borderBottom: i === MATRIX.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}
                  >
                    <td className="py-3 px-5" style={{ color: 'var(--text-primary)' }}>{row.feature}</td>
                    <td className="py-3 px-5 text-center"><Cell value={row.starter} /></td>
                    <td className="py-3 px-5 text-center" style={{ background: 'color-mix(in srgb, var(--accent-500) 3%, transparent)' }}>
                      <Cell value={row.team} />
                    </td>
                    <td className="py-3 px-5 text-center"><Cell value={row.enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <FAQ items={FAQS} heading="Pricing questions" />

      <CTABand
        heading="Still deciding? Talk to a human."
        primary={{ label: 'Start free trial', to: '/login?mode=register' }}
        secondary={{ label: 'Contact sales', to: '/contact' }}
      />
    </MarketingShell>
  )
}
