import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ContourField } from '../ui'
import { dur, ease } from '../../motion/tokens'

/**
 * PageHero — the opening block of every marketing sub-page. One named kicker,
 * a display title, an intro and optional actions, over the product's contour
 * motif drawing in. Words arrive in three beats (kicker, title, body).
 */
interface PageHeroProps {
  kicker?: string
  title: ReactNode
  intro?: ReactNode
  actions?: ReactNode
  align?: 'center' | 'left'
  children?: ReactNode
}

export default function PageHero({ kicker, title, intro, actions, align = 'center', children }: PageHeroProps) {
  const reduce = useReducedMotion()
  const beat = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
          animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
          transition: { duration: dur.slow + 0.2, ease: ease.out, delay: 0.06 * i },
        }
  const centered = align === 'center'

  return (
    <section className="relative overflow-hidden isolate -mt-16 pt-16">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(70% 60% at 50% 0%, color-mix(in srgb, var(--accent-500) 10%, transparent), transparent 70%)' }}
      />
      <ContourField className="absolute inset-0 w-full h-full -z-10 [mask-image:linear-gradient(to_bottom,black_40%,transparent)]" anchor={centered ? 'center' : 'top-right'} rings={16} animate seed={11} />
      <div className={`max-w-[1040px] mx-auto px-4 sm:px-8 pt-14 pb-14 sm:pt-24 sm:pb-20 ${centered ? 'text-center' : ''}`}>
        {kicker && (
          <motion.p {...beat(0)} className="text-[14px] font-medium mb-4" style={{ color: 'var(--text-link)' }}>
            {kicker}
          </motion.p>
        )}
        <motion.h1
          {...beat(1)}
          className={`type-display-xl ${centered ? 'mx-auto' : ''} max-w-[880px]`}
          style={{ color: 'var(--text-primary)', textWrap: 'balance' }}
        >
          {title}
        </motion.h1>
        {intro && (
          <motion.p
            {...beat(2)}
            className={`mt-6 text-[17px] leading-[1.65] max-w-[640px] ${centered ? 'mx-auto' : ''}`}
            style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
          >
            {intro}
          </motion.p>
        )}
        {actions && (
          <motion.div {...beat(3)} className={`mt-9 flex flex-wrap items-center gap-3 ${centered ? 'justify-center' : ''}`}>
            {actions}
          </motion.div>
        )}
        {children}
      </div>
    </section>
  )
}

/** Section heading used below the hero: title + optional lead, no eyebrow. */
export function SectionHeading({ title, lead, align = 'left', className = '' }: { title: ReactNode; lead?: ReactNode; align?: 'left' | 'center'; className?: string }) {
  return (
    <div className={`max-w-[720px] ${align === 'center' ? 'mx-auto text-center' : ''} ${className}`}>
      <h2 className="type-display" style={{ color: 'var(--text-primary)', textWrap: 'balance' }}>{title}</h2>
      {lead && (
        <p className="mt-4 text-[16px] leading-[1.65]" style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}>{lead}</p>
      )}
    </div>
  )
}
