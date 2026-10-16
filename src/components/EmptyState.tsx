import { createElement, isValidElement, type ComponentType, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import type { LucideIcon } from 'lucide-react'
import { RotateCcw, FilterX } from 'lucide-react'
import Illustration, { type IllustrationName } from '../design-system/illustrations/Illustration'
import { SkeletonText } from './Skeleton'
import { dur, ease } from '../motion/tokens'

/**
 * EmptyState — the one empty/zero/error placeholder.
 *
 * Contract: illustration → title → one line → one primary action (+ optional
 * secondary). Variants make the state truthful:
 *
 *   empty     nothing exists yet; teach the next step       <EmptyState title=… cta=… />
 *   cleared   the work is done (celebratory, calm)          <EmptyState variant="cleared" />
 *   filtered  data exists, the filters hide it              <EmptyState variant="filtered" onClearFilters={reset} />
 *   error     it failed to load — never shown as "empty"    <EmptyState variant="error" onRetry={load} detail={err.message} />
 *   loading   skeleton (prefer <StateBoundary>)             <EmptyState variant="loading" />
 *
 * Titles/bodies default to translated copy per variant, so `title` is optional.
 * Legacy props (`illustration`, `icon`, `description`, `actions`, `size`) keep
 * working; `design-system/components/EmptyState` re-exports this component.
 */

export type EmptyVariant = 'empty' | 'cleared' | 'filtered' | 'error' | 'loading'

export interface EmptyStateCta {
  label: string
  onClick?: () => void
  /** External or full-page link. */
  href?: string
  /** In-app route (react-router). */
  to?: string
  disabled?: boolean
  icon?: ReactNode
}

export interface EmptyStateProps {
  variant?: EmptyVariant
  title?: string
  body?: ReactNode
  /** Alias of `body`. */
  description?: ReactNode
  /** Named contour illustration; `false` hides it. Defaults per variant. */
  art?: IllustrationName | false
  /** Legacy: custom illustration component (takes precedence over `art`). */
  illustration?: ComponentType<{ className?: string }>
  /** Legacy: icon medallion instead of an illustration (component or element). */
  icon?: LucideIcon | ReactNode
  cta?: EmptyStateCta
  secondaryCta?: EmptyStateCta
  /** Free-form action slot (rendered after the CTAs). */
  actions?: ReactNode
  /** error: adds a "Try again" primary action. */
  onRetry?: () => void
  /** filtered: adds a "Clear filters" action. */
  onClearFilters?: () => void
  /** error: technical message, tucked into a disclosure. */
  detail?: string | null
  density?: 'comfortable' | 'compact'
  /** Legacy DS sizing; sm ≈ compact. */
  size?: 'sm' | 'md' | 'lg'
  /** Dashed outline frame (for in-card empty regions). */
  framed?: boolean
  className?: string
}

const DEFAULT_ART: Record<Exclude<EmptyVariant, 'loading'>, IllustrationName> = {
  empty: 'noData',
  cleared: 'cleared',
  filtered: 'filtered',
  error: 'error',
}

export default function EmptyState({
  variant = 'empty',
  title,
  body,
  description,
  art,
  illustration: CustomIllustration,
  icon,
  cta,
  secondaryCta,
  actions,
  onRetry,
  onClearFilters,
  detail,
  density,
  size,
  framed = false,
  className = '',
}: EmptyStateProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const compact = density === 'compact' || size === 'sm'
  const large = size === 'lg'
  const pad = compact ? 'py-10 px-4' : large ? 'py-20 px-6' : 'py-14 px-6'
  const frame = framed ? 'surface-outlined' : ''

  if (variant === 'loading') {
    return (
      <div role="status" aria-live="polite" className={`${frame} ${pad} ${className}`}>
        <span className="sr-only">{t('ui.state.loading')}</span>
        <div className="max-w-md mx-auto">
          <SkeletonText lines={3} />
        </div>
      </div>
    )
  }

  const v = variant
  const heading = title ?? t(`ui.empty.${v}.title`)
  const text = body ?? description ?? (title ? undefined : t(`ui.empty.${v}.body`))

  const primary: EmptyStateCta | undefined =
    cta ?? (v === 'error' && onRetry ? { label: t('ui.state.retry'), onClick: onRetry, icon: <RotateCcw className="w-3.5 h-3.5" /> } : undefined)
  const secondary: EmptyStateCta | undefined =
    secondaryCta ??
    (v === 'filtered' && onClearFilters
      ? { label: t('ui.state.clearFilters'), onClick: onClearFilters, icon: <FilterX className="w-3.5 h-3.5" /> }
      : v === 'error' && onRetry && cta
        ? { label: t('ui.state.retry'), onClick: onRetry }
        : undefined)

  let visual: ReactNode = null
  const artSize = compact ? 96 : large ? 152 : 128
  if (CustomIllustration) {
    visual = (
      <div className="text-[var(--ill-stroke)] mb-5">
        <CustomIllustration className={compact ? 'w-28 h-28' : 'w-36 h-36'} />
      </div>
    )
  } else if (icon && art === undefined) {
    const node = isValidElement(icon) ? icon : createElement(icon as LucideIcon, { className: 'w-6 h-6', strokeWidth: 1.75 })
    visual = (
      <div
        className="w-12 h-12 rounded-[var(--radius-xl)] flex items-center justify-center mb-4 text-[var(--color-brand)] [&>svg]:w-6 [&>svg]:h-6"
        style={{ background: 'var(--gradient-brand-soft)', boxShadow: 'inset 0 0 0 1px var(--status-success-line)' }}
      >
        {node}
      </div>
    )
  } else if (art !== false) {
    visual = (
      <div className="mb-4">
        <Illustration name={art ?? DEFAULT_ART[v]} size={artSize} />
      </div>
    )
  }

  return (
    <motion.div
      role={v === 'error' ? 'alert' : 'status'}
      aria-live={v === 'error' ? 'assertive' : 'polite'}
      data-variant={v}
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: dur.base, ease: ease.out }}
      className={`flex flex-col items-center text-center ${frame} ${pad} ${className}`}
    >
      {visual}
      <h3 className={`${compact ? 'type-h3' : 'type-h2'} text-[var(--text-primary)] max-w-md`}>{heading}</h3>
      {text && (
        <p className="type-body text-[var(--text-secondary)] mt-1.5 max-w-md text-pretty">{text}</p>
      )}
      {(primary || secondary || actions) && (
        <div className="mt-5 flex items-center gap-2.5 flex-wrap justify-center">
          {primary && <EmptyCtaBtn {...primary} variant="primary" />}
          {secondary && <EmptyCtaBtn {...secondary} variant="secondary" />}
          {actions}
        </div>
      )}
      {v === 'error' && detail && (
        <details className="mt-4 max-w-md w-full text-left">
          <summary className="text-caption text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)] text-center list-none">
            {t('ui.state.details')}
          </summary>
          <pre className="mt-2 p-3 rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] font-mono text-caption text-[var(--text-secondary)] whitespace-pre-wrap break-words">
            {detail}
          </pre>
        </details>
      )}
    </motion.div>
  )
}

function EmptyCtaBtn({ label, onClick, href, to, disabled, icon, variant }: EmptyStateCta & { variant: 'primary' | 'secondary' }) {
  const base =
    'inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-[var(--radius-md)] text-small font-semibold whitespace-nowrap transition-colors duration-micro ease-out disabled:opacity-50 disabled:pointer-events-none'
  const look =
    variant === 'primary'
      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-bg-hover)] shadow-[var(--btn-primary-shadow)]'
      : 'bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-strong)]'
  const cls = `${base} ${look}`
  const content = (
    <>
      {icon}
      {label}
    </>
  )
  if (to && !disabled) return <Link to={to} className={cls}>{content}</Link>
  if (href && !disabled) return <a href={href} className={cls}>{content}</a>
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={cls}>
      {content}
    </button>
  )
}
