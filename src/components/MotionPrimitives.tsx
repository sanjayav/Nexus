import { motion, useReducedMotion, type MotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import { transitions } from '../lib/motion'

/**
 * Premium motion primitives — shared, restrained, reduced-motion aware.
 *
 * <FadeIn>           — single element fade + 8px rise
 * <Stagger>          — orchestrates children, 40ms apart
 * <StaggerItem>      — the children rendered inside <Stagger>
 *
 * All three short-circuit to their static children when the user has
 * `prefers-reduced-motion: reduce`, so accessibility is preserved.
 */

type FadeInProps = { children: ReactNode; delay?: number } & Omit<MotionProps, 'children'>

export function FadeIn({ children, delay = 0, ...rest }: FadeInProps) {
  const reduce = useReducedMotion()
  if (reduce) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...transitions.fade, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export function Stagger({
  children,
  staggerMs = 40,
  className,
}: {
  children: ReactNode
  /** Per-child stagger delay in milliseconds (default 40). */
  staggerMs?: number
  className?: string
}) {
  const reduce = useReducedMotion()
  if (reduce) return <>{children}</>
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
        hidden:  { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}
