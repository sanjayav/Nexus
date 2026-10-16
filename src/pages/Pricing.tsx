import { Check, Minus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
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

// Copy lives in locales/<lang>/pricing.json (page-specific) and
// locales/<lang>/marketing.json (shared plan names / CTAs). Prices stay literal.
function buildTiers(t: TFunction): PricingTier[] {
  return [
    {
      name: t('marketing.plans.starter'),
      price: '£0',
      cadence: t('marketing.plans.perMonth'),
      description: t('pricing.tiers.starter.description'),
      features: [
        t('pricing.tiers.starter.f1'),
        t('pricing.tiers.starter.f2'),
        t('pricing.tiers.starter.f3'),
        t('pricing.tiers.starter.f4'),
      ],
      cta: { label: t('marketing.cta.startFree'), to: '/login?mode=register' },
    },
    {
      name: t('marketing.plans.team'),
      price: '£500',
      cadence: t('pricing.tiers.team.cadence'),
      description: t('pricing.tiers.team.description'),
      features: [
        t('pricing.tiers.team.f1'),
        t('pricing.tiers.team.f2'),
        t('pricing.tiers.team.f3'),
        t('pricing.tiers.team.f4'),
        t('pricing.tiers.team.f5'),
        t('pricing.tiers.team.f6'),
      ],
      cta: { label: t('marketing.cta.startFreeTrial'), to: '/login?mode=register' },
      featured: true,
    },
    {
      name: t('marketing.plans.enterprise'),
      price: t('marketing.plans.custom'),
      description: t('pricing.tiers.enterprise.description'),
      features: [
        t('pricing.tiers.enterprise.f1'),
        t('pricing.tiers.enterprise.f2'),
        t('pricing.tiers.enterprise.f3'),
        t('pricing.tiers.enterprise.f4'),
        t('pricing.tiers.enterprise.f5'),
      ],
      cta: { label: t('marketing.cta.contactSales'), to: '/contact' },
    },
  ]
}

// Comparison matrix — 20 features × 3 tiers. Use Check / Minus for clarity.
// `id` is the i18n sub-key under `pricing.matrix.rows`; string cell values are
// sub-keys under `pricing.matrix.values`.
type MatrixValue = boolean | 'one' | 'three' | 'unlimited' | 'euOnly' | 'hours24' | 'custom'
const MATRIX: { id: string; starter: MatrixValue; team: MatrixValue; enterprise: MatrixValue }[] = [
  { id: 'workspaces',  starter: 'one',      team: 'unlimited', enterprise: 'unlimited' },
  { id: 'users',       starter: 'three',    team: 'unlimited', enterprise: 'unlimited' },
  { id: 'gri',         starter: true,       team: true,        enterprise: true },
  { id: 'csrd',        starter: false,      team: true,        enterprise: true },
  { id: 'issb',        starter: false,      team: true,        enterprise: true },
  { id: 'tcfd',        starter: false,      team: true,        enterprise: true },
  { id: 'cdp',         starter: false,      team: true,        enterprise: true },
  { id: 'sec',         starter: false,      team: true,        enterprise: true },
  { id: 'ghg',         starter: true,       team: true,        enterprise: true },
  { id: 'scope3',      starter: false,      team: true,        enterprise: true },
  { id: 'evidence',    starter: false,      team: true,        enterprise: true },
  { id: 'workflow',    starter: false,      team: true,        enterprise: true },
  { id: 'blockchain',  starter: false,      team: true,        enterprise: true },
  { id: 'sso',         starter: false,      team: true,        enterprise: true },
  { id: 'api',         starter: false,      team: true,        enterprise: true },
  { id: 'residency',   starter: 'euOnly',   team: true,        enterprise: true },
  { id: 'onPrem',      starter: false,      team: false,       enterprise: true },
  { id: 'dpa',         starter: false,      team: false,       enterprise: true },
  { id: 'csm',         starter: false,      team: false,       enterprise: true },
  { id: 'sla',         starter: false,      team: 'hours24',   enterprise: 'custom' },
]

const FAQ_IDS = ['changePlans', 'nonProfit', 'payment', 'setupFee'] as const

function Cell({ value }: { value: MatrixValue }) {
  const { t } = useTranslation()
  if (value === true) {
    return <Check className="w-4 h-4 mx-auto" style={{ color: 'var(--accent-600)' }} />
  }
  if (value === false) {
    return <Minus className="w-4 h-4 mx-auto" style={{ color: 'var(--text-quaternary)' }} />
  }
  return <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{t(`pricing.matrix.values.${value}`)}</span>
}

export default function Pricing() {
  const { t } = useTranslation()
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
              {t('pricing.header.eyebrow')}
            </p>
            <h1
              className="h-display"
              style={{
                fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}
            >
              {t('pricing.header.title')}
            </h1>
            <p
              className="mt-5 text-[17px] leading-relaxed mx-auto max-w-[680px]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('pricing.header.intro')}
            </p>
          </FadeIn>
        </div>
      </section>

      <PricingTable tiers={buildTiers(t)} />

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
              {t('pricing.why.eyebrow')}
            </p>
            <h2
              className="h-section mb-5"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('pricing.why.heading')}
            </h2>
            <div
              className="space-y-4 text-[15px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              <p>{t('pricing.why.p1')}</p>
              <p>{t('pricing.why.p2')}</p>
              <p>
                <Trans
                  i18nKey="pricing.why.p3"
                  components={{
                    link: <Link to="/compare" className="underline" style={{ color: 'var(--accent-600)' }} />,
                  }}
                />
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
            {t('pricing.matrix.heading')}
          </h2>

          <div
            className="overflow-x-auto rounded-[12px] border"
            style={{ borderColor: 'var(--border-default)', background: 'var(--bg-primary)' }}
          >
            <table className="w-full text-left text-[14px] min-w-[640px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                  <th className="py-4 px-5 font-semibold" style={{ color: 'var(--text-tertiary)' }}>{t('pricing.matrix.feature')}</th>
                  <th className="py-4 px-5 font-semibold text-center" style={{ color: 'var(--text-primary)' }}>{t('marketing.plans.starter')}</th>
                  <th
                    className="py-4 px-5 font-semibold text-center"
                    style={{
                      color: 'var(--accent-600)',
                      background: 'color-mix(in srgb, var(--accent-500) 5%, transparent)',
                    }}
                  >
                    {t('marketing.plans.team')}
                  </th>
                  <th className="py-4 px-5 font-semibold text-center" style={{ color: 'var(--text-primary)' }}>{t('marketing.plans.enterprise')}</th>
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{ borderBottom: i === MATRIX.length - 1 ? 'none' : '1px solid var(--border-subtle)' }}
                  >
                    <td className="py-3 px-5" style={{ color: 'var(--text-primary)' }}>{t(`pricing.matrix.rows.${row.id}`)}</td>
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

      <FAQ
        items={FAQ_IDS.map((id) => ({ q: t(`pricing.faq.${id}.q`), a: t(`pricing.faq.${id}.a`) }))}
        heading={t('pricing.faq.heading')}
      />

      <CTABand
        heading={t('pricing.ctaBand.heading')}
        primary={{ label: t('marketing.cta.startFreeTrial'), to: '/login?mode=register' }}
        secondary={{ label: t('marketing.cta.contactSales'), to: '/contact' }}
      />
    </MarketingShell>
  )
}
