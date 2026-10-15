import { forwardRef, HTMLAttributes } from 'react'

type Variant = 'paper' | 'muted' | 'outlined' | 'flat' | 'hero' | 'brand'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  hover?: boolean
  /** `sm`=12px, `md`=16px (default), `lg`=20px, `xl`=24px. Follows the 4pt grid. */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
}

const paddingMap: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm:   'p-3',   // 12
  md:   'p-4',   // 16
  lg:   'p-5',   // 20
  xl:   'p-6',   // 24
}

const variantClass: Record<Variant, string> = {
  paper:    'surface-paper',
  muted:    'surface-muted',
  outlined: 'surface-outlined',
  hero:     'surface-hero',
  brand:    'surface-brand',
  flat:     '',
}

/**
 * Card — the single card primitive. Linear/Stripe-flavoured:
 * one border, one optional subtle shadow, no multi-layer chrome.
 * Hover is expressed via background, not shadow.
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', variant = 'paper', hover = false, padding = 'md', ...rest }, ref) => {
    const hoverClass = hover
      ? 'cursor-pointer hover:bg-[var(--bg-hover)] transition-colors duration-[160ms] ease-[var(--ease-out-expo)]'
      : ''
    return (
      <div
        ref={ref}
        className={`${variantClass[variant]} ${paddingMap[padding]} ${hoverClass} ${className}`}
        {...rest}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
export default Card
