import { ReactNode } from 'react'
import { motion } from 'motion/react'
import { ease } from './motion'

/** Circular progress; the arc draws in on mount and eases between values. */
export function ProgressRing({
  value,
  size = 120,
  stroke = 9,
  children,
}: {
  value: number
  size?: number
  stroke?: number
  children?: ReactNode
}) {
  const r = 50 - stroke / 2
  const pct = Math.max(0, Math.min(100, value)) / 100
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="#F1F1EE" strokeWidth={stroke} />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#10B981"
          strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: pct }}
          transition={{ duration: 0.9, ease: ease.out }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}
