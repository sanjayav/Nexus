type BadgeVariant = 'gray' | 'teal' | 'blue' | 'purple' | 'amber' | 'red' | 'green'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  gray:   'bg-[var(--bg-secondary)]        text-[var(--text-secondary)] ring-1 ring-inset ring-[var(--border-default)]',
  teal:   'bg-[var(--color-brand-soft)]    text-[var(--color-brand-strong)]',
  blue:   'bg-[var(--status-info-soft)]    text-[var(--status-info)]',
  purple: 'bg-[var(--accent-purple-light)] text-[var(--accent-purple)]',
  amber:  'bg-[var(--status-warning-soft)] text-[var(--status-warning)]',
  red:    'bg-[var(--status-danger-soft)]  text-[var(--status-danger)]',
  green:  'bg-[var(--status-success-soft)] text-[var(--status-success)]',
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
 * Badge — restrained pill. 20px height, 12px medium text (CJK floor), 6px dot.
 * Never wraps (nowrap + keep-all) so 进行中 can't break as 进行/中.
 * For workflow statuses prefer `components/ui/StatusPill`.
 */
export default function Badge({ variant = 'gray', children, className = '', dot = false }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2 h-5',
        'text-caption font-medium leading-none',
        'rounded-full whitespace-nowrap [word-break:keep-all]',
        variantStyles[variant],
        className,
      ].join(' ')}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}
