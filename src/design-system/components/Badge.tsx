type BadgeVariant = 'gray' | 'teal' | 'blue' | 'purple' | 'amber' | 'red' | 'green'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  gray:   'bg-[var(--bg-secondary)]        text-[var(--text-secondary)] ring-1 ring-inset ring-[var(--border-default)]',
  teal:   'bg-[var(--accent-teal-subtle)]  text-[var(--color-brand-strong)]',
  blue:   'bg-[var(--accent-blue-light)]   text-[var(--accent-blue)]',
  purple: 'bg-[var(--accent-purple-light)] text-[var(--accent-purple)]',
  amber:  'bg-[var(--accent-amber-light)]  text-[var(--accent-amber)]',
  red:    'bg-[var(--accent-red-light)]    text-[var(--accent-red)]',
  green:  'bg-[var(--accent-green-light)]  text-[var(--accent-green)]',
}

const dotColors: Record<BadgeVariant, string> = {
  gray:   'bg-[var(--text-tertiary)]',
  teal:   'bg-[var(--accent-teal)]',
  blue:   'bg-[var(--accent-blue)]',
  purple: 'bg-[var(--accent-purple)]',
  amber:  'bg-[var(--accent-amber)]',
  red:    'bg-[var(--accent-red)]',
  green:  'bg-[var(--accent-green)]',
}

/**
 * Badge — restrained pill. 20px height, 11px medium text, 1.5px dot.
 * No tracking, no uppercase, no border — just a tinted ring for the gray.
 */
export default function Badge({ variant = 'gray', children, className = '', dot = false }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2 h-5',
        'text-[11px] font-medium leading-none',
        'rounded-full whitespace-nowrap',
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}
