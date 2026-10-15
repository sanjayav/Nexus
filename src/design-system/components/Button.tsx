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
  primary:
    'text-white bg-[var(--color-brand-strong)] hover:bg-[var(--color-brand)] active:translate-y-[0.5px] ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(11,18,32,0.06)]',
  brand:
    'text-white bg-[var(--color-brand-strong)] hover:bg-[var(--color-brand)] active:translate-y-[0.5px] ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(11,18,32,0.06)]',
  secondary:
    'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-default)] ' +
    'hover:bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] active:translate-y-[0.5px]',
  outline:
    'bg-transparent text-[var(--text-secondary)] border border-[var(--border-default)] ' +
    'hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] active:translate-y-[0.5px]',
  ghost:
    'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] active:translate-y-[0.5px]',
  danger:
    'bg-[var(--accent-red-light)] text-[var(--accent-red)] hover:bg-[var(--accent-red)] hover:text-white active:translate-y-[0.5px]',
}

const sizeStyles: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-[12px] gap-1 rounded-[6px]',
  sm: 'h-8 px-3 text-[12.5px] gap-1.5 rounded-[6px]',
  md: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-[8px]',
  lg: 'h-10 px-4 text-[13.5px] gap-2 rounded-[8px]',
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
          'transition-[background-color,color,border-color,transform] duration-[120ms] ease-[var(--ease-out-expo)]',
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
