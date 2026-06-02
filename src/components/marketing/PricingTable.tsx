import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'

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
}

export default function PricingTable({ tiers, compact = false }: PricingTableProps) {
  return (
    <section className="py-20 sm:py-24">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8">
        <div className={`grid gap-6 ${tiers.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
          {tiers.map((tier) => {
            const featured = tier.featured
            return (
              <div
                key={tier.name}
                className="relative rounded-[16px] border p-7 flex flex-col"
                style={{
                  background: featured
                    ? 'linear-gradient(160deg, color-mix(in srgb, var(--accent-500) 10%, var(--bg-primary)) 0%, var(--bg-primary) 60%)'
                    : 'var(--bg-primary)',
                  borderColor: featured ? 'var(--accent-500)' : 'var(--border-default)',
                  boxShadow: featured ? '0 10px 30px -10px color-mix(in srgb, var(--accent-500) 35%, transparent)' : 'var(--shadow-card)',
                }}
              >
                {featured && (
                  <span
                    className="absolute -top-3 left-7 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{
                      background: 'var(--accent-600)',
                      color: '#fff',
                    }}
                  >
                    Most popular
                  </span>
                )}

                <h3
                  className="h-section"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {tier.name}
                </h3>
                <p className="mt-1.5 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                  {tier.description}
                </p>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span
                    className="text-[34px] font-bold tracking-tight"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
                  >
                    {tier.price}
                  </span>
                  {tier.cadence && (
                    <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                      {tier.cadence}
                    </span>
                  )}
                </div>

                <ul className="mt-6 space-y-3 flex-1">
                  {tier.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent-600)' }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={tier.cta.to}
                  className={featured ? 'btn-primary' : 'btn-secondary'}
                  style={{
                    marginTop: 28,
                    width: '100%',
                    justifyContent: 'center',
                    height: 42,
                    fontSize: 14,
                  }}
                >
                  {tier.cta.label}
                </Link>
              </div>
            )
          })}
        </div>

        {!compact && (
          <p
            className="text-center text-[11.5px] mt-10"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Prices shown are illustrative for v1 launch — final pricing confirmed during onboarding.
          </p>
        )}
      </div>
    </section>
  )
}
