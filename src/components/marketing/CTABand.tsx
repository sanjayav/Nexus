import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

interface CTABandProps {
  heading: string
  primary: { label: string; to: string }
  secondary?: { label: string; to: string }
}

/**
 * Full-width emerald gradient CTA band. Used near the bottom of marketing
 * pages to drive the primary conversion (trial signup) with a soft
 * secondary fallback (talk to sales / contact).
 */
export default function CTABand({ heading, primary, secondary }: CTABandProps) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, var(--accent-700) 0%, var(--accent-500) 60%, var(--accent-400) 100%)',
      }}
    >
      {/* Subtle highlight blob */}
      <div
        aria-hidden
        className="absolute -top-1/2 -right-20 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.18), transparent 60%)',
          filter: 'blur(60px)',
        }}
      />

      <div className="relative max-w-[1280px] mx-auto px-5 sm:px-8 py-16 sm:py-20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <h2
            className="h-display text-white max-w-[640px]"
            style={{
              fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            {heading}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={primary.to}
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[10px] font-semibold text-[14px] transition-all"
              style={{
                background: '#fff',
                color: 'var(--accent-700)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              }}
            >
              {primary.label}
              <ArrowRight className="w-4 h-4" />
            </Link>
            {secondary && (
              <Link
                to={secondary.to}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-[10px] font-semibold text-[14px] transition-all"
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                {secondary.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
