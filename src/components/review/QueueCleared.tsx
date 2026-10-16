import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import Illustration from '../../design-system/illustrations/Illustration'
import ContourField from '../../design-system/illustrations/ContourField'
import SealCheck from '../ui/SealCheck'
import { dur, ease } from '../../motion/tokens'

/**
 * "Queue cleared" — the celebratory end state of a review session.
 * The emerald seal draws in over the contour illustration and two soft
 * ripples fade outward. No confetti; it should feel like a stamp.
 */
export default function QueueCleared({
  title,
  body,
  actions,
  celebrate = true,
}: {
  title: string
  body: ReactNode
  actions?: ReactNode
  /** Seal + ripple (true after the reviewer cleared it this session). */
  celebrate?: boolean
}) {
  const reduce = useReducedMotion()
  return (
    <motion.section
      role="status"
      aria-live="polite"
      initial={reduce ? false : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: dur.base, ease: ease.out }}
      className="surface-paper relative overflow-hidden flex flex-col items-center text-center px-6 py-14 sm:py-20"
    >
      {celebrate ? (
        <div className="relative mb-6 w-[200px] h-[136px] flex items-center justify-center">
          <ContourField anchor="center" rings={9} animate className="absolute inset-0 w-full h-full text-[var(--color-brand)] opacity-30" />
          <span className="relative rounded-full bg-[var(--bg-primary)] p-1.5">
            <SealCheck size={64} ripple delay={0.2} label={title} />
          </span>
        </div>
      ) : (
        <div className="mb-5">
          <Illustration name="inbox" size={136} />
        </div>
      )}
      <h2 className="type-h2 text-[var(--text-primary)] max-w-md text-balance">{title}</h2>
      <p className="type-body text-[var(--text-secondary)] mt-2 max-w-md text-pretty">{body}</p>
      {actions && <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">{actions}</div>}
    </motion.section>
  )
}
