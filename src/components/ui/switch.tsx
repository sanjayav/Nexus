import clsx from 'clsx'
import { motion } from 'motion/react'
import { spring } from './motion'

/** Binary toggle. The knob moves on a spring; the track answers with colour. */
export function Switch({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
        checked ? 'bg-zinc-900 justify-end' : 'bg-zinc-900/[0.12] justify-start',
      )}
    >
      <motion.span layout transition={spring} className="h-5 w-5 rounded-full bg-white shadow-card" />
    </button>
  )
}
