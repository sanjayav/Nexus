import { AnimatePresence, motion } from 'framer-motion'
import { useId, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Lock } from 'lucide-react'
import { spring, transition } from '../../motion/tokens'

/**
 * Settings building blocks. One vocabulary for every tab:
 *
 *   <SettingsSection title description aside>   a titled group (left column copy, right column card on lg)
 *   <SettingsCard>                               the paper surface rows sit on
 *   <SettingRow label hint control>              one labelled setting with a hairline between rows
 *   <Switch> <Segmented> <FieldSelect> <FieldInput>
 *   <SaveBar dirty saving onSave onDiscard>      slides up from the bottom when a form is dirty
 *   <ReadOnlyNote>                               "only admins can change this"
 */

export function SettingsSection({
  id,
  title,
  description,
  aside,
  children,
}: {
  id?: string
  title: ReactNode
  description?: ReactNode
  /** Right-aligned header slot (status pill, small action). */
  aside?: ReactNode
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <section id={id} aria-labelledby={headingId} className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10 py-8 first:pt-2 border-t border-[var(--border-subtle)] first:border-t-0">
      <header className="min-w-0">
        <div className="flex items-start justify-between gap-3 lg:block">
          <h2 id={headingId} className="type-h3 text-[var(--text-primary)]">{title}</h2>
          {aside && <div className="lg:mt-3 flex-shrink-0">{aside}</div>}
        </div>
        {description && <p className="mt-1.5 text-small text-[var(--text-secondary)] max-w-[60ch]">{description}</p>}
      </header>
      <div className="min-w-0">{children}</div>
    </section>
  )
}

export function SettingsCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`surface-paper divide-y divide-[var(--border-subtle)] ${className}`}>{children}</div>
}

export function SettingRow({
  label,
  hint,
  htmlFor,
  control,
  children,
  stack = false,
}: {
  label: ReactNode
  hint?: ReactNode
  htmlFor?: string
  control?: ReactNode
  /** Extra content under the label row (e.g. an inline error or details). */
  children?: ReactNode
  /** Put the control under the label at every width. */
  stack?: boolean
}) {
  const Label = htmlFor ? 'label' : 'div'
  return (
    <div className="px-4 sm:px-5 py-4">
      <div className={`flex gap-3 ${stack ? 'flex-col' : 'flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-6'}`}>
        <div className="min-w-0 flex-1">
          <Label {...(htmlFor ? { htmlFor } : {})} className="block text-small font-medium text-[var(--text-primary)]">
            {label}
          </Label>
          {hint && <div className="text-caption text-[var(--text-tertiary)] mt-0.5 max-w-[62ch]">{hint}</div>}
        </div>
        {control && <div className={`flex-shrink-0 ${stack ? '' : 'sm:max-w-[60%]'}`}>{control}</div>}
      </div>
      {children}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  id,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  /** Accessible name when no visible <label htmlFor> points at it. */
  label?: string
  id?: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-10 flex-shrink-0 items-center rounded-full transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]
        disabled:opacity-50 disabled:cursor-not-allowed
        ${checked ? 'bg-[var(--btn-primary-bg)]' : 'bg-[var(--border-strong)]'}`}
    >
      <motion.span
        aria-hidden
        initial={false}
        animate={{ x: checked ? 16 : 0 }}
        transition={spring.snappy}
        className="ml-[3px] block h-[18px] w-[18px] rounded-full bg-[var(--bg-primary)] shadow-[0_1px_2px_rgba(15,23,42,0.25)]"
      />
    </button>
  )
}

export interface SegmentedOption<V extends string> {
  value: V
  label: ReactNode
  disabled?: boolean
}

export function Segmented<V extends string>({
  value,
  options,
  onChange,
  disabled,
  'aria-label': ariaLabel,
  size = 'md',
}: {
  value: V
  options: SegmentedOption<V>[]
  onChange: (v: V) => void
  disabled?: boolean
  'aria-label': string
  size?: 'sm' | 'md'
}) {
  const group = useId()
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex max-w-full overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] p-1 gap-0.5"
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled || o.disabled}
            onClick={() => onChange(o.value)}
            className={`relative ${size === 'sm' ? 'h-8 px-2.5' : 'h-9 px-3'} min-w-[44px] rounded-[var(--radius-sm)] text-small font-medium whitespace-nowrap transition-colors duration-150
              disabled:cursor-not-allowed disabled:opacity-60
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand)]
              ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
          >
            {active && (
              <motion.span
                layoutId={`seg-${group}`}
                transition={spring.snappy}
                aria-hidden
                className="absolute inset-0 rounded-[var(--radius-sm)] bg-[var(--bg-primary)] shadow-[var(--shadow-card)] ring-1 ring-[var(--border-subtle)]"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

const fieldBase =
  'h-10 w-full rounded-[var(--radius-md)] border bg-[var(--bg-primary)] px-3 text-small text-[var(--text-primary)] ' +
  'placeholder:text-[var(--text-quaternary)] transition-colors duration-150 ' +
  'focus:outline-none focus-visible:border-[var(--color-brand)] focus-visible:ring-2 focus-visible:ring-[var(--status-success-line)] ' +
  'disabled:cursor-not-allowed disabled:bg-[var(--bg-secondary)] disabled:text-[var(--text-tertiary)]'

export function FieldSelect({
  id,
  value,
  onChange,
  options,
  disabled,
  invalid,
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': describedBy,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  options: Array<{ value: string; label: string }>
  disabled?: boolean
  invalid?: boolean
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldBase} pr-8 ${invalid ? 'border-[var(--status-danger)]' : 'border-[var(--border-default)]'} ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function FieldInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  invalid,
  type = 'text',
  className = '',
  inputMode,
  autoComplete = 'off',
  'aria-describedby': describedBy,
  'aria-label': ariaLabel,
  mono = false,
}: {
  id?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  type?: string
  className?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode']
  autoComplete?: string
  'aria-describedby'?: string
  'aria-label'?: string
  mono?: boolean
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      inputMode={inputMode}
      autoComplete={autoComplete}
      spellCheck={false}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
      className={`${fieldBase} ${mono ? 'font-mono tabular-nums' : ''} ${invalid ? 'border-[var(--status-danger)]' : 'border-[var(--border-default)]'} ${className}`}
    />
  )
}

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {children ? (
        <motion.p
          id={id}
          role="alert"
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={transition.fast}
          className="mt-1.5 text-caption text-[var(--status-danger)]"
        >
          {children}
        </motion.p>
      ) : null}
    </AnimatePresence>
  )
}

