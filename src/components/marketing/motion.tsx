import { motion, useReducedMotion, type Variants } from 'framer-motion'
import type { ElementType, ReactNode } from 'react'
import { dur, ease } from '../../motion/tokens'

/**
 * Scroll-linked reveal primitives for the public site (Persuade surfaces).
 *
 * Reduced motion renders plain, static elements. Otherwise the reveal plays
 * once, when the block first crosses 15 % of the viewport.
 * One move: a 20 px rise that sharpens from a 6 px blur, exponential ease-out.
 */

const VIEWPORT = { once: true, amount: 0.15, margin: '0px 0px -8% 0px' } as const

const revealVariants: Variants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
  visible: (delay: number = 0) => ({
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: dur.slow + 0.2, ease: ease.out, delay },
  }),
}

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'li' | 'article' | 'figure'
  id?: string
}

export function Reveal({ children, className, delay = 0, as = 'div', id }: RevealProps) {
  const reduce = useReducedMotion()
  if (reduce) {
    const Tag = as as ElementType
    return <Tag className={className} id={id}>{children}</Tag>
  }
  const M = motion[as]
  return (
    <M
      id={id}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={revealVariants}
      custom={delay}
    >
      {children}
    </M>
  )
}

/** Parent that reveals its <RevealItem> children in sequence (60 ms, capped). */
export function RevealGroup({
  children,
  className,
  step = 0.06,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  step?: number
  as?: 'div' | 'ul' | 'ol' | 'dl'
}) {
  const reduce = useReducedMotion()
  if (reduce) {
    const Tag = as as ElementType
    return <Tag className={className}>{children}</Tag>
  }
  const M = motion[as]
  return (
    <M
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: step } } }}
    >
      {children}
    </M>
  )
}

export function RevealItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'li' | 'article'
}) {
  const reduce = useReducedMotion()
  if (reduce) {
    const Tag = as as ElementType
    return <Tag className={className}>{children}</Tag>
  }
  const M = motion[as]
  return (
    <M className={className} variants={revealVariants}>
      {children}
    </M>
  )
}
