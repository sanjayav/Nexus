import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ContourField } from '../ui'
import { Reveal } from './motion'

interface CTABandProps {
  heading: string
  primary: { label: string; to: string }
  secondary?: { label: string; to: string }
}

/**
 * Closing call to action: an ink panel with the contour motif drawing in when
 * it scrolls into view. Mint primary (dark ink text, ≈10:1) and a quiet
 * outline secondary — both legible on ink in light and dark themes.
 */
export default function CTABand({ heading, primary, secondary }: CTABandProps) {
  return (
    <section className="px-4 sm:px-8 pb-20 sm:pb-28">
      <Reveal
        className="relative isolate overflow-hidden max-w-[1280px] mx-auto rounded-[24px]"
      >
        <div
          className="absolute inset-0 -z-20"
          style={{ background: 'radial-gradient(90% 120% at 100% 100%, rgba(16,185,129,0.22), transparent 60%), var(--bg-inverse)' }}
          aria-hidden
        />
        <ContourField className="absolute inset-0 w-full h-full -z-10 !text-[color:var(--accent-400)] !opacity-30" anchor="bottom-right" rings={18} animate seed={3} />
        <div className="px-6 sm:px-14 py-14 sm:py-20 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
          <h2 className="type-display max-w-[680px]" style={{ color: 'var(--sidebar-fg)', textWrap: 'balance' }}>
            {heading}
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={primary.to}
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-[10px] font-semibold text-[15px] transition-[background-color,transform] duration-150 hover:-translate-y-px"
              style={{ background: 'var(--sidebar-accent)', color: 'var(--bg-inverse)' }}
            >
              {primary.label}
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            {secondary && (
              <Link
                to={secondary.to}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-[10px] font-semibold text-[15px] transition-colors duration-150 hover:bg-white/[0.06]"
                style={{ color: 'var(--sidebar-fg)', border: '1px solid rgba(255,255,255,0.18)' }}
              >
                {secondary.label}
              </Link>
            )}
          </div>
        </div>
      </Reveal>
    </section>
  )
}
