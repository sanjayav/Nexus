/**
 * Legacy premium motion tokens — now an alias of `src/motion/tokens.ts`.
 * Kept so existing imports keep working; new code should import
 * `dur` / `ease` / `spring` / `transition` from `../motion/tokens`.
 */
import { dur, ease, spring, staggerDelay } from '../motion/tokens'

export const easings = {
  out: ease.out,
  inOut: ease.inOut,
  spring: spring.gentle,
}

export const durations = {
  instant: dur.micro,
  fast: dur.fast,
  base: dur.base,
  slow: dur.slow,
  slower: dur.draw,
}

export const transitions = {
  fade: { duration: dur.base, ease: ease.out },
  slideUp: { duration: dur.base, ease: ease.out, type: 'tween' as const },
  /** Stagger child indexed at `i` (30 ms steps, capped at 8). */
  stagger: (i: number) => ({ duration: dur.base, ease: ease.out, delay: staggerDelay(i) }),
} as const
