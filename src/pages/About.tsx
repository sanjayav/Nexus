import { Leaf, Target, Users, Heart } from 'lucide-react'
import MarketingShell from '../components/marketing/MarketingShell'
import CTABand from '../components/marketing/CTABand'
import { FadeIn, Stagger, StaggerItem } from '../components/MotionPrimitives'

/**
 * /about — the Aeiforo (company) story behind Nexus (the platform).
 * One restrained page: mission, values, team placeholders.
 */

const VALUES = [
  {
    icon: Leaf,
    title: 'Sustainability first',
    body: 'We build software for the people doing the hardest work in climate. Our priorities follow theirs.',
  },
  {
    icon: Target,
    title: 'Auditable by default',
    body: 'Every number has a source. Every change has a trail. We never ask you to take our word for it.',
  },
  {
    icon: Users,
    title: 'Open about trade-offs',
    body: 'No oversold features, no marketecture. If it is a roadmap item, we say so.',
  },
  {
    icon: Heart,
    title: 'Calm software',
    body: 'No dark patterns. No surprise upsells. The product gets out of your way so you can do the work.',
  },
]

const TEAM = [
  { name: 'Founder', role: 'CEO', bio: 'Background in sustainability consulting + enterprise software.' },
  { name: 'Co-founder', role: 'CTO', bio: 'Built reporting platforms at two prior fintech companies.' },
  { name: 'Head of ESG', role: 'Product', bio: 'Ten years in CSRD/ISSB implementation across European utilities.' },
  { name: 'Lead Engineer', role: 'Engineering', bio: 'Specialises in linked-data and audit infrastructure.' },
]

export default function About() {
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
              About Aeiforo
            </p>
            <h1
              className="h-display"
              style={{
                fontSize: 'clamp(2rem, 4.5vw, 3rem)',
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}
            >
              Sustainability reporting deserves better software.
            </h1>
            <p
              className="mt-6 text-[17px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Aeiforo is the company. Nexus is the platform. We were started by a small group of
              sustainability practitioners and engineers who got tired of stitching together five
              spreadsheets and four point-tools for every reporting cycle. So we built one
              system that does the whole job — and we keep it honest.
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
                className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-4"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Our mission
              </p>
              <p
                className="text-[22px] sm:text-[26px] leading-snug font-medium tracking-tight"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
              >
                Make every sustainability disclosure as trustworthy and as effortless as a bank statement.
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
              Values
            </p>
            <h2
              className="h-display"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                color: 'var(--text-primary)',
              }}
            >
              How we work.
            </h2>
          </div>
          <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-6" staggerMs={60}>
            {VALUES.map((v) => (
              <StaggerItem key={v.title}>
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
                    {v.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {v.body}
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
              Team
            </p>
            <h2
              className="h-display"
              style={{
                fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                color: 'var(--text-primary)',
              }}
            >
              Small team. Long horizons.
            </h2>
            <p
              className="mt-3 text-[15px] leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Bios are placeholders until the team is ready to be named publicly.
            </p>
          </div>
          <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" staggerMs={50}>
            {TEAM.map((m) => (
              <StaggerItem key={m.role}>
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
                  <p className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                  <p className="text-[12px] mb-3" style={{ color: 'var(--accent-600)' }}>{m.role}</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{m.bio}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <CTABand
        heading="Want to know more about what we're building?"
        primary={{ label: 'Try Nexus free', to: '/login?mode=register' }}
        secondary={{ label: 'Get in touch', to: '/contact' }}
      />
    </MarketingShell>
  )
}
