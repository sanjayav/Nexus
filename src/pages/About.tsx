import { Leaf, Target, Users, Heart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MarketingShell from '../components/marketing/MarketingShell'
import CTABand from '../components/marketing/CTABand'
import { FadeIn, Stagger, StaggerItem } from '../components/MotionPrimitives'

/**
 * /about — the Aeiforo (company) story behind Nexus (the platform).
 * One restrained page: mission, values, team placeholders.
 */

// Copy lives in locales/<lang>/about.json under `about.values.<id>` / `about.team.<id>`.
const VALUES = [
  { id: 'sustainability', icon: Leaf },
  { id: 'auditable', icon: Target },
  { id: 'open', icon: Users },
  { id: 'calm', icon: Heart },
] as const

const TEAM = ['ceo', 'cto', 'esg', 'engineering'] as const

export default function About() {
  const { t } = useTranslation()
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="max-w-[820px] mx-auto px-5 sm:px-8 text-center">
          <FadeIn>
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-4"
              style={{ color: 'var(--accent-600)' }}
            >
              {t('about.eyebrow')}
            </p>
            <h1
              className="h-display"
              style={{
                fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}
            >
              {t('about.title')}
            </h1>
            <p
              className="mt-6 text-[17px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('about.intro')}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Mission card */}
      <section className="pb-16">
        <div className="max-w-[920px] mx-auto px-5 sm:px-8">
          <FadeIn>
            <div
              className="rounded-[20px] border p-10 sm:p-14 text-center"
              style={{
                background:
                  'linear-gradient(160deg, color-mix(in srgb, var(--accent-500) 8%, var(--bg-primary)) 0%, var(--bg-primary) 70%)',
                borderColor: 'var(--border-default)',
              }}
            >
              <p
                className="text-micro font-semibold uppercase tracking-[0.06em] mb-4"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {t('about.mission.eyebrow')}
              </p>
              <p
                className="text-[22px] sm:text-[26px] leading-snug font-medium tracking-tight"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              >
                {t('about.mission.statement')}
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Values */}
      <section className="pb-20 sm:pb-24">
        <div className="max-w-[1180px] mx-auto px-5 sm:px-8">
          <div className="max-w-[680px] mb-12">
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-3"
              style={{ color: 'var(--accent-600)' }}
            >
              {t('about.values.eyebrow')}
            </p>
            <h2
              className="h-display"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                color: 'var(--text-primary)',
              }}
            >
              {t('about.values.heading')}
            </h2>
          </div>
          <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-6" staggerMs={60}>
            {VALUES.map((v) => (
              <StaggerItem key={v.id}>
                <article
                  className="rounded-[16px] border p-7 h-full"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border-default)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-4"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-500) 12%, transparent)',
                      color: 'var(--accent-600)',
                    }}
                  >
                    <v.icon className="w-4.5 h-4.5" />
                  </div>
                  <h3
                    className="h-section mb-2"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {t(`about.values.${v.id}.title`)}
                  </h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {t(`about.values.${v.id}.body`)}
                  </p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* Team — placeholder cards */}
      <section className="pb-20 sm:pb-24">
        <div className="max-w-[1180px] mx-auto px-5 sm:px-8">
          <div className="max-w-[680px] mb-12">
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-3"
              style={{ color: 'var(--accent-600)' }}
            >
              {t('about.team.eyebrow')}
            </p>
            <h2
              className="h-display"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                color: 'var(--text-primary)',
              }}
            >
              {t('about.team.heading')}
            </h2>
            <p
              className="mt-3 text-[15px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('about.team.note')}
            </p>
          </div>
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" staggerMs={50}>
            {TEAM.map((m) => (
              <StaggerItem key={m}>
                <div
                  className="rounded-[14px] border p-6 h-full"
                  style={{
                    background: 'var(--bg-primary)',
                    borderColor: 'var(--border-default)',
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-full mb-4"
                    style={{
                      background:
                        'linear-gradient(135deg, color-mix(in srgb, var(--accent-500) 30%, transparent), color-mix(in srgb, var(--accent-300) 30%, transparent))',
                    }}
                    aria-hidden="true"
                  />
                  <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{t(`about.team.${m}.name`)}</p>
                  <p className="text-[12px] mb-3" style={{ color: 'var(--accent-600)' }}>{t(`about.team.${m}.role`)}</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{t(`about.team.${m}.bio`)}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <CTABand
        heading={t('about.cta.heading')}
        primary={{ label: t('about.cta.primary'), to: '/login?mode=register' }}
        secondary={{ label: t('about.cta.secondary'), to: '/contact' }}
      />
    </MarketingShell>
  )
}
