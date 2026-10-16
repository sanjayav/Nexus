import { motion, useReducedMotion } from 'framer-motion'
import { useId } from 'react'
import { circlePath, contourHill } from './contour'
import { ease } from '../../motion/tokens'

/**
 * Nexus spot illustrations — two-tone contour-line drawings (120 × 96).
 *
 * Colour comes entirely from CSS custom properties set on `.nx-illustration`
 * (see index.css), so light/dark work without props:
 *   currentColor   → line colour      (--ill-stroke: emerald 600 / 300)
 *   --ill-fill     → shape fill       (emerald 50 / 8 % emerald)
 *   --ill-ink      → the single accent (ink in light, near-white in dark)
 *
 * On mount the contours and outlines draw in (pathLength 0 → 1, 0.8 s,
 * 60 ms stagger). Reduced-motion users get the finished drawing.
 */

export type IllustrationName =
  | 'inbox'
  | 'cleared'
  | 'noData'
  | 'filtered'
  | 'error'
  | 'offline'
  | 'setup'
  | 'published'
  | 'upload'
  | 'connect'
  | 'materiality'
  | 'target'

type Kind = 'contour' | 'shape' | 'line' | 'accent' | 'dot' | 'ink'

interface Part {
  d: string
  kind: Kind
  dash?: string
}

const C = (d: string): Part => ({ d, kind: 'contour' })
const S = (d: string): Part => ({ d, kind: 'shape' })
const L = (d: string, dash?: string): Part => ({ d, kind: 'line', dash })
const A = (d: string, dash?: string): Part => ({ d, kind: 'accent', dash })
const D = (cx: number, cy: number, r: number): Part => ({ d: circlePath(cx, cy, r), kind: 'dot' })
const I = (cx: number, cy: number, r: number): Part => ({ d: circlePath(cx, cy, r), kind: 'ink' })

const hill = (cx: number, cy: number, r0: number, step: number, count: number, seed: number, squash = 0.72) =>
  contourHill({ cx, cy, r0, step, count, seed, squash, wobble: 0.12 }).map(C)

const ART: Record<IllustrationName, Part[]> = {
  inbox: [
    ...hill(60, 74, 34, 9, 3, 11, 0.5),
    S('M30 52L38 32H82L90 52V68Q90 74 84 74H36Q30 74 30 68Z'),
    L('M30 52H47Q50 52 51 55Q53 61 60 61Q67 61 69 55Q70 52 73 52H90'),
    A('M60 10V25'),
    A('M54.5 20L60 25.5L65.5 20'),
    D(92, 20, 1.6),
  ],
  cleared: [
    ...hill(60, 46, 26, 8, 3, 3, 0.82),
    S(circlePath(60, 46, 17)),
    A('M51.5 46.5L57.5 52.5L69 40.5'),
    D(94, 18, 1.6),
    D(26, 74, 1.3),
  ],
  noData: [
    ...hill(100, 18, 10, 9, 4, 5),
    L('M24 74H96'),
    L('M24 74V20'),
    S('M34 74V58H44V74Z'),
    S('M52 74V50H62V74Z'),
    S('M70 74V62H80V74Z'),
    A('M28 38H90', '3 4'),
  ],
  filtered: [
    ...hill(24, 84, 14, 9, 4, 9),
    S('M30 22H82L63 45V63L51 69V45Z'),
    L('M38 30H74'),
    A(circlePath(84, 62, 9)),
    A('M90.6 68.6L97 75'),
    A('M80 62H88'),
  ],
  error: [
    L('M12 40C28 30 42 33 51 40'),
    L('M69 45C79 52 93 50 108 40'),
    L('M14 58C30 48 44 51 53 57'),
    L('M67 62C80 70 94 66 106 58'),
    L('M18 76C34 68 46 70 55 74'),
    L('M65 78C78 84 92 82 102 76'),
    S(circlePath(60, 17, 7)),
    A('M60 13.5V18'),
    { d: circlePath(60, 21, 0.9), kind: 'ink' },
    A('M60 28L55 41L63 49L57 63L62 72'),
  ],
  offline: [
    ...hill(60, 92, 20, 9, 3, 13, 0.55),
    S('M38 66Q26 66 26 55Q26 45 37 44Q40 30 56 30Q69 30 73 41Q76 39 80 39Q92 39 93 51Q101 53 100 60Q99 66 91 66Z'),
    A('M32 22L90 80'),
  ],
  setup: [
    ...hill(14, 88, 14, 9, 4, 17),
    S('M50 14H70Q72 14 72 16V27Q72 29 70 29H50Q48 29 48 27V16Q48 14 50 14Z'),
    L('M60 29V39M34 39H86M34 39V49M60 39V49M86 39V49'),
    S('M26 49H42Q44 49 44 51V62Q44 64 42 64H26Q24 64 24 62V51Q24 49 26 49Z'),
    S('M52 49H68Q70 49 70 51V62Q70 64 68 64H52Q50 64 50 62V51Q50 49 52 49Z'),
    A('M78 49H94Q96 49 96 51V62Q96 64 94 64H78Q76 64 76 62V51Q76 49 78 49Z', '3 3'),
    A('M86 53V60M82.5 56.5H89.5'),
  ],
  published: [
    ...hill(104, 88, 12, 9, 4, 21),
    S('M36 12H68L82 26V80Q82 82 80 82H38Q36 82 36 80V14Q36 12 38 12Z'),
    L('M68 12V26H82'),
    L('M44 36H72M44 44H74M44 52H62'),
    S(circlePath(80, 70, 11)),
    A(circlePath(80, 70, 11)),
    A('M75 70.5L78.5 74L85.5 67'),
  ],
  upload: [
    ...hill(102, 14, 10, 9, 4, 25),
    L('M44 48V20H68L76 28V48'),
    L('M68 20V28H76'),
    S('M28 54H44L48 62H72L76 54H92V74Q92 78 88 78H32Q28 78 28 74Z'),
    A('M60 52V30'),
    A('M53 37L60 30L67 37'),
  ],
  connect: [
    ...hill(60, 94, 22, 9, 3, 29, 0.5),
    S('M20 36H44Q48 36 48 40V58Q48 62 44 62H20Q16 62 16 58V40Q16 36 20 36Z'),
    S('M76 36H100Q104 36 104 40V58Q104 62 100 62H76Q72 62 72 58V40Q72 36 76 36Z'),
    L('M24 44H40M24 49H40M24 54H33'),
    L('M79 55L85 48L90 52L97 44'),
    L('M48 49H54M66 49H72'),
    A('M54 41V57M66 41V57'),
    A('M54 45H58M54 53H58'),
    D(60, 49, 1.2),
  ],
  materiality: [
    ...hill(80, 30, 11, 7, 3, 33, 0.8),
    L('M24 76H96M24 76V18'),
    C('M60 18V76M24 47H96'),
    S(circlePath(38, 64, 4)),
    S(circlePath(50, 56, 3)),
    S(circlePath(70, 61, 3.5)),
    S(circlePath(44, 34, 3)),
    A(circlePath(80, 30, 6)),
    I(80, 30, 2.2),
  ],
  target: [
    ...hill(86, 30, 8, 6.5, 3, 37, 0.9),
    L('M16 74L30 70L42 72L54 62'),
    A('M54 62C64 54 72 44 82.5 32.5', '3 4'),
    D(30, 70, 1.8),
    D(42, 72, 1.8),
    D(54, 62, 2.2),
    I(86, 30, 2.6),
  ],
}

