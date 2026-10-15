/**
 * Premium motion tokens — restrained easings + durations.
 *
 * Used by the shared Motion primitives in `src/components/Motion.tsx`
 * and by any page that wants framer-motion transitions consistent
 * with the rest of the design system.
 *
 * Note: this lives alongside the older `src/components/motion.ts`
 * helpers (riseIn / popIn / etc.) — both are valid; pick whichever
 * is more ergonomic for the surface you're building. The premium
 * layer prefers `transitions.fade` / `transitions.slideUp`.
 */

export const easings = {
  /** Premium / restrained — gentle deceleration. */
  out:   [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  /** Snappy for inputs / interactive controls. */
  spring: { type: 'spring', stiffness: 300, damping: 30 } as const,
}

export const durations = {
  instant: 0.1,
  fast:    0.18,
  base:    0.25,
  slow:    0.4,
  slower:  0.6,
}

export const transitions = {
  fade:    { duration: durations.base, ease: easings.out },
  slideUp: { duration: durations.base, ease: easings.out, type: 'tween' as const },
  /** Stagger child indexed at `i` — useful for list reveals. */
  stagger: (i: number) => ({ duration: durations.base, ease: easings.out, delay: i * 0.04 }),
} as const
