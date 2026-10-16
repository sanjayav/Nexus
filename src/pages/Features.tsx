import {
  Calculator,
  FileSpreadsheet,
  ShieldCheck,
  Building2,
  ClipboardList,
  Sparkles,
  Database,
  Workflow,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MarketingShell from '../components/marketing/MarketingShell'
import FeatureGrid, { type Feature } from '../components/marketing/FeatureGrid'
import CTABand from '../components/marketing/CTABand'
import { FadeIn, Stagger, StaggerItem } from '../components/MotionPrimitives'

/**
 * /features — deeper feature listing organised by job role.
 * Each role gets a 2-column row: text + a visual illustration block.
 */

// Copy lives in locales/<lang>/features.json:
//   features.roles.<id>.{role,blurb}, features.roles.<id>.<bulletId>.{title,body}
//   features.platform.<id>.{title,body}
interface RoleSection {
  id: string
  bullets: { id: string; icon: typeof Calculator }[]
}

const ROLES: RoleSection[] = [
  {
    id: 'carbon',
    bullets: [
      { id: 'calculators', icon: Calculator },
      { id: 'efLibrary', icon: Database },
      { id: 'bulkEntry', icon: FileSpreadsheet },
    ],
  },
  {
    id: 'esg',
    bullets: [
      { id: 'assignments', icon: Workflow },
      { id: 'narrative', icon: Sparkles },
      { id: 'mapping', icon: ClipboardList },
    ],
  },
  {
    id: 'auditors',
    bullets: [
      { id: 'blockchain', icon: ShieldCheck },
      { id: 'custody', icon: ClipboardList },
      { id: 'auditRole', icon: Workflow },
    ],
  },
  {
    id: 'plant',
    bullets: [
      { id: 'tasks', icon: Building2 },
      { id: 'connectors', icon: FileSpreadsheet },
      { id: 'anomaly', icon: Sparkles },
    ],
  },
]

const PLATFORM_FEATURES: { id: string; icon: Feature['icon'] }[] = [
  { id: 'compliance', icon: ShieldCheck },
  { id: 'residency',  icon: Database },
  { id: 'approvals',  icon: Workflow },
  { id: 'aiSafety',   icon: Sparkles },
]

export default function Features() {
  const { t } = useTranslation()
  const platformFeatures: Feature[] = PLATFORM_FEATURES.map((f) => ({
    icon: f.icon,
    title: t(`features.platform.${f.id}.title`),
    body: t(`features.platform.${f.id}.body`),
  }))
  return (
    <MarketingShell>
      {/* Header */}
      <section className="pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="max-w-[920px] mx-auto px-5 sm:px-8 text-center">
          <FadeIn>
            <p
              className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-4"
              style={{ color: 'var(--accent-600)' }}
            >
              {t('features.eyebrow')}
            </p>
            <h1
              className="h-display"
              style={{
                fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}
            >
              {t('features.title')}
            </h1>
            <p
              className="mt-5 text-[17px] leading-relaxed mx-auto max-w-[680px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('features.intro')}
            </p>
          </FadeIn>
        </div>
      </section>

      {/* Role-by-role sections */}
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8 space-y-20 sm:space-y-28">
        {ROLES.map((role, idx) => {
          const roleName = t(`features.roles.${role.id}.role`)
          return (
          <section key={role.id}>
            <div
              className={`grid lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                idx % 2 === 1 ? 'lg:[&>div:first-child]:order-2' : ''
              }`}
            >
              <div>
                <p
                  className="text-micro font-semibold uppercase tracking-[0.06em] mb-3"
                  style={{ color: 'var(--accent-600)' }}
                >
                  {t('features.forRole', { role: roleName })}
                </p>
                <h2
                  className="h-display mb-4"
                  style={{
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    color: 'var(--text-primary)',
                    lineHeight: 1.2,
                  }}
                >
                  {t(`features.roles.${role.id}.blurb`)}
                </h2>
                <Stagger className="mt-6 space-y-5" staggerMs={60}>
                  {role.bullets.map((b) => (
                    <StaggerItem key={b.id}>
                      <div className="flex items-start gap-4">
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center"
                          style={{
                            background: 'color-mix(in srgb, var(--accent-500) 12%, transparent)',
                            color: 'var(--accent-600)',
                          }}
                        >
                          <b.icon className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <h3
                            className="text-[15px] font-semibold tracking-tight mb-1"
                            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                          >
                            {t(`features.roles.${role.id}.${b.id}.title`)}
                          </h3>
                          <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {t(`features.roles.${role.id}.${b.id}.body`)}
                          </p>
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
                </Stagger>
              </div>

              {/* Illustration block */}
              <div
                className="relative rounded-[16px] border overflow-hidden aspect-[4/3] flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(160deg, color-mix(in srgb, var(--accent-500) 10%, var(--bg-primary)) 0%, var(--bg-primary) 70%)',
                  borderColor: 'var(--border-default)',
                }}
              >
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-50"
                  style={{
                    backgroundImage:
                      'linear-gradient(var(--border-subtle) 1px, transparent 1px), ' +
                      'linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                    maskImage: 'radial-gradient(circle at 50% 50%, black 35%, transparent 80%)',
                  }}
                />
                <div
                  className="relative z-10 text-micro font-semibold uppercase tracking-[0.06em]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {t('features.roleView', { role: roleName.toUpperCase() })}
                </div>
              </div>
            </div>
          </section>
          )
        })}
      </div>

      {/* Platform-wide capabilities */}
      <div className="mt-20">
        <FeatureGrid
          eyebrow={t('features.platform.eyebrow')}
          heading={t('features.platform.heading')}
          features={platformFeatures}
          columns={2}
        />
      </div>

      <CTABand
        heading={t('features.cta.heading')}
        primary={{ label: t('features.cta.primary'), to: '/login?mode=register' }}
        secondary={{ label: t('features.cta.secondary'), to: '/contact' }}
      />
    </MarketingShell>
  )
}
