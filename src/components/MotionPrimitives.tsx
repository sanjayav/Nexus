import { motion, useReducedMotion, type MotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import { STAGGER, transition } from '../motion/tokens'

/**
 * Motion primitives — built on `src/motion/tokens.ts`.
 *
 * <FadeIn>       single element: fade + 6 px rise
 * <Stagger>      orchestrates children 30 ms apart
 * <StaggerItem>  a child of <Stagger>
 *
 * All three render static children under reduced motion.
 */

type FadeInProps = { children: ReactNode; delay?: number } & Omit<MotionProps, 'children'>

export function FadeIn({ children, delay = 0, ...rest }: FadeInProps) {
  const reduce = useReducedMotion()
  if (reduce) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transition.base, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export function Stagger({
  children,
  staggerMs = STAGGER * 1000,
  className,
}: {
  children: ReactNode
  /** Per-child stagger delay in milliseconds (default 30). */
  staggerMs?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: staggerMs / 1000 } } }}
    >
      {children}
    </motion.div>
  )
}

type StaggerItemProps = { children: ReactNode } & Omit<MotionProps, 'children'>

export function StaggerItem({ children, ...rest }: StaggerItemProps) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 6 },
        visible: { opacity: 1, y: 0, transition: transition.base },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
