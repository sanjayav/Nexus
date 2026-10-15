import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import clsx from 'clsx'

/*
 * Nexus UI primitives. Visual language:
 * - warm neutral canvas (bg-canvas), white cards with hairline border (border-line) + layered shadow-card
 * - zinc-900 for primary text/actions, zinc-500 for secondary, brand (emerald) only for status / emphasis
 * - figures are tabular and tightly tracked (.display); sentence-case labels; no all-caps micro text except Eyebrow
 * - motion: one page-enter moment (animate-page); controls answer with colour/elevation, not movement
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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-7">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2"><Eyebrow>{eyebrow}</Eyebrow></div>}
        <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.025em] text-zinc-900 leading-[1.15]">{title}</h1>
        {description && <p className="mt-2 text-sm text-zinc-500 max-w-[62ch] leading-relaxed">{description}</p>}
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
        interactive &&
          'cursor-pointer transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-px hover:border-zinc-300 hover:shadow-raised active:translate-y-0 active:shadow-card',
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
          <div className="w-8 h-8 rounded-lg bg-zinc-900/[0.04] ring-1 ring-inset ring-zinc-900/[0.06] text-zinc-600 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" strokeWidth={1.9} />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-zinc-900 leading-snug tracking-[-0.01em]">{title}</h3>
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
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-fill',
  brand: 'bg-brand-600 text-white hover:bg-brand-700 shadow-fill',
  secondary: 'bg-white text-zinc-800 border border-line hover:bg-zinc-50 hover:border-zinc-300 shadow-card',
  ghost: 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-900/[0.05]',
  danger: 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 hover:border-rose-300 shadow-card',
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
        'inline-flex items-center justify-center font-medium whitespace-nowrap select-none',
        'transition-[background-color,border-color,box-shadow,transform,color] duration-150 ease-out active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        'disabled:opacity-50 disabled:pointer-events-none',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} strokeWidth={2} />}
      {children}
      {IconRight && <IconRight className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} strokeWidth={2} />}
    </button>
  )
})

// ─── Badge ────────────────────────────────────────────────────────────────────

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand'

const toneStyles: Record<Tone, string> = {
  neutral: 'bg-zinc-900/[0.04] text-zinc-700 ring-zinc-900/[0.08]',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  warning: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  danger: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/20',
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

type StatProps = {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  delta?: number
  deltaLabel?: ReactNode
  goodWhen?: 'up' | 'down'
  icon?: LucideIcon
  footer?: ReactNode
  className?: string
}

function StatBody({ label, value, unit, delta, deltaLabel, goodWhen = 'up', icon: Icon, footer }: StatProps) {
  const isGood = delta === undefined ? undefined : goodWhen === 'up' ? delta >= 0 : delta <= 0
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-zinc-500 truncate">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.9} />}
      </div>
      <div className="mt-3 flex items-baseline gap-1.5 min-w-0">
        <span className="display text-[30px] font-semibold text-zinc-900 leading-none truncate">{value}</span>
        {unit && <span className="text-sm text-zinc-500 shrink-0">{unit}</span>}
      </div>
      {(delta !== undefined || deltaLabel) && (
        <div className="mt-3 flex items-center gap-2 text-xs min-w-0">
          {delta !== undefined && (
            <span
              className={clsx(
                'inline-flex items-center gap-0.5 h-5 px-1.5 rounded-md font-medium tabular shrink-0',
                isGood ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700',
              )}
            >
              {delta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {Math.abs(delta)}%
            </span>
          )}
          {deltaLabel && <span className="text-zinc-500 truncate">{deltaLabel}</span>}
        </div>
      )}
      {footer && <div className="mt-4 pt-4 border-t border-line">{footer}</div>}
    </>
  )
}

/** A single stat on its own card. */
export function StatCard({ className, ...props }: StatProps) {
  return (
    <Card className={clsx('flex flex-col', className)}>
      <StatBody {...props} />
    </Card>
  )
}

