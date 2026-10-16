import { Leaf, Target, Users, Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MarketingShell from '../components/marketing/MarketingShell'
import CTABand from '../components/marketing/CTABand'
import FeatureGrid, { type Feature } from '../components/marketing/FeatureGrid'
import PageHero from '../components/marketing/PageHero'
import { Reveal } from '../components/marketing/motion'
import { ContourField } from '../components/ui'

/**
 * /about — the Aeiforo (company) story behind Nexus (the platform).
 * Hero, the mission as one large statement on the ink surface, values as a
 * ruled ledger. The former "team" cards were placeholder people with
 * invented bios; they are removed until real profiles are ready.
 */

// Copy lives in locales/<lang>/about.json under `about.values.<id>`.
const VALUES = [
  { id: 'sustainability', icon: Leaf },
  { id: 'auditable', icon: Target },
  { id: 'open', icon: Users },
  { id: 'calm', icon: Heart },
] as const

export default function About() {
  const { t } = useTranslation()
  const values: Feature[] = VALUES.map((v) => ({
    icon: v.icon,
    title: t(`about.values.${v.id}.title`),
    body: t(`about.values.${v.id}.body`),
  }))

  return (
    <MarketingShell>
      <PageHero kicker={t('about.eyebrow')} title={t('about.title')} intro={t('about.intro')} />

      {/* Mission — one statement, ink surface */}
      <section className="px-4 sm:px-8">
        <Reveal className="relative isolate overflow-hidden max-w-[1180px] mx-auto rounded-[24px]">
          <div className="absolute inset-0 -z-20" style={{ background: 'var(--bg-inverse)' }} aria-hidden />
          <ContourField className="absolute inset-0 w-full h-full -z-10 !text-[color:var(--accent-400)] !opacity-25" anchor="center" rings={20} animate seed={5} />
          <figure className="px-6 sm:px-16 py-16 sm:py-24 max-w-[960px]">
            <figcaption className="text-[14px] font-medium mb-6" style={{ color: 'var(--sidebar-accent)' }}>
              {t('about.mission.eyebrow')}
            </figcaption>
            <blockquote
              className="font-display"
              style={{
                color: 'var(--sidebar-fg)',
                fontSize: 'clamp(1.75rem, 1.2rem + 2.2vw, 3rem)',
                lineHeight: 1.15,
                letterSpacing: '-0.025em',
                fontWeight: 600,
                textWrap: 'balance',
              }}
            >
              {t('about.mission.statement')}
            </blockquote>
          </figure>
        </Reveal>
      </section>

      <FeatureGrid variant="ledger" heading={t('about.values.heading')} features={values} columns={2} />

      <CTABand
        heading={t('about.cta.heading')}
        primary={{ label: t('about.cta.primary'), to: '/login?mode=register' }}
        secondary={{ label: t('about.cta.secondary'), to: '/contact' }}
      />
    </MarketingShell>
  )
}
