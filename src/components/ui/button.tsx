import { ButtonHTMLAttributes, forwardRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'brand'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-fill',
  brand: 'bg-brand-600 text-white hover:bg-brand-700 shadow-fill',
  secondary: 'bg-white text-zinc-800 border border-line hover:bg-zinc-50 hover:border-zinc-300 shadow-card',
  ghost: 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-900/[0.05]',
  danger: 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 shadow-card',
}
const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-[10px]',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    size?: ButtonSize
    icon?: LucideIcon
    iconRight?: LucideIcon
    loading?: boolean
  }
>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    icon: Icon,
    iconRight: IconRight,
    loading,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  const iconCls = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex items-center justify-center font-medium whitespace-nowrap select-none',
        // Press feedback is a quick scale; hover answers with colour, not movement.
        'transition-[background-color,border-color,box-shadow,transform,color] duration-150 ease-out active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className={clsx(iconCls, 'animate-spin')} /> : Icon && <Icon className={iconCls} strokeWidth={2} />}
      {children}
      {IconRight && <IconRight className={iconCls} strokeWidth={2} />}
    </button>
  )
})
