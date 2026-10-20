import { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {Icon && (
        <div className="w-11 h-11 rounded-full bg-zinc-900/[0.04] ring-1 ring-inset ring-zinc-900/[0.06] text-zinc-500 flex items-center justify-center mb-3">
          <Icon className="w-5 h-5" strokeWidth={1.8} />
        </div>
      )}
      <div className="text-sm font-medium text-zinc-900">{title}</div>
      {description && <p className="text-[13px] text-zinc-500 mt-1 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
