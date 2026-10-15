import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { popIn } from '../../components/motion'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  actions?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * EmptyState — friendly zero-state messaging with optional CTAs.
 */
export default function EmptyState({
  icon,
  title,
  description,
  actions,
  size = 'md',
  className = '',
}: EmptyStateProps) {
  const pad =
    size === 'sm' ? 'py-8 px-6' : size === 'lg' ? 'py-20 px-8' : 'py-14 px-8'
  const iconSize = size === 'sm' ? 'w-10 h-10' : size === 'lg' ? 'w-16 h-16' : 'w-14 h-14'
  const titleSize = size === 'sm' ? 'text-[15px]' : size === 'lg' ? 'text-[22px]' : 'text-[18px]'
  return (
    <motion.div
      {...popIn(0)}
      className={`surface-outlined ${pad} flex flex-col items-center text-center ${className}`}
    >
      {icon && (
        <div
          className={`${iconSize} rounded-[14px] flex items-center justify-center mb-4 text-[var(--color-brand)]`}
          style={{
            background: 'var(--gradient-brand-soft)',
            boxShadow: 'var(--shadow-glow-teal)',
          }}
        >
          {icon}
        </div>
      )}
      <h3 className={`font-display font-semibold tracking-[-0.02em] text-[var(--text-primary)] ${titleSize}`}>
        {title}
      </h3>
      {description && (
        <p className="text-[13.5px] text-[var(--text-tertiary)] mt-1.5 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {actions && <div className="mt-5 flex items-center gap-2">{actions}</div>}
    </motion.div>
  )
}
