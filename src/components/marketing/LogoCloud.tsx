/**
 * LogoCloud — a row of grayscale "alpha customer" placeholders.
 * Honest framing: these are example/demo companies until real logos land.
 */

const LOGOS = [
  'Aeiforo Demo Co',
  'Refinery Alpha',
  'Olefins Plant Beta',
  'Polymers Delta',
  'Logistics Epsilon',
  'Bioplastics R&D',
]

export default function LogoCloud() {
  return (
    <section
      className="py-16 border-t border-b"
      style={{
        borderColor: 'var(--border-subtle)',
        background: 'var(--bg-subtle)',
      }}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8">
        <p
          className="text-center text-[12px] font-semibold uppercase tracking-[0.15em] mb-8"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Trusted by sustainability teams at
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {LOGOS.map((name) => (
            <span
              key={name}
              className="text-[15px] font-semibold tracking-tight"
              style={{
                color: 'var(--text-tertiary)',
                opacity: 0.65,
                fontFamily: 'var(--font-display)',
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
