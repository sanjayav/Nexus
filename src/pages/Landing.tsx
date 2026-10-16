import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
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
  Check,
} from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import FeatureGrid, { type Feature } from '../components/marketing/FeatureGrid'
import PricingTable, { type PricingTier } from '../components/marketing/PricingTable'
import FAQ from '../components/marketing/FAQ'
import CTABand from '../components/marketing/CTABand'
import FrameworkStrip, { FRAMEWORK_COUNT } from '../components/marketing/FrameworkStrip'
import { RevealGroup, RevealItem } from '../components/marketing/motion'
import { ContourField } from '../components/ui'
import { dur, ease } from '../motion/tokens'

// Below-the-fold sections with their own motion logic load after the hero.
const HeroWorkflow = lazy(() => import('../components/marketing/HeroWorkflow'))
const ChinaSection = lazy(() => import('../components/marketing/ChinaSection'))

/**
 * Landing — the public home for unauthenticated visitors.
 *
 *   1. Hero — the promise, two CTAs, and the authored moment: one disclosure
 *      value travelling assign → publish (HeroWorkflow).
 *   2. Legacy vs Nexus ledger (no competitor named).
 *   3. Framework catalogue strip (replaces the old placeholder logo cloud).
 *   4. Three pillars (bento).
 *   5. China-ready (ink section, bilingual report preview).
 *   6. Toolkit ledger, pricing teaser, FAQ, closing CTA.
 *
 * Nothing on this page names a customer or quotes one: the previous
 * placeholder logos and testimonial were removed rather than dressed up.
 */

// Copy lives in locales/<lang>/landing.json; the constants below hold only
// stable ids, icons and hrefs. Ids double as the i18n sub-keys.
const PILLARS = [
  { id: 'compliance', icon: ShieldCheck, href: '/features', illustration: 'published' as const },
  { id: 'ai', icon: Sparkles, href: '/features' },
  { id: 'linkedData', icon: GitMerge, href: '/how-it-works' },
] as const

const CAPABILITIES = [
  { id: 'workflow', icon: Workflow },
  { id: 'emissionFactors', icon: Database },
  { id: 'blockchain', icon: ListChecks },
  { id: 'sso', icon: KeyRound },
  { id: 'spreadsheets', icon: Table2 },
  { id: 'residency', icon: Globe2 },
] as const

const FAQ_IDS = ['workiva', 'frameworks', 'china', 'timeline', 'storage', 'residency', 'api'] as const
const VERSUS = ['timeToDraft', 'implementationCost', 'pricing'] as const

