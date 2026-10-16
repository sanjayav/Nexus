import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'brand'
type Size = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  loading?: boolean
  fullWidth?: boolean
}

/*
 * Buttons — restrained, Linear/Stripe-flavoured.
 *   · primary — solid brand, for the one primary action on the page
 *   · brand   — alias for primary (kept for backwards-compat)
 *   · secondary — bordered white, for secondary actions
 *   · outline — like secondary, no fill (darker hover)
 *   · ghost   — no border, tonal hover; for tertiary + icon buttons
 *   · danger  — soft red → solid red on hover
 *
 * Transitions are 120ms color/bg, 160ms transform, no bounce.
 */
const variantStyles: Record<Variant, string> = {
  // Per-mode tokens: emerald-700 + white on light, mint + dark ink on dark.
  primary:
    'text-[var(--btn-primary-fg)] bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-bg-hover)] active:translate-y-[0.5px] ' +
    'shadow-[var(--btn-primary-shadow)]',
  brand:
    'text-[var(--btn-primary-fg)] bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-bg-hover)] active:translate-y-[0.5px] ' +
    'shadow-[var(--btn-primary-shadow)]',
  secondary:
    'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-default)] ' +
    'hover:bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] active:translate-y-[0.5px]',
  outline:
    'bg-transparent text-[var(--text-secondary)] border border-[var(--border-default)] ' +
    'hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] active:translate-y-[0.5px]',
  ghost:
    'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] active:translate-y-[0.5px]',
  danger:
    'bg-[var(--status-danger-soft)] text-[var(--status-danger)] hover:bg-[var(--btn-danger-bg)] hover:text-[var(--btn-danger-fg)] active:translate-y-[0.5px]',
}

const sizeStyles: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-caption gap-1 rounded-[var(--radius-sm)]',
  sm: 'h-8 px-3 text-small gap-1.5 rounded-[var(--radius-sm)]',
  md: 'h-9 px-3.5 text-small gap-1.5 rounded-[var(--radius-md)]',
  lg: 'h-10 px-4 text-body gap-2 rounded-[var(--radius-md)]',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      loading = false,
      fullWidth = false,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'relative inline-flex items-center justify-center font-semibold whitespace-nowrap',
          'transition-[background-color,color,border-color,transform] duration-micro ease-out',
          'disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]/40',
          fullWidth ? 'w-full' : '',
          variantStyles[variant],
          sizeStyles[size],
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin flex-shrink-0" style={{ width: '1em', height: '1em' }} />
        ) : (
          icon && iconPosition === 'left' && <span className="flex-shrink-0 inline-flex">{icon}</span>
        )}
        {children}
        {!loading && icon && iconPosition === 'right' && (
          <span className="flex-shrink-0 inline-flex">{icon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
