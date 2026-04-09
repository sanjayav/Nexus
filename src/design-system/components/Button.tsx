import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: React.ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary: 'bg-[var(--bg-inverse)] text-[var(--text-inverse)] hover:bg-[var(--bg-inverse-soft)] active:scale-[0.98]',
  secondary: 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-secondary)]',
  ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]',
  danger: 'bg-[var(--accent-red-light)] text-[var(--accent-red)] hover:bg-[var(--accent-red)] hover:text-white',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-[var(--text-sm)] gap-1.5 rounded-[var(--radius-sm)]',
  md: 'h-9 px-4 text-[var(--text-sm)] gap-2 rounded-[var(--radius-md)]',
  lg: 'h-11 px-5 text-[var(--text-base)] gap-2.5 rounded-[var(--radius-md)]',
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center font-medium
          transition-all duration-[var(--transition-fast)]
          disabled:opacity-50 disabled:pointer-events-none cursor-pointer
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
