import { motion, useReducedMotion } from 'framer-motion'
import { useMemo } from 'react'
import { contourHill } from './contour'
import { ease } from '../../motion/tokens'

/**
 * ContourField — the topographic background motif as inline SVG.
 *
 * Use behind hero surfaces, the publish sheet, onboarding and login when the
 * lines should draw in or respond to theme tokens. For a static wash, prefer
 * the `.surface-hero` class (CSS mask over `/illustrations/contour.svg`).
 *
 *   <div className="relative overflow-hidden">
 *     <ContourField className="absolute inset-0" />
 *     …content
 *   </div>
 */
export interface ContourFieldProps {
  className?: string
  /** Where the summit sits. Default 'top-right'. */
  anchor?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'
  /** Ring count. Default 18. */
  rings?: number
  /** Draw in on mount. Default false (static). */
  animate?: boolean
  seed?: number
}

const ANCHORS: Record<NonNullable<ContourFieldProps['anchor']>, [number, number]> = {
  'top-right': [900, -40],
  'top-left': [60, -40],
  'bottom-right': [900, 520],
  'bottom-left': [60, 520],
  center: [480, 240],
}

export function ContourField({ className = '', anchor = 'top-right', rings = 18, animate = false, seed = 42 }: ContourFieldProps) {
  const reduce = useReducedMotion()
  const paths = useMemo(() => {
    const [cx, cy] = ANCHORS[anchor]
    return contourHill({ cx, cy, r0: 56, step: 36, count: rings, squash: 0.62, wobble: 0.14, seed, points: 56, drift: [-3, 2] })
  }, [anchor, rings, seed])
  const play = animate && !reduce

  return (
    <svg
      viewBox="0 0 960 480"
      preserveAspectRatio="xMidYMid slice"
      className={`nx-contour-field pointer-events-none ${className}`}
      fill="none"
      aria-hidden
    >
      {paths.map((d, i) =>
        play ? (
          <motion.path
            key={i}
            d={d}
            stroke="currentColor"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ pathLength: { duration: 1.2, ease: ease.out, delay: i * 0.04 }, opacity: { duration: 0.2, delay: i * 0.04 } }}
          />
        ) : (
          <path key={i} d={d} stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ),
      )}
    </svg>
  )
}

export default ContourField
