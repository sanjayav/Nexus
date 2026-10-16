import { motion, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import { dur, ease } from '../../motion/tokens'

/**
 * SealCheck — the approval moment. A circle seal and a check draw in
 * (pathLength over 0.4 s), with an optional soft double ripple for the
 * "queue cleared" beat. Restrained by design: no confetti, no bounce.
 *
 *   {approved && <SealCheck size={20} />}
 *   <SealCheck size={64} ripple tone="brand" onComplete={advance} />
 *
 * Re-mount (change `key`) to replay. Reduced motion renders the finished seal.
 */
export interface SealCheckProps {
  /** Pixel size of the seal. Default 20. */
  size?: number
  /** Ink of the seal. 'brand' (emerald), 'ink' (inherits currentColor). */
  tone?: 'brand' | 'ink'
  /** Two concentric ripples fade outward after the draw. */
  ripple?: boolean
  /** Fill the disc softly behind the check. Default true. */
  filled?: boolean
  /** Delay before drawing (s). */
  delay?: number
  onComplete?: () => void
  className?: string
  /** Accessible label; omit when the surrounding text already says "Approved". */
  label?: string
}

export default function SealCheck({
  size = 20,
  tone = 'brand',
  ripple = false,
  filled = true,
  delay = 0,
  onComplete,
  className = '',
  label,
}: SealCheckProps) {
  const reduce = useReducedMotion()
  // Reduced motion: nothing animates, so report completion straight away.
  useEffect(() => {
    if (reduce) onComplete?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce])
  const color = tone === 'brand' ? 'var(--status-success)' : 'currentColor'
  const draw = (d: number) =>
    reduce
      ? { initial: false as const, animate: { pathLength: 1, opacity: 1 } }
      : {
          initial: { pathLength: 0, opacity: 0 },
          animate: { pathLength: 1, opacity: 1 },
          transition: { pathLength: { duration: dur.slow, ease: ease.out, delay: delay + d }, opacity: { duration: 0.05, delay: delay + d } },
        }

  return (
    <span
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: size, height: size, color }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {ripple && !reduce &&
        [0, 1].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full"
            style={{ border: `1.5px solid ${color}` }}
            initial={{ scale: 0.8, opacity: 0.3 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 0.9, ease: ease.out, delay: delay + 0.35 + i * 0.18 }}
          />
        ))}
      <motion.svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        initial={reduce ? false : { scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: dur.base, ease: ease.out, delay }}
      >
        {filled && (
          <motion.circle
            cx="12" cy="12" r="10.5"
            fill={tone === 'brand' ? 'var(--status-success-soft)' : 'transparent'}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: dur.fast, delay: delay + 0.1 }}
          />
        )}
        <motion.path
          d="M12 1.5a10.5 10.5 0 1 1 0 21a10.5 10.5 0 1 1 0-21"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          {...draw(0)}
        />
        <motion.path
          d="M7.5 12.5l3 3l6-6.5"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          {...draw(0.22)}
          onAnimationComplete={reduce ? undefined : onComplete}
        />
      </motion.svg>
    </span>
  )
}
