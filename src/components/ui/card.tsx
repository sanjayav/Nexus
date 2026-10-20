import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

export function Card({
  children,
  className,
  padded = true,
  interactive = false,
  as: Tag = 'div',
  ...rest
}: {
  children: ReactNode
  className?: string
  padded?: boolean
  interactive?: boolean
  as?: 'div' | 'section' | 'article'
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Tag
      className={clsx(
        'bg-surface border border-line rounded-card shadow-card',
        padded && 'p-5 sm:p-6',
        interactive &&
          'cursor-pointer transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-px hover:border-zinc-300 hover:shadow-raised active:translate-y-0 active:shadow-card',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({
  title,
  description,
  action,
  icon: Icon,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: LucideIcon
  className?: string
}) {
  return (
    <div className={clsx('flex items-start justify-between gap-4 mb-5', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-zinc-900/[0.04] ring-1 ring-inset ring-zinc-900/[0.06] text-zinc-600 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" strokeWidth={1.9} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-zinc-900 leading-snug tracking-[-0.01em]">{title}</h3>
          {description && <p className="text-[13px] text-zinc-500 mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
