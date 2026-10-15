import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, className = '', ...props }, ref) => {
    return (
      <div className={className}>
        {label && (
          <label className="block text-[var(--text-sm)] font-medium text-[var(--text-primary)] mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`
              w-full h-10 px-3 text-[var(--text-base)] text-[var(--text-primary)]
              bg-[var(--bg-primary)] border rounded-[var(--radius-md)]
              placeholder:text-[var(--text-tertiary)]
              transition-colors duration-[var(--transition-fast)]
              focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1
              ${icon ? 'pl-10' : ''}
              ${error
                ? 'border-[var(--accent-red)] focus:ring-[var(--accent-red)]'
                : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
              }
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1 text-[var(--text-xs)] text-[var(--accent-red)]">{error}</p>
        )}
        {hint && !error && (
          <p className="mt-1 text-[var(--text-xs)] text-[var(--text-tertiary)]">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
