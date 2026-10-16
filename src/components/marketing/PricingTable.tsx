import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RevealGroup, RevealItem } from './motion'
import { SectionHeading } from './PageHero'

/**
 * NOTE: Pricing numbers are illustrative placeholders for v1 marketing.
 * Update once commercial terms are finalised; see /pricing copy + sales.
 */

export interface PricingTier {
  name: string
  price: string
  /** Sub-label under price, e.g. "per workspace" */
  cadence?: string
  description: string
  features: string[]
  cta: { label: string; to: string }
  /** Highlight this plan as the recommended option. */
  featured?: boolean
}

interface PricingTableProps {
  tiers: PricingTier[]
  /** If true, hides the "(illustrative)" disclaimer (e.g. on the teaser). */
  compact?: boolean
  heading?: string
  lead?: string
}

export default function PricingTable({ tiers, compact = false, heading, lead }: PricingTableProps) {
  const { t } = useTranslation()
  return (
    <section className="py-16 sm:py-24">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-8">
        {heading && <SectionHeading title={heading} lead={lead} className="mb-12" />}
        <RevealGroup className={`grid gap-4 ${tiers.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} items-stretch`}>
          {tiers.map((tier) => {
            const featured = tier.featured
            return (
              <RevealItem
                key={tier.name}
                className={`relative rounded-[20px] p-7 sm:p-8 flex flex-col transition-shadow duration-200 ${featured ? 'surface-hero' : 'surface-paper hover:shadow-[var(--shadow-raised)]'}`}
              >
                {featured && (
                  <span
                    className="absolute top-5 right-5 px-2.5 h-6 inline-flex items-center rounded-full type-caption font-semibold whitespace-nowrap"
                    style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-fg)' }}
                  >
                    {t('marketing.pricingTable.mostPopular')}
                  </span>
                )}

                <h3 className="type-h2 pr-24" style={{ color: 'var(--text-primary)' }}>{tier.name}</h3>
                <p className="mt-1.5 type-small min-h-[40px]" style={{ color: 'var(--text-tertiary)' }}>{tier.description}</p>

                <div className="mt-6 flex items-baseline gap-1.5 flex-wrap">
                  <span className="type-figure text-[44px] leading-none" style={{ color: 'var(--text-primary)' }}>
                    {tier.price}
                  </span>
                  {tier.cadence && (
                    <span className="type-small" style={{ color: 'var(--text-tertiary)' }}>{tier.cadence}</span>
                  )}
                </div>

                <ul className="mt-7 pt-6 space-y-3 flex-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  {tier.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 type-small" style={{ color: 'var(--text-secondary)' }}>
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-brand)' }} aria-hidden />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={tier.cta.to}
                  className={`${featured ? 'btn-primary' : 'btn-secondary'} mt-8 w-full h-11 text-[14px]`}
                >
                  {tier.cta.label}
                </Link>
              </RevealItem>
            )
          })}
        </RevealGroup>

        {!compact && (
          <p className="text-center type-caption mt-10" style={{ color: 'var(--text-tertiary)' }}>
            {t('marketing.pricingTable.disclaimer')}
          </p>
        )}
      </div>
    </section>
  )
}
