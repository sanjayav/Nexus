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
} from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import Hero from '../components/marketing/Hero'
import LogoCloud from '../components/marketing/LogoCloud'
import FeatureGrid, { type Feature } from '../components/marketing/FeatureGrid'
import Testimonial from '../components/marketing/Testimonial'
import PricingTable from '../components/marketing/PricingTable'
import FAQ from '../components/marketing/FAQ'
import CTABand from '../components/marketing/CTABand'

/**
 * Landing — the public home for unauthenticated visitors.
 *
 * Sections (top → bottom):
 *   1. Hero
 *   2. LogoCloud — alpha customers
 *   3. FeatureGrid (3 pillars)
 *   4. Testimonial (placeholder customer quote)
 *   5. FeatureGrid (6 capabilities)
 *   6. PricingTable (teaser)
 *   7. FAQ
 *   8. CTABand
 *
 * Restrained, premium SaaS aesthetic; honours the platform's
 * light/dark theme via design-token CSS vars.
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
    a: 'We focus narrowly on sustainability reporting — that lets us go deeper on emission factors, supplier data, and framework-specific disclosure logic. Pricing is also a fraction of Workiva for comparable teams.',
  },
  {
    q: 'Which frameworks are supported?',
    a: 'CSRD/ESRS, ISSB (IFRS S1 & S2), GRI Universal + sector, TCFD, CDP (Climate, Water, Forests), SEC climate disclosure, and SASB. We ship new frameworks as they mature.',
  },
  {
    q: "What's the implementation timeline?",
    a: 'Typical onboarding: 1–2 weeks for a single-entity workspace, 4–6 weeks for a multi-subsidiary group. We do not require professional services — most teams self-serve from the welcome wizard.',
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

export default function Landing() {
  return (
    <MarketingShell>
      <Hero />
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
        heading="Ready to consolidate your sustainability reporting?"
        primary={{ label: 'Start free trial', to: '/login?mode=register' }}
        secondary={{ label: 'Talk to sales', to: '/contact' }}
      />
    </MarketingShell>
  )
}
