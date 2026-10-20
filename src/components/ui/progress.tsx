import clsx from 'clsx'
import { motion } from 'motion/react'
import { ease } from './motion'
import type { Tone } from './badge'

const bar: Record<Tone, string> = {
  neutral: 'bg-zinc-900',
  brand: 'bg-zinc-900',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
}

export function Progress({ value, tone = 'neutral', className }: { value: number; tone?: Tone; className?: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={clsx('h-1.5 w-full rounded-full bg-zinc-900/[0.06] overflow-hidden', className)}
    >
      <motion.div
        className={clsx('h-full rounded-full origin-left', bar[tone])}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: pct / 100 }}
        transition={{ duration: 0.7, ease: ease.out }}
      />
    </div>
  )
}
