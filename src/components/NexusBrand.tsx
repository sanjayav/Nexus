import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'

export interface NexusBrandProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  layout?: 'horizontal' | 'stacked'
  animated?: boolean
  showTagline?: boolean
  showAttribution?: boolean
  variant?: 'light' | 'dark'
}

const SIZES = {
  sm: { mark: 20, wordmark: 14, attribution: 8.5, tagline: 9.5, gap: 8 },
  md: { mark: 32, wordmark: 20, attribution: 9.5, tagline: 10.5, gap: 10 },
  lg: { mark: 48, wordmark: 30, attribution: 10.5, tagline: 12, gap: 14 },
  xl: { mark: 80, wordmark: 52, attribution: 12, tagline: 14, gap: 18 },
} as const

// Three nodes forming an "N" shape. Positions in a 24x24 viewBox.
//
//   A (top-left)   ─────   B (top-right)
//                          ╱
//                         ╱   diagonal
//                        ╱
//   D (bottom-left)─────  C (bottom-right)
const NODES = {
  A: { x: 5, y: 5 },
  B: { x: 19, y: 5 },
  C: { x: 19, y: 19 },
  D: { x: 5, y: 19 },
} as const

const LINES = [
  // The N: left vertical (A→D), diagonal (A→C), right vertical inverted (B→C is implicit via right edge),
  // but a cleaner N is: A-D (left stroke), D-B (diagonal up), B-C (right stroke).
  // We use: A→D, then A→C (diagonal across), then B→C — forming an "N" reading like the letter.
  // Actually for a clean N: left vert (A-D), diagonal (D-B), right vert (B-C).
  { from: 'A', to: 'D' },
  { from: 'D', to: 'B' },
  { from: 'B', to: 'C' },
] as const

