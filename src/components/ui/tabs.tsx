import { ReactNode, useId } from 'react'
import clsx from 'clsx'
import { motion } from 'motion/react'
import { spring } from './motion'

/** Segmented tabs; the selected pill slides between items. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: { value: T; label: ReactNode; count?: number }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  const id = useId()
  return (
    <div
      role="tablist"
      className={clsx(
        'inline-flex items-center gap-0.5 p-1 rounded-[11px] bg-zinc-900/[0.05] max-w-full overflow-x-auto scrollbar-none',
        className,
      )}
    >
      {items.map(it => {
        const active = value === it.value
        return (
          <button
            key={it.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={clsx(
              'relative h-8 px-3 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors duration-150 inline-flex items-center gap-1.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
              active ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-900',
            )}
          >
            {active && (
              <motion.span
                layoutId={`tab-${id}`}
                transition={spring}
                className="absolute inset-0 rounded-lg bg-white shadow-card ring-1 ring-zinc-900/[0.06]"
              />
            )}
            <span className="relative">{it.label}</span>
            {it.count !== undefined && (
              <span className={clsx('relative text-[11px] tabular', active ? 'text-zinc-500' : 'text-zinc-400')}>{it.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
