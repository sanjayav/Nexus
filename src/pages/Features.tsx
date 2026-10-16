import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calculator,
  FileSpreadsheet,
  ShieldCheck,
  Building2,
  ClipboardList,
  Sparkles,
  Database,
  Workflow,
  Languages,
  Landmark,
  Check,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import MarketingShell from '../components/marketing/MarketingShell'
import FeatureGrid, { type Feature } from '../components/marketing/FeatureGrid'
import CTABand from '../components/marketing/CTABand'
import PageHero from '../components/marketing/PageHero'
import { Reveal, RevealGroup, RevealItem } from '../components/marketing/motion'
import { Illustration, type IllustrationName } from '../components/ui'
import { spring } from '../motion/tokens'

/**
 * /features — deeper feature listing organised by job role.
 * A sticky role switcher (sliding indicator) jumps between four role
 * sections; each pairs its three capabilities with a contour illustration
 * and a checklist card that draws in as it scrolls into view.
 */

// Copy lives in locales/<lang>/features.json:
//   features.roles.<id>.{role,blurb}, features.roles.<id>.<bulletId>.{title,body}
//   features.platform.<id>.{title,body}
interface RoleSection {
  id: string
  illustration: IllustrationName
  bullets: { id: string; icon: typeof Calculator }[]
}

const ROLES: RoleSection[] = [
  {
    id: 'carbon',
    illustration: 'target',
    bullets: [
      { id: 'calculators', icon: Calculator },
      { id: 'efLibrary', icon: Database },
      { id: 'bulkEntry', icon: FileSpreadsheet },
    ],
  },
  {
    id: 'esg',
    illustration: 'setup',
    bullets: [
      { id: 'assignments', icon: Workflow },
      { id: 'narrative', icon: Sparkles },
      { id: 'mapping', icon: ClipboardList },
    ],
  },
  {
    id: 'auditors',
    illustration: 'published',
    bullets: [
      { id: 'blockchain', icon: ShieldCheck },
      { id: 'custody', icon: ClipboardList },
      { id: 'auditRole', icon: Workflow },
    ],
  },
  {
    id: 'plant',
    illustration: 'upload',
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
  { id: 'china',      icon: Landmark },
  { id: 'bilingual',  icon: Languages },
]

function RoleVisual({ role }: { role: RoleSection }) {
  const { t } = useTranslation()
  return (
    <div className="surface-hero !rounded-[24px] p-6 sm:p-10 min-h-[340px] flex flex-col justify-between gap-8">
      <Illustration name={role.illustration} size={180} />
      <div className="surface-paper !rounded-[14px] p-4 sm:p-5" aria-hidden>
        <p className="type-caption font-medium" style={{ color: 'var(--text-tertiary)' }}>
          {t(`features.roles.${role.id}.role`)}
        </p>
        <ul className="mt-3 space-y-2.5">
          {role.bullets.map((b, i) => (
            <motion.li
              key={b.id}
              className="flex items-center gap-2.5 type-small"
              style={{ color: 'var(--text-primary)' }}
              initial={{ opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ ...spring.gentle, delay: 0.25 + i * 0.12 }}
            >
              <span className="w-5 h-5 rounded-full inline-flex items-center justify-center flex-shrink-0" style={{ background: 'var(--color-brand)', color: 'var(--btn-primary-fg)' }}>
                <Check className="w-3 h-3" strokeWidth={3} />
              </span>
              {t(`features.roles.${role.id}.${b.id}.title`)}
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function Features() {
  const { t } = useTranslation()
  const [active, setActive] = useState(ROLES[0].id)
  const platformFeatures: Feature[] = PLATFORM_FEATURES.map((f) => ({
    icon: f.icon,
    title: t(`features.platform.${f.id}.title`),
    body: t(`features.platform.${f.id}.body`),
  }))

  return (
    <MarketingShell>
      <PageHero kicker={t('features.eyebrow')} title={t('features.title')} intro={t('features.intro')} />

      {/* Role switcher */}
      <nav
        aria-label={t('features.rolesNav')}
        className="sticky top-16 z-30 py-3"
        style={{ background: 'color-mix(in srgb, var(--bg-app) 86%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-[1180px] mx-auto px-4 sm:px-8 overflow-x-auto [scrollbar-width:none]">
          <ul className="inline-flex gap-1 p-1 rounded-full" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            {ROLES.map((r) => (
              <li key={r.id}>
                <a
                  href={`#role-${r.id}`}
                  onClick={() => setActive(r.id)}
                  aria-current={active === r.id ? 'true' : undefined}
                  className="relative inline-flex items-center h-10 px-4 rounded-full text-[14px] font-medium whitespace-nowrap"
                  style={{ color: active === r.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                >
                  {active === r.id && (
                    <motion.span layoutId="features-role-pill" className="absolute inset-0 rounded-full" style={{ background: 'var(--bg-primary)', boxShadow: 'var(--shadow-card), 0 0 0 1px var(--border-default)' }} transition={spring.snappy} aria-hidden />
                  )}
                  <span className="relative">{t(`features.roles.${r.id}.role`)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Role-by-role sections */}
      <div className="max-w-[1180px] mx-auto px-4 sm:px-8 pt-10 space-y-24 sm:space-y-32">
        {ROLES.map((role, idx) => {
          const roleName = t(`features.roles.${role.id}.role`)
          return (
            <motion.section
              key={role.id}
              id={`role-${role.id}`}
              className="scroll-mt-36"
              onViewportEnter={() => setActive(role.id)}
              viewport={{ amount: 0.5 }}
            >
              <div className={`grid grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-10 lg:gap-16 items-center ${idx % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                <div>
                  <Reveal>
                    <p className="text-[14px] font-medium mb-3" style={{ color: 'var(--text-link)' }}>
                      {t('features.forRole', { role: roleName })}
                    </p>
                    <h2 className="type-display" style={{ color: 'var(--text-primary)', textWrap: 'balance' }}>
                      {t(`features.roles.${role.id}.blurb`)}
                    </h2>
                  </Reveal>
                  <RevealGroup as="ul" className="mt-8 space-y-6">
                    {role.bullets.map((b) => (
                      <RevealItem as="li" key={b.id} className="flex items-start gap-4">
                        <span
                          className="flex-shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center"
                          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand-strong)' }}
                          aria-hidden
                        >
                          <b.icon className="w-[18px] h-[18px]" />
                        </span>
                        <div>
                          <h3 className="type-h3" style={{ color: 'var(--text-primary)' }}>
                            {t(`features.roles.${role.id}.${b.id}.title`)}
                          </h3>
                          <p className="mt-1 type-body" style={{ color: 'var(--text-secondary)' }}>
                            {t(`features.roles.${role.id}.${b.id}.body`)}
                          </p>
                        </div>
                      </RevealItem>
                    ))}
                  </RevealGroup>
                </div>
                <Reveal delay={0.08}>
                  <RoleVisual role={role} />
                </Reveal>
              </div>
            </motion.section>
          )
        })}
      </div>

      {/* Platform-wide capabilities */}
      <div className="mt-12">
        <FeatureGrid
          variant="ledger"
          heading={t('features.platform.heading')}
          features={platformFeatures}
          columns={3}
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