function buildPillars(t: TFunction): Feature[] {
  return PILLARS.map((p) => ({
    icon: p.icon,
    title: t(`landing.pillars.${p.id}.title`),
    body: t(`landing.pillars.${p.id}.body`),
    link: { label: t(`landing.pillars.${p.id}.link`), href: p.href },
    illustration: 'illustration' in p ? p.illustration : undefined,
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
      features: [t('landing.tiers.starter.f1'), t('landing.tiers.starter.f2'), t('landing.tiers.starter.f3')],
      cta: { label: t('marketing.cta.startFree'), to: '/login?mode=register' },
    },
    {
      name: t('marketing.plans.team'),
      price: '£500',
      cadence: t('landing.tiers.team.cadence'),
      description: t('landing.tiers.team.description'),
      features: [t('landing.tiers.team.f1'), t('landing.tiers.team.f2'), t('landing.tiers.team.f3')],
      cta: { label: t('marketing.cta.startFreeTrial'), to: '/login?mode=register' },
      featured: true,
    },
    {
      name: t('marketing.plans.enterprise'),
      price: t('marketing.plans.custom'),
      description: t('landing.tiers.enterprise.description'),
      features: [t('landing.tiers.enterprise.f1'), t('landing.tiers.enterprise.f2'), t('landing.tiers.enterprise.f3')],
      cta: { label: t('marketing.cta.contactSales'), to: '/contact' },
    },
  ]
}

/** Static stand-in with the card's footprint, so the hero never jumps. */
function WorkflowPlaceholder() {
  return <div className="surface-raised h-[520px] sm:h-[560px]" aria-hidden />
}

function NexusHero() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const beat = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16, filter: 'blur(8px)' },
          animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
          transition: { duration: dur.slow + 0.3, ease: ease.out, delay: 0.07 * i },
        }

  const trust = [
    t('landing.hero.trust.noSalesCall'),
    t('landing.hero.trust.transparentPricing'),
    t('landing.hero.trust.frameworks', { count: FRAMEWORK_COUNT }),
    t('landing.hero.trust.bilingual'),
    t('landing.hero.trust.blockchain'),
  ]

  return (
    <section className="relative overflow-hidden isolate -mt-16 pt-16">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 70% at 85% 10%, color-mix(in srgb, var(--accent-500) 14%, transparent), transparent 70%), ' +
            'radial-gradient(50% 50% at 0% 0%, color-mix(in srgb, var(--accent-300) 10%, transparent), transparent 70%)',
        }}
      />
      <ContourField className="absolute inset-0 w-full h-full -z-10 [mask-image:linear-gradient(to_bottom,black_55%,transparent)]" anchor="top-right" rings={22} animate seed={42} />

      <div className="max-w-[1280px] mx-auto px-4 sm:px-8 pt-12 pb-16 sm:pt-20 sm:pb-24 grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[1.08fr_0.92fr] gap-14 lg:gap-16 items-center">
        <div>
          <motion.p {...beat(0)} className="text-[14px] font-medium mb-5" style={{ color: 'var(--text-link)' }}>
            {t('landing.hero.eyebrow')}
          </motion.p>
          <motion.h1
            {...beat(1)}
            className="font-display"
            style={{
              fontSize: 'clamp(2.5rem, 1.6rem + 3.6vw, 4.5rem)',
              lineHeight: 1.02,
              letterSpacing: '-0.035em',
              fontWeight: 650,
              color: 'var(--text-primary)',
              textWrap: 'balance',
            }}
          >
            {t('landing.hero.titleLead')}{' '}
            <span style={{ color: 'var(--text-link)' }}>{t('landing.hero.titleAccent')}</span>
          </motion.h1>
          <motion.p
            {...beat(2)}
            className="mt-6 max-w-[580px] text-[17px] sm:text-[18px] leading-[1.6]"
            style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
          >
            {t('landing.hero.subtitle')}
          </motion.p>

          <motion.div {...beat(3)} className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/login?mode=register" className="btn-primary h-12 px-6 text-[15px]">
              {t('marketing.cta.startFree')}
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <Link to="/how-it-works" className="btn-secondary h-12 px-6 text-[15px]">
              {t('marketing.cta.seeHowItWorks')}
            </Link>
          </motion.div>

          <motion.ul {...beat(4)} className="mt-9 flex flex-wrap gap-x-5 gap-y-2.5 max-w-[620px]">
            {trust.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5 type-small whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                <Check className="w-3.5 h-3.5" style={{ color: 'var(--color-brand)' }} aria-hidden />
                {item}
              </li>
            ))}
          </motion.ul>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: ease.out, delay: 0.2 }}
          className="relative lg:pl-4"
        >
          <Suspense fallback={<WorkflowPlaceholder />}>
            <HeroWorkflow />
          </Suspense>
        </motion.div>
      </div>
    </section>
  )
}

/** Legacy vs Nexus — a ruled ledger, not three boxes. */
function VersusLedger() {
  const { t } = useTranslation()
  return (
    <section className="pb-6" aria-labelledby="versus-title">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
        <h2 id="versus-title" className="sr-only">{t('landing.versus.title')}</h2>
        <RevealGroup className="grid md:grid-cols-3 surface-paper !rounded-[20px] overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[color:var(--border-subtle)]">
          {VERSUS.map((id) => (
            <RevealItem
              key={id}
              className="p-6 sm:p-8"
            >
              <div>
                <p className="type-small font-medium" style={{ color: 'var(--text-tertiary)' }}>{t(`landing.versus.${id}.label`)}</p>
                <p className="mt-4 type-figure text-[34px] sm:text-[40px] leading-none" style={{ color: 'var(--text-primary)' }}>
                  {t(`landing.versus.${id}.nexus`)}
                </p>
                <p className="mt-3 type-small" style={{ color: 'var(--text-tertiary)' }}>
                  {t('landing.versus.legacyLabel')}:{' '}
                  <span className="line-through decoration-[1.5px]">{t(`landing.versus.${id}.legacy`)}</span>
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}

export default function Landing() {
  const { t } = useTranslation()
  return (
    <MarketingShell>
      <NexusHero />
      <VersusLedger />
      <FrameworkStrip />
      <FeatureGrid
        variant="bento"
        heading={t('landing.pillars.heading')}
        subheading={t('landing.pillars.subheading')}
        features={buildPillars(t)}
      />
      <Suspense fallback={<div className="min-h-[720px]" style={{ background: 'var(--bg-inverse)' }} aria-hidden />}>
        <ChinaSection />
      </Suspense>
      <FeatureGrid
        variant="ledger"
        heading={t('landing.capabilities.heading')}
        features={buildCapabilities(t)}
        columns={3}
      />
      <PricingTable
        tiers={buildTiers(t)}
        compact
        heading={t('landing.pricing.heading')}
        lead={t('landing.pricing.lead')}
      />
      <FAQ items={FAQ_IDS.map((id) => ({ q: t(`landing.faq.${id}.q`), a: t(`landing.faq.${id}.a`) }))} />
      <CTABand
        heading={t('landing.ctaBand.heading')}
        primary={{ label: t('marketing.cta.startFreeTrial'), to: '/login?mode=register' }}
        secondary={{ label: t('marketing.cta.seeHowItWorks'), to: '/how-it-works' }}
      />
    </MarketingShell>
  )
}
