import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/**
 * AuthField — labelled input for the public auth forms, on theme tokens.
 * Label above (sentence case, never uppercased — CJK safe), optional leading
 * icon or prefix, optional trailing slot (e.g. "Send code"), inline error.
 */
interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  id: string
  label: ReactNode
  icon?: LucideIcon
  prefix?: ReactNode
  trailing?: ReactNode
  /** Right side of the label row (e.g. "Forgot password?"). */
  labelAside?: ReactNode
  error?: string | null
  hint?: ReactNode
}

export const inputClass =
  'w-full h-11 rounded-[10px] text-[14px] outline-none transition-[border-color,box-shadow] duration-150 ' +
  'bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-quaternary)] ' +
  'border border-[var(--border-default)] hover:border-[var(--border-strong)] ' +
  'focus:border-[var(--border-focus)] focus:shadow-[var(--shadow-focus)] ' +
  'disabled:opacity-60 disabled:cursor-not-allowed'

const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(function AuthField(
  { id, label, icon: Icon, prefix, trailing, labelAside, error, hint, className = '', ...rest },
  ref,
) {
  const errId = error ? `${id}-err` : undefined
  const hintId = hint ? `${id}-hint` : undefined
  const describedBy = [rest['aria-describedby'], errId, hintId].filter(Boolean).join(' ') || undefined
  const padLeft = Icon ? 'pl-10' : prefix ? 'pl-[58px]' : 'pl-3.5'

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <label htmlFor={id} className="type-small font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          {Icon && (
            <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-tertiary)' }} aria-hidden />
          )}
          {prefix && (
            <span
              className="absolute left-0 top-0 bottom-0 w-[48px] flex items-center justify-center text-[14px] tabular-nums pointer-events-none"
              style={{ color: 'var(--text-secondary)', borderRight: '1px solid var(--border-default)' }}
              aria-hidden
            >
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            {...rest}
            aria-invalid={error ? true : rest['aria-invalid']}
            aria-describedby={describedBy}
            className={`${inputClass} ${padLeft} pr-3.5 ${error ? '!border-[var(--status-danger)]' : ''} ${className}`}
          />
        </div>
        {trailing}
      </div>
      {error && (
        <p id={errId} className="mt-1.5 type-caption" style={{ color: 'var(--status-danger)' }}>{error}</p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 type-caption" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>
      )}
    </div>
  )
})

export default AuthField
