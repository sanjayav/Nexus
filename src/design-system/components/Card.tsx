interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-7',
}

export default function Card({ children, className = '', hover = false, padding = 'md' }: CardProps) {
  return (
    <div
      className={`
        bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-default)]
        transition-all duration-300 ease-[var(--ease-out-expo)]
        ${hover
          ? 'hover:shadow-[var(--shadow-card-hover)] hover:border-[var(--border-strong)] hover:-translate-y-[1px] cursor-pointer'
          : ''
        }
        ${paddingStyles[padding]}
        ${className}
      `}
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      {children}
    </div>
  )
}
