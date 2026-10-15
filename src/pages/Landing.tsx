import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Sparkles,
  GitMerge,
  Workflow,
  Database,
  ListChecks,
  KeyRound,
  Table2,
  Globe2,
  ArrowRight,
  CheckCircle2,
  Clock,
  Banknote,
  EyeOff,
} from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import LogoCloud from '../components/marketing/LogoCloud'
import FeatureGrid, { type Feature } from '../components/marketing/FeatureGrid'
import Testimonial from '../components/marketing/Testimonial'
import PricingTable from '../components/marketing/PricingTable'
import FAQ from '../components/marketing/FAQ'
import CTABand from '../components/marketing/CTABand'
import { FadeIn, Stagger, StaggerItem } from '../components/MotionPrimitives'

/**
 * Landing — the public home for unauthenticated visitors.
 *
 * Hero positions Nexus as the antithesis to legacy ESG platforms: published
 * pricing, 2-day time-to-disclosure, ESG-native. The hero is followed by a
 * "Legacy vs Nexus" trio of cards (no competitor named — just "legacy"),
 * then the standard FeatureGrid → Testimonial → Capabilities → Pricing →
 * FAQ → CTA stack.
 */

const PILLARS: Feature[] = [
  {
    icon: ShieldCheck,
    title: 'Compliance-grade reporting',
    body:
      'CSRD, ISSB, GRI, TCFD, CDP, SEC — out of the box. Every disclosure is auditable, with a blockchain-anchored trail back to the original data point.',
    link: { label: 'See supported frameworks', href: '/features' },
  },
  {
    icon: Sparkles,
    title: 'AI that drafts and extracts',
    body:
      'Claude-powered narrative generation, evidence extraction from supplier PDFs, and vendor-to-emission-factor matching. Humans approve every number.',
    link: { label: 'How the AI works', href: '/features' },
  },
  {
    icon: GitMerge,
    title: 'Linked data, one source of truth',
    body:
      'Change a value once. It propagates to every framework, every disclosure, every chart it appears in. Auditors love it; analysts get their evenings back.',
    link: { label: 'Explore the data model', href: '/features' },
  },
]

const CAPABILITIES: Feature[] = [
  { icon: Workflow,  title: 'Workflow & approvals',     body: 'Multi-stage review chains with SO / TL / PM roles and automatic escalation.' },
  { icon: Database,  title: 'Emission factor library',  body: 'DEFRA, EPA, IPCC and custom factors. Versioned. Audit-traced. Always up-to-date.' },
  { icon: ListChecks,title: 'Blockchain audit trail',   body: 'Every published figure gets a tamper-evident hash. Anyone can verify with the token.' },
  { icon: KeyRound,  title: 'SAML SSO & SCIM',          body: 'Azure AD, Okta, Google Workspace, JumpCloud. SCIM auto-provisioning included.' },
  { icon: Table2,    title: 'Excel-style spreadsheets', body: 'Bulk entry that feels like Excel — with validation, formulas, and one-click import.' },
  { icon: Globe2,    title: 'Multi-region residency',   body: 'EU and US data residency. Self-host with our Terraform module if you need full control.' },
]

const TIERS = [
  {
    name: 'Starter',
    price: '£0',
    cadence: '/mo',
    description: 'For a single team validating the platform.',
    features: [
      'One workspace, up to 3 users',
      'GRI framework only',
      'Up to 100 disclosures / year',
    ],
    cta: { label: 'Start free', to: '/login?mode=register' },
  },
  {
    name: 'Team',
    price: '£500',
    cadence: '/mo, billed yearly',
    description: 'Production use across all frameworks.',
    features: [
      'Unlimited users',
      'All frameworks (CSRD, ISSB, GRI, TCFD, CDP, SEC)',
      'SSO, audit trail, evidence library',
    ],
    cta: { label: 'Start free trial', to: '/login?mode=register' },
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For groups, regulated industries, and on-prem.',
    features: [
      'Dedicated CSM and onboarding',
      'On-prem or private-cloud option',
      'Custom DPA, SLA, premium support',
    ],
    cta: { label: 'Contact sales', to: '/contact' },
  },
]

const FAQS = [
  {
    q: 'How does Nexus compare to Workiva?',
    a: 'We focus narrowly on sustainability reporting — that lets us go deeper on emission factors, supplier data, and framework-specific disclosure logic. Pricing is also a fraction of Workiva for comparable teams. See the full /compare page for an honest head-to-head.',
  },
  {
    q: 'Which frameworks are supported?',
    a: 'CSRD/ESRS, ISSB (IFRS S1 & S2), GRI Universal + sector, TCFD, CDP (Climate, Water, Forests), SEC climate disclosure, and SASB. 24 frameworks in total, with new ones added as they mature.',
  },
  {
    q: "What's the implementation timeline?",
    a: 'Most teams get a CSRD-ready draft in 48 hours, self-serve. No consultants required, no professional services fees. See /how-it-works for the hour-by-hour breakdown.',
  },
  {
    q: 'Where is data stored?',
    a: 'EU (Frankfurt) by default. US (Virginia) on request. Self-hosted via our Terraform module deploys to your own AWS / Azure / GCP project — your data never leaves your VPC.',
  },
  {
    q: 'Do you support EU and US data residency?',
    a: 'Yes. Both regions on the Team plan, with regional segregation guaranteed. Enterprise customers can add additional regions or on-prem deployments.',
  },
  {
    q: 'Is there an API?',
    a: 'Yes. REST + JSON, fully versioned. Every action in the UI is available via API, including evidence upload, disclosure publishing, and verification. SDKs for Python and TypeScript are in beta.',
  },
]

