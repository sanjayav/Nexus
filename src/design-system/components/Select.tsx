import { SelectHTMLAttributes, forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string
  options: Option[]
  placeholder?: string
  error?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, error, className = '', ...props }, ref) => {
    return (
      <div className={className}>
        {label && (
          <label className="block text-[var(--text-sm)] font-medium text-[var(--text-primary)] mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`
              w-full h-10 px-3 pr-9 text-[var(--text-base)] text-[var(--text-primary)]
              bg-[var(--bg-primary)] border rounded-[var(--radius-md)]
              appearance-none cursor-pointer
              transition-colors duration-[var(--transition-fast)]
              focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1
              ${error
                ? 'border-[var(--accent-red)]'
                : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'
              }
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1 text-[var(--text-xs)] text-[var(--accent-red)]">{error}</p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
export default Select
