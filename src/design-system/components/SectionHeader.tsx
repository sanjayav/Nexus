import { ReactNode } from 'react'

interface SectionHeaderProps {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  kicker?: string
  className?: string
}

/**
 * SectionHeader — consistent header for a section within a page.
 * Use this between groups of cards to set visual rhythm.
 */
export default function SectionHeader({ title, subtitle, actions, kicker, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-end justify-between gap-4 mb-4 ${className}`}>
      <div className="min-w-0">
        {kicker && <span className="kicker mb-1.5">{kicker}</span>}
        <h2 className="font-display text-[20px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[13.5px] text-[var(--text-tertiary)] mt-1 leading-snug">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}
