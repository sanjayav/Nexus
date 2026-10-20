import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand'

const tones: Record<Tone, string> = {
  neutral: 'bg-zinc-900/[0.04] text-zinc-700 ring-zinc-900/[0.08]',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  danger: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  brand: 'bg-zinc-900 text-white ring-zinc-900',
}
export const dotTone: Record<Tone, string> = {
  neutral: 'bg-zinc-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  brand: 'bg-white',
}

export function Badge({
  tone = 'neutral',
  dot,
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone
  dot?: boolean
  icon?: LucideIcon
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-xs font-medium ring-1 ring-inset whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotTone[tone])} />}
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  )
}
