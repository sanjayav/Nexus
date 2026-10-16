import { useId, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, AlertCircle } from 'lucide-react'
import { NumberTicker } from '../../ui'

/**
 * Calculator form kit — one vocabulary for every calculator surface
 * (Scope 3, PCAF, emission-factor and GWP sheets):
 *
 *   <CalcField label="Spend" unit="USD" required error={errors.spend} hint="…">
 *     {(p) => <CalcInput {...p} type="number" value={v} onChange={…} />}
 *   </CalcField>
 *
 * Labels sit above inputs, units are input suffixes, validation is inline
 * (red border + message under the field, announced via aria-describedby).
 */

export interface FieldControlProps {
  id: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
  unit?: string
}

export function CalcField({
  label,
  unit,
  required,
  hint,
  error,
  className = '',
  children,
}: {
  label: ReactNode
  unit?: string
  required?: boolean
  hint?: ReactNode
  error?: string | null
  className?: string
  children: (p: FieldControlProps) => ReactNode
}) {
  const { t } = useTranslation()
  const id = useId()
  const hintId = `${id}-hint`
  const errId = `${id}-err`
  const describedBy = [error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="flex items-baseline gap-1 text-small font-medium text-[var(--text-primary)] mb-1.5">
        <span className="min-w-0">{label}</span>
        {required && (
          <span className="text-[var(--status-danger)]" aria-hidden>*</span>
        )}
        {required && <span className="sr-only">{t('calculators.form.required')}</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, 'aria-required': required || undefined, unit })}
      {error ? (
        <p id={errId} className="mt-1.5 flex items-start gap-1 text-caption text-[var(--status-danger)]">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-caption text-[var(--text-tertiary)]">{hint}</p>
      ) : null}
    </div>
  )
}

const shell =
  'flex items-stretch w-full min-h-[40px] rounded-[var(--radius-md)] border bg-[var(--bg-primary)] transition-[border-color,box-shadow] duration-micro ease-out ' +
  'focus-within:border-[var(--border-focus)] focus-within:shadow-[0_0_0_3px_var(--color-brand-soft)]'
const shellState = (invalid?: boolean) =>
  invalid ? 'border-[var(--status-danger)]' : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'

export function CalcInput({ unit, className = '', ...props }: InputHTMLAttributes<HTMLInputElement> & { unit?: string }) {
  const invalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true'
  const numeric = props.type === 'number'
  return (
    <div className={`${shell} ${shellState(invalid)} ${className}`}>
      <input
        {...props}
        inputMode={numeric ? 'decimal' : props.inputMode}
        className={`flex-1 min-w-0 bg-transparent px-3 text-body text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] outline-none ${numeric ? 'tabular-nums' : ''} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      {unit && (
        <span className="flex items-center px-3 border-l border-[var(--border-subtle)] bg-[var(--bg-subtle)] rounded-r-[var(--radius-md)] text-caption font-medium text-[var(--text-tertiary)] whitespace-nowrap">
          {unit}
        </span>
      )}
    </div>
  )
}

export function CalcSelect({ unit, className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { unit?: string }) {
  const invalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true'
  return (
    <div className={`${shell} ${shellState(invalid)} relative ${className}`}>
      <select
        {...props}
        className="flex-1 min-w-0 appearance-none bg-transparent pl-3 pr-9 text-body text-[var(--text-primary)] outline-none cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" aria-hidden />
      {unit && (
        <span className="flex items-center px-3 border-l border-[var(--border-subtle)] bg-[var(--bg-subtle)] rounded-r-[var(--radius-md)] text-caption font-medium text-[var(--text-tertiary)] whitespace-nowrap">
          {unit}
        </span>
      )}
    </div>
  )
}

export function CalcTextarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const invalid = props['aria-invalid'] === true || props['aria-invalid'] === 'true'
  return (
    <textarea
      {...props}
      className={`w-full rounded-[var(--radius-md)] border bg-[var(--bg-primary)] px-3 py-2 text-body text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] outline-none transition-[border-color,box-shadow] duration-micro focus:border-[var(--border-focus)] focus:shadow-[0_0_0_3px_var(--color-brand-soft)] ${shellState(invalid)} ${className}`}
    />
  )
}

export interface LedgerRow {
  label: ReactNode
  value: ReactNode
  /** Emphasise (primary text, semibold). */
  strong?: boolean
}

/**
 * ResultLedger — the calm result card. Caption, then the exact figure (rolls
 * on change), then hairline rows (factor, attribution, data quality …), then
 * a method/source footnote. Announced politely to screen readers.
 */
export function ResultLedger({
  label,
  value,
  format,
  unit,
  status,
  rows = [],
  footnote,
  children,
  className = '',
}: {
  label: ReactNode
  value: number | null | undefined
  format: (n: number) => string
  unit?: string
  status?: ReactNode
  rows?: LedgerRow[]
  footnote?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <section className={`surface-paper overflow-hidden ${className}`} aria-live="polite">
      <div className="px-5 pt-4 pb-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-caption font-medium text-[var(--text-tertiary)]">{label}</span>
          {status}
        </div>
        <div className="mt-1.5 flex items-baseline gap-2 flex-wrap min-w-0">
          <NumberTicker
            value={value}
            format={format}
            className="type-figure text-[30px] sm:text-[34px] leading-[40px] text-[var(--text-primary)]"
          />
          {unit && <span className="text-small font-medium text-[var(--text-tertiary)] whitespace-nowrap">{unit}</span>}
        </div>
      </div>
      {rows.length > 0 && (
        <dl className="border-t border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
          {rows.map((r, i) => (
            <div key={i} className="flex items-start justify-between gap-4 px-5 py-2.5">
              <dt className="text-caption text-[var(--text-tertiary)] pt-0.5 min-w-0">{r.label}</dt>
              <dd className={`text-small text-right tabular-nums min-w-0 ${r.strong ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {children}
      {footnote && (
        <footer className="px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-caption text-[var(--text-tertiary)]">
          {footnote}
        </footer>
      )}
    </section>
  )
}

/** Inline callout for warnings / compute errors next to the form. */
export function Callout({ tone = 'warning', title, children }: { tone?: 'warning' | 'danger' | 'info'; title?: ReactNode; children?: ReactNode }) {
  const fg = tone === 'danger' ? 'var(--status-danger)' : tone === 'info' ? 'var(--status-info)' : 'var(--status-warning)'
  const bg = tone === 'danger' ? 'var(--status-danger-soft)' : tone === 'info' ? 'var(--status-info-soft)' : 'var(--status-warning-soft)'
  const line = tone === 'danger' ? 'var(--status-danger-line)' : tone === 'info' ? 'var(--status-info-line)' : 'var(--status-warning-line)'
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className="rounded-[var(--radius-md)] border px-3.5 py-3 text-small" style={{ background: bg, borderColor: line }}>
      {title && <div className="flex items-center gap-1.5 font-semibold" style={{ color: fg }}><AlertCircle className="w-4 h-4" aria-hidden />{title}</div>}
      {children && <div className={`text-[var(--text-secondary)] ${title ? 'mt-1' : ''}`}>{children}</div>}
    </div>
  )
}

/** Segmented toggle (radio group semantics). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: ReactNode }>
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex items-center p-0.5 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
      {options.map(o => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`h-8 px-3 rounded-[var(--radius-sm)] text-small font-medium whitespace-nowrap transition-colors duration-micro ${
              on
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-[var(--shadow-card)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