/**
 * NexusHero — the refreshed hero. Positions Nexus directly against the
 * "six-month implementation, opaque pricing" status quo without naming
 * competitors. Two CTAs, a trust band, and a Legacy-vs-Nexus three-card
 * row underneath.
 */
function NexusHero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          'radial-gradient(80% 60% at 20% 0%, color-mix(in srgb, var(--accent-500) 10%, transparent), transparent 70%), ' +
          'radial-gradient(60% 50% at 90% 30%, color-mix(in srgb, var(--accent-300) 8%, transparent), transparent 70%)',
      }}
    >
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 pt-16 pb-12 sm:pt-24 sm:pb-16 text-center">
        <FadeIn>
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.18em] mb-5"
            style={{ color: 'var(--accent-600)' }}
          >
            ESG Reporting — Reimagined
          </p>
          <h1
            className="h-display mx-auto max-w-[920px]"
            style={{
              fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
              color: 'var(--text-primary)',
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
            }}
          >
            Disclosures shouldn't take six months.{' '}
            <span style={{ color: 'var(--accent-600)' }}>
              Nexus does it in two days.
            </span>
          </h1>
          <p
            className="mt-6 mx-auto max-w-[680px] text-[17px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            One platform. Every framework — CSRD, ISSB, GRI, TCFD, CDP, SEC, EU
            Taxonomy, and more. Auditor-ready. Built ESG-first.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login?mode=register"
              className="btn-primary"
              style={{ height: 46, paddingInline: 24, fontSize: 14 }}
            >
              Start free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/how-it-works"
              className="btn-secondary"
              style={{ height: 46, paddingInline: 22, fontSize: 14 }}
            >
              See how it works
            </Link>
          </div>

          {/* Trust band */}
          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {[
              'No sales call required',
              'Transparent pricing',
              'CSRD-ready in 2 days',
              '24 frameworks',
              'Blockchain audit trail',
            ].map((item, i, arr) => (
              <span key={item} className="inline-flex items-center gap-x-5">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2
                    className="w-3.5 h-3.5"
                    style={{ color: 'var(--accent-500)' }}
                  />
                  {item}
                </span>
                {i < arr.length - 1 && (
                  <span aria-hidden style={{ color: 'var(--border-default)' }}>
                    ·
                  </span>
                )}
              </span>
            ))}
          </div>
        </FadeIn>
      </div>

      {/* Legacy vs Nexus three-card row */}
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 pb-20 sm:pb-24">
        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {[
            {
              icon: Clock,
              label: 'Time to first draft',
              legacy: '6+ months',
              nexus: '2 days',
            },
            {
              icon: Banknote,
              label: 'Implementation cost',
              legacy: '$100K+ services',
              nexus: 'No setup fee',
            },
            {
              icon: EyeOff,
              label: 'Pricing',
              legacy: 'Quote required',
              nexus: '£500/mo Team tier',
            },
          ].map(({ icon: Icon, label, legacy, nexus }) => (
            <StaggerItem key={label}>
              <article
                className="rounded-[16px] border p-6 h-full"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-default)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-4"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-500) 12%, transparent)',
                    color: 'var(--accent-600)',
                  }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {label}
                </p>
                <div className="space-y-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span
                      className="text-[13px]"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Legacy ESG platforms
                    </span>
                    <span
                      className="text-[14px] font-medium line-through"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {legacy}
                    </span>
                  </div>
                  <div
                    className="flex items-baseline justify-between gap-3 pt-2.5"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: 'var(--accent-600)' }}
                    >
                      Nexus
                    </span>
                    <span
                      className="text-[16px] font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {nexus}
                    </span>
                  </div>
                </div>
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

export default function Landing() {
  return (
    <MarketingShell>
      <NexusHero />
      <LogoCloud />
      <FeatureGrid
        eyebrow="Why Nexus"
        heading="Three things sustainability teams ask for."
        subheading="They are also the three things every other tool gets wrong. We rebuilt the stack so each one is a first-class citizen."
        features={PILLARS}
        columns={3}
      />
      <Testimonial
        eyebrow="Customer story"
        quote="Nexus collapsed our disclosure cycle from 6 weeks to 4 days. The linked-data model is exactly the architecture we'd have built in-house — if we had the team."
        author="Head of Sustainability, Demo Co (placeholder until real customer quote available)"
      />
      <FeatureGrid
        eyebrow="The full toolkit"
        heading="Everything an ESG team needs in one place."
        features={CAPABILITIES}
        columns={3}
      />
      <PricingTable tiers={TIERS} compact />
      <FAQ items={FAQS} />
      <CTABand
        heading="Stop quoting six months. Start in two days."
        primary={{ label: 'Start free trial', to: '/login?mode=register' }}
        secondary={{ label: 'See how it works', to: '/how-it-works' }}
      />
    </MarketingShell>
  )
}
