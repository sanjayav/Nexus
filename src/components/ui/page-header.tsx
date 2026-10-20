import { ReactNode } from 'react'
import clsx from 'clsx'
import { FadeIn } from './motion'

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx('text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500', className)}>{children}</span>
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
}) {
  return (
    <FadeIn className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-7">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2">
            <Eyebrow>{eyebrow}</Eyebrow>
          </div>
        )}
        <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.025em] text-zinc-900 leading-[1.15]">{title}</h1>
        {description && <p className="mt-2 text-sm text-zinc-500 max-w-[62ch] leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </FadeIn>
  )
}
