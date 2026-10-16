import type { Transition, Variants } from 'framer-motion'

/**
 * Nexus motion tokens — the single source for every framer-motion value.
 *
 * Mirrors the CSS custom properties in `src/index.css` (`--dur-*`, `--ease-*`)
 * so CSS transitions and framer animations share one rhythm.
 *
 *   dur      — seconds. micro for hover/press, fast for small UI, base for
 *              panels and list changes, slow for hero moments, draw for
 *              SVG path drawing.
 *   ease     — `out` (exponential decelerate, the default) and `inOut`
 *              (symmetrical, for things that move and come back).
 *   spring   — `snappy` for indicators (sidebar pill, tabs), `gentle` for
 *              cards and sheets, `ticker` for number rolls.
 *   stagger  — 30 ms between siblings, capped at 8 children so long lists
 *              never feel slow (child 9+ animates with child 8).
 *
 * Reduced motion: the app is wrapped in <MotionConfig reducedMotion="user">
 * (see `src/main.tsx`), which drops transform/layout animation for users who
 * ask for it. Path drawing and number rolls check `useReducedMotion()`
 * themselves and render their final state.
 */

export const dur = {
  micro: 0.12,
  fast: 0.18,
  base: 0.24,
  slow: 0.4,
  draw: 0.6,
} as const

export const ease = {
  out: [0.22, 1, 0.36, 1] as [number, number, number, number],
  inOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
  /** Legacy expo curve (kept so older call-sites read the same). */
  outExpo: [0.16, 1, 0.3, 1] as [number, number, number, number],
} as const

export const spring = {
  snappy: { type: 'spring', stiffness: 520, damping: 40, mass: 1 },
  gentle: { type: 'spring', stiffness: 300, damping: 32, mass: 1 },
  ticker: { type: 'spring', stiffness: 90, damping: 22, mass: 1 },
} as const satisfies Record<string, Transition>

export const STAGGER = 0.03
export const STAGGER_CAP = 8

/** Delay for the i-th child of a staggered group, capped. */
export const staggerDelay = (i: number, step = STAGGER) => Math.min(Math.max(i, 0), STAGGER_CAP) * step

/** Default transition handed to <MotionConfig>. */
export const defaultTransition: Transition = { duration: dur.base, ease: ease.out }

/* ── Transitions ─────────────────────────────────────────────────────── */

export const transition = {
  micro: { duration: dur.micro, ease: ease.out },
  fast: { duration: dur.fast, ease: ease.out },
  base: { duration: dur.base, ease: ease.out },
  slow: { duration: dur.slow, ease: ease.out },
  draw: { duration: dur.draw, ease: ease.out },
} as const satisfies Record<string, Transition>

/* ── Variants ────────────────────────────────────────────────────────── */

/** Page body: 4 px rise + fade in 160 ms. No exit (no dead time between routes). */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 4 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.16, ease: ease.out } },
}

/** Parent that staggers its children (pair with `itemVariants`). */
export const groupVariants = (step = STAGGER, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: step, delayChildren } },
})

/** Child of a staggered group: fade + small rise. */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: transition.base },
}

/** Scale-in for popovers, sheets and seals. */
export const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 6 },
  visible: { opacity: 1, scale: 1, y: 0, transition: spring.gentle },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: transition.fast },
}

/**
 * List-row exit: collapses height and nudges right so the row visibly leaves
 * the queue (approve / pass / dismiss). Use on a `motion.li`/`motion.div`
 * inside <AnimatePresence initial={false}> with `layout` on siblings.
 *
 *   <motion.li layout {...listItemMotion} key={row.id}>…</motion.li>
 */
export const listItemVariants: Variants = {
  initial: { opacity: 0, height: 0 },
  enter: { opacity: 1, height: 'auto', transition: { duration: dur.base, ease: ease.out } },
  exit: {
    opacity: 0,
    height: 0,
    x: 24,
    transition: {
      x: { duration: dur.base, ease: ease.out },
      opacity: { duration: dur.fast, ease: ease.out },
      height: { duration: dur.base, ease: ease.inOut, delay: 0.06 },
    },
  },
}

export const listItemMotion = {
  variants: listItemVariants,
  initial: 'initial',
  animate: 'enter',
  exit: 'exit',
  style: { overflow: 'hidden' as const },
}

/** Cross-fade for swapping the selected item (auto-advance after approve). */
export const crossfadeVariants: Variants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: dur.micro, ease: ease.out } },
  exit: { opacity: 0, transition: { duration: dur.micro, ease: ease.out } },
}

/** Icon swap inside a button (e.g. "Approve" → check). */
export const iconSwapVariants: Variants = {
  initial: { opacity: 0, scale: 0.6, rotate: -20 },
  enter: { opacity: 1, scale: 1, rotate: 0, transition: { duration: dur.fast, ease: ease.out } },
  exit: { opacity: 0, scale: 0.6, transition: { duration: dur.micro, ease: ease.out } },
}

/* ── Prop helpers (explicit initial/animate — robust under StrictMode) ── */

/** Fade + rise. `riseIn(2)` delays by 2 stagger steps. */
export const riseIn = (i = 0) => ({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { ...spring.gentle, delay: staggerDelay(i, 0.04) },
})

/** Scale + fade, for cards. */
export const popIn = (i = 0) => ({
  initial: { opacity: 0, scale: 0.97, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0 },
  transition: { ...spring.gentle, delay: staggerDelay(i, 0.04) },
})

/** Slide in from the left, for feed rows. */
export const slideInLeft = (i = 0) => ({
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  transition: { ...spring.gentle, delay: staggerDelay(i) },
})

/** Width fill for progress bars. */
export const barFill = (pct: number, delay = 0) => ({
  initial: { width: '0%' },
  animate: { width: `${pct}%` },
  transition: { duration: 0.8, ease: ease.out, delay },
})

/** Hover lift for interactive cards (1 px, not a bounce). */
export const liftOnHover = {
  whileHover: { y: -1, transition: { duration: dur.fast, ease: ease.out } },
  whileTap: { y: 0, scale: 0.99 },
}

/** SVG path draw-in (pair with `useReducedMotion` to skip). */
export const drawPath = (i = 0, duration: number = dur.draw + 0.2) => ({
  initial: { pathLength: 0, opacity: 0 },
  animate: { pathLength: 1, opacity: 1 },
  transition: {
    pathLength: { duration, ease: ease.out, delay: staggerDelay(i, 0.06) },
    opacity: { duration: dur.micro, delay: staggerDelay(i, 0.06) },
  },
})