/** Sticky save bar for draft-style forms. Slides up when dirty. */
export function SaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
  canSave = true,
  message,
}: {
  dirty: boolean
  saving: boolean
  onSave: () => void
  onDiscard: () => void
  canSave?: boolean
  message?: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <AnimatePresence>
      {dirty && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={spring.gentle}
          className="sticky bottom-4 z-20 mt-6"
        >
          <div
            role="region"
            aria-label={t('settings.saveBar.region')}
            className="surface-raised flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-2 text-small text-[var(--text-secondary)]">
              <span className="h-2 w-2 rounded-full bg-[var(--status-warning)] flex-shrink-0" aria-hidden />
              {message ?? t('settings.saveBar.unsaved')}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onDiscard} disabled={saving} className="btn-secondary h-10 flex-1 sm:flex-none">
                {t('settings.saveBar.discard')}
              </button>
              <button type="button" onClick={onSave} disabled={saving || !canSave} className="btn-primary h-10 flex-1 sm:flex-none">
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {saving ? t('settings.saveBar.saving') : t('settings.saveBar.save')}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ReadOnlyNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 text-small text-[var(--text-secondary)]">
      <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--text-tertiary)]" aria-hidden />
      <div>{children}</div>
    </div>
  )
}

/** Inline notice band (info / warning / danger) for env fallbacks and honest "not configured" states. */
export function Notice({
  tone = 'info',
  icon,
  title,
  children,
  action,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success' | 'neutral'
  icon?: ReactNode
  title?: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div
      data-tone={tone}
      className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--pill-line)] bg-[var(--pill-bg)] px-4 py-3 sm:flex-row sm:items-start"
    >
      {icon && <span className="mt-0.5 flex-shrink-0 text-[var(--pill-fg)] [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      <div className="min-w-0 flex-1 text-small text-[var(--text-secondary)]">
        {title && <div className="font-semibold text-[var(--text-primary)]">{title}</div>}
        {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
