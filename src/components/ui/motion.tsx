import { ReactNode, useEffect, useRef } from 'react'
import { animate, motion, useInView, useMotionValue, useReducedMotion, type HTMLMotionProps, type Variants } from 'motion/react'

/*
 * Motion primitives. One vocabulary for the whole app:
 * - enter: 220ms ease-out, 6px rise (content arriving, never bouncing)
 * - spatial: spring for things that move between positions (tab pills, nav indicator, sheets)
 * - stagger: 40ms between siblings, capped so long lists don't drag
 * Reduced motion is honoured globally via <MotionConfig reducedMotion="user"> in app providers.
 */

export const ease = { out: [0.16, 1, 0.3, 1] as const, inOut: [0.65, 0, 0.35, 1] as const }
export const spring = { type: 'spring', stiffness: 520, damping: 42, mass: 0.9 } as const
export const softSpring = { type: 'spring', stiffness: 260, damping: 30 } as const

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: ease.out } },
}

/** A block that settles in on mount. */
export function FadeIn({
  children,
  delay = 0,
  className,
  ...rest
}: { children: ReactNode; delay?: number; className?: string } & HTMLMotionProps<'div'>) {
  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ delay }} className={className} {...rest}>
      {children}
    </motion.div>
  )
}

/** Parent that staggers its <StaggerItem> children in. */
export function Stagger({
  children,
  className,
  gap = 0.04,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  gap?: number
  as?: 'div' | 'ul' | 'section'
}) {
  const Comp = motion[as]
  return (
    <Comp
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: 0.02 } } }}
    >
      {children}
    </Comp>
  )
}

export function StaggerItem({
  children,
  className,
  as = 'div',
  ...rest
}: { children: ReactNode; className?: string; as?: 'div' | 'li' } & HTMLMotionProps<'div'>) {
  const Comp = motion[as] as typeof motion.div
  return (
    <Comp variants={fadeUp} className={className} {...rest}>
      {children}
    </Comp>
  )
}

/**
 * A figure that counts up to its value the first time it scrolls into view,
 * then tweens between values on change. Formatting stays with the caller so
 * locale rules (万/亿, separators) apply on every frame.
 */
export function AnimatedNumber({
  value,
  format = n => Math.round(n).toLocaleString(),
  className,
}: {
  value: number
  format?: (n: number) => string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduced = useReducedMotion()
  const mv = useMotionValue(0)
  const started = useRef(false)

  useEffect(() => {
    if (!ref.current) return
    const render = (n: number) => {
      if (ref.current) ref.current.textContent = format(n)
    }
    if (reduced) {
      render(value)
      return
    }
    if (!inView) return
    const from = started.current ? mv.get() : 0
    started.current = true
    const controls = animate(from, value, {
      duration: started.current && from !== 0 ? 0.5 : 0.9,
      ease: ease.out,
      onUpdate: v => (mv.set(v), render(v)),
    })
    return () => controls.stop()
  }, [value, inView, reduced, format, mv])

  return (
    <span ref={ref} className={className}>
      {format(reduced ? value : 0)}
    </span>
  )
}
