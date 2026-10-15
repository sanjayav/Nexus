import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import clsx from 'clsx'

/*
 * Nexus UI primitives. Visual language:
 * - warm neutral canvas (bg-canvas), white cards with hairline border (border-line) + shadow-card
 * - zinc-900 for primary text/actions, zinc-500 for secondary, brand (emerald) only for status / emphasis
 * - sentence-case labels; no all-caps letter-spaced micro text except Eyebrow
 */

// ─── Page header ──────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-6">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2"><Eyebrow>{eyebrow}</Eyebrow></div>}
        <h1 className="text-2xl sm:text-[28px] font-semibold tracking-[-0.02em] text-zinc-900 leading-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-zinc-500 max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx('text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500', className)}>{children}</span>
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({
  children,
  className,
  padded = true,
  interactive = false,
  as: Tag = 'div',
  ...rest
}: {
  children: ReactNode
  className?: string
  padded?: boolean
  interactive?: boolean
  as?: 'div' | 'section' | 'article'
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Tag
      className={clsx(
        'bg-surface border border-line rounded-card shadow-card',
        padded && 'p-5 sm:p-6',
        interactive && 'transition-[box-shadow,border-color] hover:border-zinc-300 hover:shadow-pop cursor-pointer',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({
  title,
  description,
  action,
  icon: Icon,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: LucideIcon
  className?: string
}) {
  return (
    <div className={clsx('flex items-start justify-between gap-4 mb-5', className)}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-zinc-900 leading-snug">{title}</h3>
          {description && <p className="text-[13px] text-zinc-500 mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'brand'
type ButtonSize = 'sm' | 'md' | 'lg'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm',
  brand: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
  secondary: 'bg-white text-zinc-800 border border-line hover:bg-zinc-50 hover:border-zinc-300 shadow-sm',
  ghost: 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100',
  danger: 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50',
}
const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-[10px]',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; icon?: LucideIcon; iconRight?: LucideIcon }
>(function Button({ variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, className, children, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        'inline-flex items-center justify-center font-medium whitespace-nowrap transition-colors active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
      {children}
      {IconRight && <IconRight className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
    </button>
  )
})

// ─── Badge ────────────────────────────────────────────────────────────────────

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand'

const toneStyles: Record<Tone, string> = {
  neutral: 'bg-zinc-100 text-zinc-700 ring-zinc-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200/70',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200/70',
  info: 'bg-sky-50 text-sky-700 ring-sky-200/70',
  brand: 'bg-zinc-900 text-white ring-zinc-900',
}
const dotStyles: Record<Tone, string> = {
  neutral: 'bg-zinc-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  brand: 'bg-white',
}

export function Badge({ tone = 'neutral', dot, icon: Icon, children, className }: { tone?: Tone; dot?: boolean; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-xs font-medium ring-1 ring-inset whitespace-nowrap', toneStyles[tone], className)}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dotStyles[tone])} />}
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  )
}

// ─── Stat ─────────────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  unit,
  delta,
  deltaLabel,
  goodWhen = 'up',
  icon: Icon,
  footer,
  className,
}: {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  delta?: number
  deltaLabel?: ReactNode
  goodWhen?: 'up' | 'down'
  icon?: LucideIcon
  footer?: ReactNode
  className?: string
}) {
  const isGood = delta === undefined ? undefined : goodWhen === 'up' ? delta >= 0 : delta <= 0
  return (
    <Card className={clsx('flex flex-col', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-zinc-500">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-zinc-400" />}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-[28px] font-semibold tracking-[-0.02em] text-zinc-900 tabular leading-none">{value}</span>
        {unit && <span className="text-sm text-zinc-500">{unit}</span>}
      </div>
      {(delta !== undefined || deltaLabel) && (
        <div className="mt-3 flex items-center gap-1.5 text-xs">
          {delta !== undefined && (
            <span className={clsx('inline-flex items-center gap-0.5 font-medium tabular', isGood ? 'text-emerald-600' : 'text-rose-600')}>
              {delta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(delta)}%
            </span>
          )}
          {deltaLabel && <span className="text-zinc-500">{deltaLabel}</span>}
        </div>
      )}
      {footer && <div className="mt-4 pt-4 border-t border-line">{footer}</div>}
    </Card>
  )
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export function Progress({ value, tone = 'neutral', className }: { value: number; tone?: Tone; className?: string }) {
  const bar: Record<Tone, string> = {
    neutral: 'bg-zinc-900',
    brand: 'bg-zinc-900',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
  }
  return (
    <div className={clsx('h-1.5 w-full rounded-full bg-zinc-100 overflow-hidden', className)}>
      <div className={clsx('h-full rounded-full transition-[width] duration-500', bar[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

// ─── Tabs (segmented) ─────────────────────────────────────────────────────────

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: { value: T; label: ReactNode; count?: number }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div role="tablist" className={clsx('inline-flex items-center gap-0.5 p-0.5 rounded-[10px] bg-zinc-100 border border-line max-w-full overflow-x-auto scrollbar-none', className)}>
      {items.map(it => (
        <button
          key={it.value}
          role="tab"
          type="button"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={clsx(
            'h-8 px-3 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors inline-flex items-center gap-1.5',
            value === it.value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800',
          )}
        >
          {it.label}
          {it.count !== undefined && <span className="text-[11px] tabular text-zinc-400">{it.count}</span>}
        </button>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, description, action }: { icon?: LucideIcon; title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {Icon && (
        <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-500 flex items-center justify-center mb-3">
          <Icon className="w-5 h-5" />
        </div>
      )}
      <div className="text-sm font-medium text-zinc-900">{title}</div>
      {description && <p className="text-[13px] text-zinc-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── Form controls ────────────────────────────────────────────────────────────

export const inputClass =
  'w-full h-9 px-3 rounded-[10px] bg-white border border-line text-sm text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500/60 transition-shadow'

export function Field({ label, hint, children, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-zinc-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  )
}

// ─── Table helpers ────────────────────────────────────────────────────────────

export const tableClass = {
  wrap: 'overflow-x-auto -mx-5 sm:-mx-6',
  table: 'w-full text-sm',
  th: 'text-left text-xs font-medium text-zinc-500 px-5 sm:px-6 py-2.5 border-b border-line bg-zinc-50/60 whitespace-nowrap',
  td: 'px-5 sm:px-6 py-3 border-b border-line text-zinc-700 align-middle',
  tr: 'hover:bg-zinc-50/70 transition-colors',
}

// ─── Chart theme (recharts) ───────────────────────────────────────────────────

export const chartTheme = {
  grid: '#EEEDE8',
  axis: '#A1A1AA',
  tooltip: {
    contentStyle: { background: '#fff', border: '1px solid #E7E6E1', borderRadius: 10, boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)', fontSize: 12 },
    labelStyle: { color: '#18181B', fontWeight: 600 },
  },
  // Ordered categorical palette; first is primary series.
  series: ['#18181B', '#10B981', '#0EA5E9', '#F59E0B', '#8B5CF6', '#F43F5E'],
}
