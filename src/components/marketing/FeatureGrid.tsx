import { LucideIcon, ArrowRight } from 'lucide-react'
import { Stagger, StaggerItem } from '../MotionPrimitives'

/**
 * FeatureGrid — generic n-up feature card grid. Used on landing for the
 * 3 pillars and the 6-capability secondary grid; also reused on Features.
 */

export interface Feature {
  icon: LucideIcon
  title: string
  body: string
  link?: { label: string; href: string }
}

interface FeatureGridProps {
  features: Feature[]
  /** 2 or 3 columns at lg breakpoint. Stack at sm. */
  columns?: 2 | 3
  eyebrow?: string
  heading?: string
  subheading?: string
}

export default function FeatureGrid({
  features,
  columns = 3,
  eyebrow,
  heading,
  subheading,
}: FeatureGridProps) {
  const gridClass = columns === 2
    ? 'grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-7'
    : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-7'

  return (
    <section id="features" className="py-20 sm:py-24">
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8">
        {(eyebrow || heading || subheading) && (
          <div className="max-w-[680px] mb-12">
            {eyebrow && (
              <p
                className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-3"
                style={{ color: 'var(--accent-600)' }}
              >
                {eyebrow}
              </p>
            )}
            {heading && (
              <h2
                className="h-display"
                style={{
                  fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
                  color: 'var(--text-primary)',
                  lineHeight: 1.15,
                }}
              >
                {heading}
              </h2>
            )}
            {subheading && (
              <p
                className="mt-4 text-[16px] leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {subheading}
              </p>
            )}
          </div>
        )}

        <Stagger staggerMs={70} className={gridClass}>
          {features.map((f) => (
            <StaggerItem key={f.title}>
              <article
                className="h-full rounded-[16px] border p-7 transition-all"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-default)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div
                  className="w-11 h-11 rounded-[10px] flex items-center justify-center mb-5"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-500) 12%, transparent)',
                    color: 'var(--accent-600)',
                  }}
                >
                  <f.icon className="w-5 h-5" />
                </div>
                <h3
                  className="h-section mb-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {f.title}
                </h3>
                <p
                  className="text-[14px] leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {f.body}
                </p>
                {f.link && (
                  <a
                    href={f.link.href}
                    className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors"
                    style={{ color: 'var(--accent-600)' }}
                  >
                    {f.link.label}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}
              </article>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
