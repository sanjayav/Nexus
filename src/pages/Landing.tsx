import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
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
import PricingTable, { type PricingTier } from '../components/marketing/PricingTable'
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

// Copy lives in locales/<lang>/landing.json; the constants below hold only
// stable ids, icons and hrefs. Ids double as the i18n sub-keys.
const PILLARS = [
  { id: 'compliance', icon: ShieldCheck, href: '/features' },
  { id: 'ai', icon: Sparkles, href: '/features' },
  { id: 'linkedData', icon: GitMerge, href: '/features' },
] as const

const CAPABILITIES = [
  { id: 'workflow', icon: Workflow },
  { id: 'emissionFactors', icon: Database },
  { id: 'blockchain', icon: ListChecks },
  { id: 'sso', icon: KeyRound },
  { id: 'spreadsheets', icon: Table2 },
  { id: 'residency', icon: Globe2 },
] as const

const FAQ_IDS = ['workiva', 'frameworks', 'timeline', 'storage', 'residency', 'api'] as const

function buildPillars(t: TFunction): Feature[] {
  return PILLARS.map(({ id, icon, href }) => ({
    icon,
    title: t(`landing.pillars.${id}.title`),
    body: t(`landing.pillars.${id}.body`),
    link: { label: t(`landing.pillars.${id}.link`), href },
  }))
}

function buildCapabilities(t: TFunction): Feature[] {
  return CAPABILITIES.map(({ id, icon }) => ({
    icon,
    title: t(`landing.capabilities.${id}.title`),
    body: t(`landing.capabilities.${id}.body`),
  }))
}

function buildTiers(t: TFunction): PricingTier[] {
  return [
    {
      name: t('marketing.plans.starter'),
      price: '£0',
      cadence: t('marketing.plans.perMonth'),
      description: t('landing.tiers.starter.description'),
      features: [
        t('landing.tiers.starter.f1'),
        t('landing.tiers.starter.f2'),
        t('landing.tiers.starter.f3'),
      ],
      cta: { label: t('marketing.cta.startFree'), to: '/login?mode=register' },
    },
    {
      name: t('marketing.plans.team'),
      price: '£500',
      cadence: t('landing.tiers.team.cadence'),
      description: t('landing.tiers.team.description'),
      features: [
        t('landing.tiers.team.f1'),
        t('landing.tiers.team.f2'),
        t('landing.tiers.team.f3'),
      ],
      cta: { label: t('marketing.cta.startFreeTrial'), to: '/login?mode=register' },
      featured: true,
    },
    {
      name: t('marketing.plans.enterprise'),
      price: t('marketing.plans.custom'),
      description: t('landing.tiers.enterprise.description'),
      features: [
        t('landing.tiers.enterprise.f1'),
        t('landing.tiers.enterprise.f2'),
        t('landing.tiers.enterprise.f3'),
      ],
      cta: { label: t('marketing.cta.contactSales'), to: '/contact' },
    },
  ]
}

function buildFaqs(t: TFunction) {
  return FAQ_IDS.map((id) => ({
    q: t(`landing.faq.${id}.q`),
    a: t(`landing.faq.${id}.a`),
  }))
}

/**
 * NexusHero — the refreshed hero. Positions Nexus directly against the
 * "six-month implementation, opaque pricing" status quo without naming
 * competitors. Two CTAs, a trust band, and a Legacy-vs-Nexus three-card
 * row underneath.
 */
function NexusHero() {
  const { t } = useTranslation()
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
            {t('landing.hero.eyebrow')}
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
            {t('landing.hero.titleLead')}{' '}
            <span style={{ color: 'var(--accent-600)' }}>
              {t('landing.hero.titleAccent')}
            </span>
          </h1>
          <p
            className="mt-6 mx-auto max-w-[680px] text-[17px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('landing.hero.subtitle')}
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/login?mode=register"
              className="btn-primary"
              style={{ height: 46, paddingInline: 24, fontSize: 14 }}
            >
              {t('marketing.cta.startFree')}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/how-it-works"
              className="btn-secondary"
              style={{ height: 46, paddingInline: 22, fontSize: 14 }}
            >
              {t('marketing.cta.seeHowItWorks')}
            </Link>
          </div>

          {/* Trust band */}
          <div
            className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {[
              t('landing.hero.trust.noSalesCall'),
              t('landing.hero.trust.transparentPricing'),
              t('landing.hero.trust.csrdReady'),
              t('landing.hero.trust.frameworks'),
              t('landing.hero.trust.blockchain'),
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
              id: 'timeToDraft',
              icon: Clock,
              label: t('landing.versus.timeToDraft.label'),
              legacy: t('landing.versus.timeToDraft.legacy'),
              nexus: t('landing.versus.timeToDraft.nexus'),
            },
            {
              id: 'implementationCost',
              icon: Banknote,
              label: t('landing.versus.implementationCost.label'),
              legacy: t('landing.versus.implementationCost.legacy'),
              nexus: t('landing.versus.implementationCost.nexus'),
            },
            {
              id: 'pricing',
              icon: EyeOff,
              label: t('landing.versus.pricing.label'),
              legacy: t('landing.versus.pricing.legacy'),
              nexus: t('landing.versus.pricing.nexus'),
            },
          ].map(({ id, icon: Icon, label, legacy, nexus }) => (
            <StaggerItem key={id}>
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
                      {t('landing.versus.legacyLabel')}
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
  const { t } = useTranslation()
  return (
    <MarketingShell>
      <NexusHero />
      <LogoCloud />
      <FeatureGrid
        eyebrow={t('landing.pillars.eyebrow')}
        heading={t('landing.pillars.heading')}
        subheading={t('landing.pillars.subheading')}
        features={buildPillars(t)}
        columns={3}
      />
      <Testimonial
        eyebrow={t('landing.testimonial.eyebrow')}
        quote={t('landing.testimonial.quote')}
        author={t('landing.testimonial.author')}
      />
      <FeatureGrid
        eyebrow={t('landing.capabilities.eyebrow')}
        heading={t('landing.capabilities.heading')}
        features={buildCapabilities(t)}
        columns={3}
      />
      <PricingTable tiers={buildTiers(t)} compact />
      <FAQ items={buildFaqs(t)} />
      <CTABand
        heading={t('landing.ctaBand.heading')}
        primary={{ label: t('marketing.cta.startFreeTrial'), to: '/login?mode=register' }}
        secondary={{ label: t('marketing.cta.seeHowItWorks'), to: '/how-it-works' }}
      />
    </MarketingShell>
  )
}