export default function NexusBrand({
  size = 'md',
  layout = 'horizontal',
  animated = true,
  showTagline = false,
  showAttribution = true,
  variant = 'dark',
}: NexusBrandProps) {
  const prefersReducedMotion = useReducedMotion()
  const shouldAnimate = animated && !prefersReducedMotion
  const dims = SIZES[size]

  const gradientId = useMemo(() => `nexus-grad-${Math.random().toString(36).slice(2, 9)}`, [])
  // Don't seed colour from random — pick stable gradient stops based on variant.
  const stops = variant === 'light'
    ? { start: '#047857', end: '#0369A1' }
    : { start: '#10B981', end: '#0EA5E9' }

  const wordmarkColor = variant === 'light' ? '#0F172A' : '#FFFFFF'
  const attributionColor = variant === 'light' ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.6)'
  const taglineColor = variant === 'light' ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.55)'

  const Mark = (
    <motion.div
      whileHover={shouldAnimate ? { rotate: 10 } : undefined}
      transition={{ duration: 0.3 }}
      style={{
        width: dims.mark,
        height: dims.mark,
        position: 'relative',
        flexShrink: 0,
        filter: variant === 'dark' && shouldAnimate ? `drop-shadow(0 0 6px ${stops.start}66)` : undefined,
      }}
      animate={
        shouldAnimate && variant === 'dark'
          ? { filter: [
              `drop-shadow(0 0 4px ${stops.start}55)`,
              `drop-shadow(0 0 10px ${stops.start}88)`,
              `drop-shadow(0 0 4px ${stops.start}55)`,
            ] }
          : undefined
      }
    >
      <svg viewBox="0 0 24 24" width={dims.mark} height={dims.mark} fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={stops.start} />
            <stop offset="100%" stopColor={stops.end} />
          </linearGradient>
        </defs>

        {/* Lines drawn first so nodes sit on top */}
        {LINES.map((line, i) => {
          const from = NODES[line.from as keyof typeof NODES]
          const to = NODES[line.to as keyof typeof NODES]
          // Lines animate after all nodes are in (nodes done at ~3*80=240ms).
          const delay = shouldAnimate ? 0.24 + i * 0.18 : 0
          return (
            <motion.line
              key={`line-${i}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={`url(#${gradientId})`}
              strokeWidth={2.2}
              strokeLinecap="round"
              initial={shouldAnimate ? { pathLength: 0, opacity: 0 } : false}
              animate={shouldAnimate ? { pathLength: 1, opacity: 1 } : { pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay, ease: 'easeOut' }}
            />
          )
        })}

        {/* Nodes — appear one at a time at the start */}
        {(['A', 'B', 'C', 'D'] as const).map((key, i) => {
          const node = NODES[key]
          return (
            <motion.circle
              key={`node-${key}`}
              cx={node.x}
              cy={node.y}
              r={2.2}
              fill={`url(#${gradientId})`}
              initial={shouldAnimate ? { scale: 0, opacity: 0 } : false}
              animate={shouldAnimate ? { scale: 1, opacity: 1 } : { scale: 1, opacity: 1 }}
              transition={{ duration: 0.25, delay: shouldAnimate ? i * 0.08 : 0, ease: 'backOut' }}
              style={{ transformOrigin: `${node.x}px ${node.y}px` }}
            />
          )
        })}
      </svg>
    </motion.div>
  )

  const wordmarkSize = dims.wordmark
  // After mark assembles (~700ms), reveal wordmark.
  const wordmarkBaseDelay = shouldAnimate ? 0.7 : 0
  const letters = 'Nexus'.split('')

  const Wordmark = (
    <div style={{ lineHeight: 1, display: 'flex', alignItems: 'baseline' }}>
      {letters.map((char, i) => (
        <motion.span
          key={i}
          initial={shouldAnimate ? { opacity: 0, y: 6 } : false}
          animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: wordmarkBaseDelay + i * 0.015, ease: 'easeOut' }}
          style={{
            display: 'inline-block',
            fontFamily: 'var(--font-display, "Inter", system-ui, sans-serif)',
            fontWeight: 800,
            fontSize: wordmarkSize,
            letterSpacing: '-0.02em',
            color: wordmarkColor,
          }}
        >
          {char}
        </motion.span>
      ))}
    </div>
  )

  const taglineDelay = wordmarkBaseDelay + 0.32

  const Attribution = showAttribution ? (
    <motion.span
      initial={shouldAnimate ? { opacity: 0 } : false}
      animate={shouldAnimate ? { opacity: 1 } : { opacity: 1 }}
      transition={{ duration: 0.4, delay: taglineDelay }}
      style={{
        display: 'block',
        fontFamily: 'var(--font-sans, "Inter", system-ui, sans-serif)',
        fontSize: dims.attribution,
        fontWeight: 500,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: attributionColor,
        lineHeight: 1.2,
      }}
    >
      by Aeiforo
    </motion.span>
  ) : null

  const Tagline = showTagline ? (
    <motion.span
      initial={shouldAnimate ? { opacity: 0 } : false}
      animate={shouldAnimate ? { opacity: 1 } : { opacity: 1 }}
      transition={{ duration: 0.4, delay: taglineDelay + 0.1 }}
      style={{
        display: 'block',
        fontFamily: 'var(--font-sans, "Inter", system-ui, sans-serif)',
        fontSize: dims.tagline,
        fontWeight: 400,
        color: taglineColor,
        lineHeight: 1.3,
        marginTop: 2,
      }}
    >
      Sustainability Intelligence Platform
    </motion.span>
  ) : null

  if (layout === 'stacked') {
    return (
      <div
        className="nexus-brand"
        style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: dims.gap, lineHeight: 1 }}
      >
        {Mark}
        <div style={{ textAlign: 'center' }}>
          {Wordmark}
          <div style={{ marginTop: 4 }}>
            {Attribution}
            {Tagline}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="nexus-brand"
      style={{ display: 'inline-flex', alignItems: 'center', gap: dims.gap, lineHeight: 1 }}
    >
      {Mark}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {Wordmark}
        {(showAttribution || showTagline) && (
          <div style={{ marginTop: 4 }}>
            {Attribution}
            {Tagline}
          </div>
        )}
      </div>
    </div>
  )
}