export const ILLUSTRATION_NAMES = Object.keys(ART) as IllustrationName[]

export interface IllustrationProps {
  name: IllustrationName
  /** Width in px (height follows the 5:4 frame). Default 120. */
  size?: number
  className?: string
  /** Draw in on mount. Default true. */
  animate?: boolean
  /** Accessible label. Omit for decorative use (aria-hidden). */
  title?: string
}

export default function Illustration({ name, size = 120, className = '', animate = true, title }: IllustrationProps) {
  const reduce = useReducedMotion()
  const titleId = useId()
  const fadeId = `ill-${useId().replace(/:/g, '')}`
  const parts = ART[name] ?? ART.noData
  const play = animate && !reduce

  return (
    <svg
      viewBox="0 0 120 96"
      width={size}
      height={(size * 96) / 120}
      className={`nx-illustration ${className}`}
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-labelledby={title ? titleId : undefined}
      data-illustration={name}
    >
      {title && <title id={titleId}>{title}</title>}
      {/* Contours fade out toward the frame edge instead of being cut off. */}
      <defs>
        <radialGradient id={`${fadeId}-g`} cx="50%" cy="50%" r="64%">
          <stop offset="70%" stopColor="#fff" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <mask id={fadeId} maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="96">
          <rect x="0" y="0" width="120" height="96" fill={`url(#${fadeId}-g)`} />
        </mask>
      </defs>
      <g mask={`url(#${fadeId})`}>
        {parts.map((p, i) => (p.kind === 'contour' ? <PartPath key={i} part={p} index={i} play={play} /> : null))}
      </g>
      {parts.map((p, i) => (p.kind !== 'contour' ? <PartPath key={i} part={p} index={i} play={play} /> : null))}
    </svg>
  )
}

function PartPath({ part, index, play }: { part: Part; index: number; play: boolean }) {
  const common = {
    d: part.d,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeDasharray: part.dash,
    vectorEffect: 'non-scaling-stroke' as const,
  }
  const styleFor: Record<Kind, React.SVGProps<SVGPathElement>> = {
    contour: { stroke: 'currentColor', strokeWidth: 1, strokeOpacity: 0.32, fill: 'none' },
    shape: { stroke: 'currentColor', strokeWidth: 1.5, fill: 'var(--ill-fill)' },
    line: { stroke: 'currentColor', strokeWidth: 1.5, strokeOpacity: 0.75, fill: 'none' },
    accent: { stroke: 'var(--ill-ink)', strokeWidth: 1.75, fill: 'none' },
    dot: { fill: 'currentColor', stroke: 'none' },
    ink: { fill: 'var(--ill-ink)', stroke: 'none' },
  }
  const look = styleFor[part.kind]
  const delay = Math.min(index, 10) * 0.06

  if (!play) return <path {...common} {...(look as object)} />

  if (part.kind === 'dot' || part.kind === 'ink') {
    return (
      <motion.path
        {...common}
        {...(look as object)}
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        transition={{ duration: 0.3, ease: ease.out, delay: 0.5 + delay }}
      />
    )
  }

  // Dashed strokes can't use pathLength (it overrides the dash array), so fade them.
  if (part.dash) {
    return (
      <motion.path
        {...common}
        {...(look as object)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: ease.out, delay: 0.3 + delay }}
      />
    )
  }

  const hasFill = part.kind === 'shape'
  return (
    <motion.path
      {...common}
      {...(look as object)}
      initial={{ pathLength: 0, opacity: 0, ...(hasFill ? { fillOpacity: 0 } : {}) }}
      animate={{ pathLength: 1, opacity: 1, ...(hasFill ? { fillOpacity: 1 } : {}) }}
      transition={{
        pathLength: { duration: 0.8, ease: ease.out, delay },
        opacity: { duration: 0.12, delay },
        fillOpacity: { duration: 0.4, ease: ease.out, delay: delay + 0.45 },
      }}
    />
  )
}
