import type { Transition } from 'framer-motion'
import { ease, spring } from '../motion/tokens'

/**
 * Legacy motion helpers — now thin re-exports of `src/motion/tokens.ts`.
 * New code should import from `../motion/tokens` directly.
 */

export { riseIn, popIn, slideInLeft, barFill, liftOnHover } from '../motion/tokens'

/** @deprecated use `spring.gentle` from `motion/tokens`. */
export const SPRING: Transition = spring.gentle

/** @deprecated use `ease.outExpo` (or `ease.out`) from `motion/tokens`. */
export const EASE_OUT_EXPO = ease.outExpo