/**
 * Several stats on one surface, separated by hairlines: a ledger strip
 * rather than a row of identical boxes. Use with `<Stat>` children.
 */
export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card padded={false} className={clsx('grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 overflow-hidden', className)}>
      {children}
    </Card>
  )
}

export function Stat({ className, ...props }: StatProps) {
  return (
    <div
      className={clsx(
        'flex flex-col p-5 sm:p-6 min-w-0',
        // Hairlines between cells, correct for every column count.
        'border-line border-t sm:border-t-0 first:border-t-0',
        'sm:[&:nth-child(n+3)]:border-t xl:[&:nth-child(n+3)]:border-t-0',
        'sm:[&:nth-child(2n)]:border-l xl:[&:not(:first-child)]:border-l',
        className,
      )}
    >
      <StatBody {...props} />
    </div>
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
    <div className={clsx('h-1.5 w-full rounded-full bg-zinc-900/[0.06] overflow-hidden', className)}>
      <div className={clsx('h-full rounded-full transition-[width] duration-500 ease-out', bar[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
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
    <div role="tablist" className={clsx('inline-flex items-center gap-0.5 p-1 rounded-[11px] bg-zinc-900/[0.05] max-w-full overflow-x-auto scrollbar-none', className)}>
      {items.map(it => (
        <button
          key={it.value}
          role="tab"
          type="button"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={clsx(
            'h-8 px-3 rounded-lg text-[13px] font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150 inline-flex items-center gap-1.5',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
            value === it.value ? 'bg-white text-zinc-900 shadow-card ring-1 ring-zinc-900/[0.06]' : 'text-zinc-500 hover:text-zinc-900',
          )}
        >
          {it.label}
          {it.count !== undefined && (
            <span className={clsx('text-[11px] tabular', value === it.value ? 'text-zinc-500' : 'text-zinc-400')}>{it.count}</span>
          )}
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
        <div className="w-11 h-11 rounded-full bg-zinc-900/[0.04] ring-1 ring-inset ring-zinc-900/[0.06] text-zinc-500 flex items-center justify-center mb-3">
          <Icon className="w-5 h-5" strokeWidth={1.8} />
        </div>
      )}
      <div className="text-sm font-medium text-zinc-900">{title}</div>
      {description && <p className="text-[13px] text-zinc-500 mt-1 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ─── Form controls ────────────────────────────────────────────────────────────

export const inputClass =
  'w-full h-9 px-3 rounded-[10px] bg-white border border-line text-sm text-zinc-900 placeholder:text-zinc-500 shadow-card hover:border-zinc-300 focus:outline-none focus:ring-[3px] focus:ring-brand-500/20 focus:border-brand-600 transition-[box-shadow,border-color] duration-150'

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
  wrap: 'overflow-x-auto -mx-5 sm:-mx-6 [&_tbody_tr:last-child>td]:border-b-0',
  table: 'w-full text-sm',
  th: 'text-left text-xs font-medium text-zinc-500 px-5 sm:px-6 py-2.5 border-b border-line bg-zinc-50/80 whitespace-nowrap',
  td: 'px-5 sm:px-6 py-3.5 border-b border-line text-zinc-700 align-middle',
  tr: 'hover:bg-zinc-900/[0.025] transition-colors duration-100',
}

// ─── Chart theme (recharts) ───────────────────────────────────────────────────

export const chartTheme = {
  grid: '#ECEBE6',
  axis: '#71717A',
  tooltip: {
    contentStyle: {
      background: '#fff',
      border: '1px solid #E7E6E1',
      borderRadius: 10,
      boxShadow: '0 2px 4px rgba(20,20,16,0.05), 0 12px 24px -12px rgba(20,20,16,0.18)',
      fontSize: 12,
      padding: '8px 10px',
    },
    labelStyle: { color: '#18181B', fontWeight: 600, marginBottom: 2 },
  },
  // Ordered categorical palette; first is primary series.
  series: ['#18181B', '#10B981', '#0EA5E9', '#F59E0B', '#8B5CF6', '#F43F5E'],
}
