import { Link } from 'react-router-dom'
import { ArrowRight, PlayCircle } from 'lucide-react'
import { FadeIn } from '../MotionPrimitives'
import NexusBrand from '../NexusBrand'

/**
 * Landing hero — eyebrow, h1, sub, dual CTA, and a stylised visual that
 * uses the existing NexusBrand mark over a faint gradient blob. No new
 * heavy deps; respects light/dark themes via design-token CSS vars.
 */
export default function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          'radial-gradient(80% 60% at 20% 0%, color-mix(in srgb, var(--accent-500) 10%, transparent), transparent 70%), ' +
          'radial-gradient(60% 50% at 90% 30%, color-mix(in srgb, var(--accent-300) 8%, transparent), transparent 70%)',
      }}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          {/* Copy column */}
          <FadeIn>
            <div>
              <p
                className="text-[12px] font-semibold uppercase tracking-[0.15em] mb-5"
                style={{ color: 'var(--accent-600)' }}
              >
                Sustainability Intelligence Platform
              </p>
              <h1
                className="h-display"
                style={{
                  fontSize: 'clamp(2.5rem, 5.5vw, 3.75rem)',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.05,
                }}
              >
                Every framework.
                <br />
                <span style={{ color: 'var(--accent-600)' }}>One dataset.</span>
              </h1>
              <p
                className="mt-6 max-w-[560px] text-[17px] leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                Nexus is the reporting platform that turns sustainability data into auditor-ready
                disclosures across CSRD, ISSB, GRI, TCFD, CDP and more.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  to="/login?mode=register"
                  className="btn-primary"
                  style={{ height: 44, paddingInline: 22, fontSize: 14 }}
                >
                  Start free trial
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#features"
                  className="btn-secondary"
                  style={{ height: 44, paddingInline: 20, fontSize: 14 }}
                >
                  <PlayCircle className="w-4 h-4" />
                  Watch demo
                </a>
              </div>

              <p
                className="mt-7 text-[12px]"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Built by ESG experts · SOC 2 (in progress) · GDPR compliant · Self-hosted available
              </p>
            </div>
          </FadeIn>

          {/* Visual column */}
          <FadeIn delay={0.15}>
            <div
              className="relative rounded-[20px] overflow-hidden border aspect-[5/4] flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(160deg, color-mix(in srgb, var(--accent-500) 12%, var(--bg-primary)) 0%, var(--bg-primary) 60%)',
                borderColor: 'var(--border-default)',
                boxShadow: 'var(--shadow-pop)',
              }}
            >
              {/* Faint dashboard mockup grid */}
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.6]"
                style={{
                  backgroundImage:
                    'linear-gradient(var(--border-subtle) 1px, transparent 1px), ' +
                    'linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)',
                  backgroundSize: '40px 40px',
                  maskImage: 'radial-gradient(circle at 50% 50%, black 30%, transparent 75%)',
                }}
              />
              {/* Gradient blob */}
              <div
                aria-hidden
                className="absolute -top-20 -right-20 w-[420px] h-[420px] rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, color-mix(in srgb, var(--accent-500) 30%, transparent), transparent 60%)',
                  filter: 'blur(40px)',
                }}
              />
              <div className="relative z-10 text-center px-6">
                <div className="inline-block">
                  <NexusBrand size="xl" layout="stacked" animated showAttribution showTagline />
                </div>
                <div
                  className="mt-8 grid grid-cols-3 gap-3 text-[11px] font-medium"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {['CSRD', 'ISSB', 'GRI', 'TCFD', 'CDP', 'SEC'].map((f) => (
                    <span
                      key={f}
                      className="px-3 py-1.5 rounded-md border"
                      style={{
                        borderColor: 'var(--border-default)',
                        background: 'var(--bg-primary)',
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}
