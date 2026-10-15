import type { Transition } from 'framer-motion'

/**
 * Shared motion language. We use explicit initial/animate props (no parent
 * variants orchestration) because that's robust across framer-motion versions
 * and survives strict-mode re-renders without silently getting stuck.
 */

export const SPRING: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 28,
  mass: 0.9,
}

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const

/**
 * Returns initial/animate/transition props for a rise-in fade.
 * Pass an index to stagger: `riseIn(2)` delays by 2 × 60ms.
 */
export const riseIn = (i = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { ...SPRING, delay: i * 0.06 },
})

/** Pop-in for cards (scale + fade). */
export const popIn = (i = 0) => ({
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { ...SPRING, delay: i * 0.06 },
})

/** Slide-in from the left for feed rows. */
export const slideInLeft = (i = 0) => ({
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  transition: { ...SPRING, delay: i * 0.04 },
})

/** Bar fill — pass pct + optional delay. */
export const barFill = (pct: number, delay = 0) => ({
  initial: { width: '0%' },
  animate: { width: `${pct}%` },
  transition: { duration: 0.9, ease: EASE_OUT_EXPO, delay },
})

/** Standard hover for interactive cards. */
export const liftOnHover = {
  whileHover: { y: -2, transition: { duration: 0.18, ease: EASE_OUT_EXPO } },
  whileTap: { y: 0, scale: 0.985 },
}
