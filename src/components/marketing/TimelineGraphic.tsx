import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { UserPlus, Building2, ClipboardCheck, FileCheck2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * TimelineGraphic — the "time-to-disclosure" story.
 *
 * Four milestones (Hour 1 / Hour 4 / Day 1 / Day 2) connected by a
 * progress line that animates on scroll-into-view. Horizontal on md+,
 * stacks vertically below.
 *
 * Pure SVG + framer-motion. Respects prefers-reduced-motion.
 */

interface Milestone {
  /** Stable id; also the i18n sub-key under `marketing.timeline.<id>`. */
  id: 'signUp' | 'firstFacility' | 'valuesEntered' | 'draftDisclosure'
  Icon: typeof UserPlus
}

// Copy (when / title / body) lives in locales/<lang>/marketing.json.
const MILESTONES: Milestone[] = [
  { id: 'signUp', Icon: UserPlus },
  { id: 'firstFacility', Icon: Building2 },
  { id: 'valuesEntered', Icon: ClipboardCheck },
  { id: 'draftDisclosure', Icon: FileCheck2 },
]

export default function TimelineGraphic() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const node = ref.current
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true)
            obs.disconnect()
            break
          }
        }
      },
      { threshold: 0.25 }
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [])

  // SVG line animates from 0 → 1 of pathLength
  const lineProgress = reduce || inView ? 1 : 0

  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-[1180px] mx-auto px-5 sm:px-8" ref={ref}>
        {/* Desktop / tablet — horizontal */}
        <div className="hidden md:block relative">
          {/* Connecting line */}
          <svg
            className="absolute left-0 right-0 top-[34px] w-full h-2 pointer-events-none"
            viewBox="0 0 1000 4"
            preserveAspectRatio="none"
            aria-hidden
          >
            <line
              x1="60"
              y1="2"
              x2="940"
              y2="2"
              stroke="var(--border-default)"
              strokeWidth="2"
              strokeDasharray="4 6"
            />
            <motion.line
              x1="60"
              y1="2"
              x2="940"
              y2="2"
              stroke="var(--accent-500)"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: lineProgress }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{ pathLength: lineProgress }}
            />
          </svg>

          <div className="grid grid-cols-4 gap-6 relative">
            {MILESTONES.map((m, i) => (
              <motion.div
                key={m.id}
                className="flex flex-col items-center text-center"
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={inView || reduce ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.18 }}
              >
                <div
                  className="relative z-10 w-[68px] h-[68px] rounded-full flex items-center justify-center"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '2px solid var(--accent-500)',
                    color: 'var(--accent-600)',
                    boxShadow: '0 0 0 4px color-mix(in srgb, var(--accent-500) 12%, transparent)',
                  }}
                >
                  <m.Icon className="w-6 h-6" />
                </div>
                <p
                  className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: 'var(--accent-600)' }}
                >
                  {t(`marketing.timeline.${m.id}.when`)}
                </p>
                <h3
                  className="mt-2 text-[18px] font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t(`marketing.timeline.${m.id}.title`)}
                </h3>
                <p
                  className="mt-2 text-[13px] leading-relaxed max-w-[220px]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t(`marketing.timeline.${m.id}.body`)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Mobile — vertical stack */}
        <div className="md:hidden flex flex-col gap-0 relative">
          {MILESTONES.map((m, i) => (
            <motion.div
              key={m.id}
              className="flex gap-4 relative"
              initial={reduce ? false : { opacity: 0, x: -8 }}
              animate={inView || reduce ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.15 }}
            >
              {/* Vertical line column */}
              <div className="flex flex-col items-center">
                <div
                  className="w-[56px] h-[56px] rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '2px solid var(--accent-500)',
                    color: 'var(--accent-600)',
                    boxShadow: '0 0 0 3px color-mix(in srgb, var(--accent-500) 12%, transparent)',
                  }}
                >
                  <m.Icon className="w-5 h-5" />
                </div>
                {i < MILESTONES.length - 1 && (
                  <div
                    className="flex-1 w-[2px] my-2 min-h-[48px]"
                    style={{
                      background:
                        'linear-gradient(180deg, var(--accent-500), color-mix(in srgb, var(--accent-500) 30%, transparent))',
                    }}
                  />
                )}
              </div>

              <div className="pb-8 pt-1">
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: 'var(--accent-600)' }}
                >
                  {t(`marketing.timeline.${m.id}.when`)}
                </p>
                <h3
                  className="mt-1 text-[17px] font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t(`marketing.timeline.${m.id}.title`)}
                </h3>
                <p
                  className="mt-1.5 text-[13px] leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {t(`marketing.timeline.${m.id}.body`)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <p
          className="mt-12 text-center text-[14px] leading-relaxed mx-auto max-w-[640px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('marketing.timeline.closing')}{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{t('marketing.timeline.closingStrong')}</strong>
        </p>
      </div>
    </section>
  )
}
