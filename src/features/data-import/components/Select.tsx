import { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { inputClass } from '@/components/ui'

export function Select({
  value,
  onChange,
  label,
  children,
  className,
  id,
}: {
  value: string
  onChange: (v: string) => void
  label?: string
  children: ReactNode
  className?: string
  id?: string
}) {
  return (
    <div className={clsx('relative min-w-0', className)}>
      <select
        id={id}
        aria-label={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={clsx(inputClass, 'appearance-none pr-8 cursor-pointer truncate')}
      >
        {children}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  )
}
