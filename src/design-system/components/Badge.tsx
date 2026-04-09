type BadgeVariant = 'gray' | 'teal' | 'blue' | 'purple' | 'amber' | 'red' | 'green'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  gray: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  teal: 'bg-[var(--accent-teal-light)] text-[var(--accent-teal)]',
  blue: 'bg-[var(--accent-blue-light)] text-[var(--accent-blue)]',
  purple: 'bg-[var(--accent-purple-light)] text-[var(--accent-purple)]',
  amber: 'bg-[var(--accent-amber-light)] text-[var(--accent-amber)]',
  red: 'bg-[var(--accent-red-light)] text-[var(--accent-red)]',
  green: 'bg-[var(--accent-green-light)] text-[var(--accent-green)]',
}

const dotColors: Record<BadgeVariant, string> = {
  gray: 'bg-[var(--text-tertiary)]',
  teal: 'bg-[var(--accent-teal)]',
  blue: 'bg-[var(--accent-blue)]',
  purple: 'bg-[var(--accent-purple)]',
  amber: 'bg-[var(--accent-amber)]',
  red: 'bg-[var(--accent-red)]',
  green: 'bg-[var(--accent-green)]',
}

export default function Badge({ variant = 'gray', children, className = '', dot = false }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-0.5
        text-[var(--text-xs)] font-medium
        rounded-[var(--radius-full)]
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}
