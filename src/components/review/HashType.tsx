import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { dur, ease } from '../../motion/tokens'

/**
 * A SHA-256 that types itself out — the "anchoring" beat of the publish
 * moment. The first `typed` characters appear one by one (40 ms each), then
 * the remainder fades in. Reduced motion shows the full hash immediately.
 * Screen readers get the full value once.
 */
export default function HashText({
  hash,
  typed = 12,
  speed = 40,
  delay = 0,
  className = '',
  onDone,
}: {
  hash: string
  typed?: number
  speed?: number
  /** ms before typing starts. */
  delay?: number
  className?: string
  onDone?: () => void
}) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? hash.length : 0)

  useEffect(() => {
    if (reduce) {
      setN(hash.length)
      onDone?.()
      return
    }
    setN(0)
    let i = 0
    let timer: number | undefined
    const start = window.setTimeout(function tick() {
      i += 1
      setN(i)
      if (i < Math.min(typed, hash.length)) timer = window.setTimeout(tick, speed)
      else {
        setN(hash.length)
        timer = window.setTimeout(() => onDone?.(), dur.slow * 1000)
      }
    }, delay)
    return () => {
      window.clearTimeout(start)
      if (timer) window.clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, reduce])

  const head = hash.slice(0, Math.min(n, typed))
  const tail = n >= hash.length ? hash.slice(typed) : ''
  return (
    <span className={`font-mono break-all ${className}`} aria-label={hash} role="text">
      <span aria-hidden>{head}</span>
      {n < Math.min(typed, hash.length) && (
        <span aria-hidden className="inline-block w-[0.55em] h-[1.1em] -mb-[0.15em] bg-[var(--color-brand)] opacity-70 animate-pulse" />
      )}
      {tail && (
        <motion.span
          aria-hidden
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: dur.slow, ease: ease.out }}
          className="text-[var(--text-tertiary)]"
        >
          {tail}
        </motion.span>
      )}
    </span>
  )
}
