import { Sun, Monitor, Moon } from 'lucide-react'
import { useColorMode, type ColorMode } from '../theme/ThemeContext'

interface ThemeToggleProps {
  /** Compact = 28px buttons (TopBar). Default = 36px (Settings). */
  size?: 'compact' | 'default'
  className?: string
}

const OPTIONS: { value: ColorMode; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'auto', icon: Monitor, label: 'Auto' },
  { value: 'dark', icon: Moon, label: 'Dark' },
]

/**
 * Three-state color-mode toggle (Light / Auto / Dark).
 * Restrained, segmented control with a quiet selected pill. Built to look
 * deliberate in both light and dark surrounding chrome — it picks colors
 * from the theme token system rather than hardcoding white-on-black.
 */
export default function ThemeToggle({ size = 'default', className }: ThemeToggleProps) {
  const { colorMode, setColorMode } = useColorMode()
  const dim = size === 'compact' ? 'w-7 h-7' : 'w-9 h-9'
  const icon = size === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  return (
    <div
      role="group"
      aria-label="Color theme"
      className={[
        'inline-flex items-center gap-0.5 p-1 rounded-[var(--radius-md)]',
        'bg-[var(--bg-card-premium)] border border-[var(--border-card-premium)]',
        className ?? '',
      ].join(' ')}
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const active = colorMode === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setColorMode(value)}
            aria-pressed={active}
            aria-label={`Switch to ${label} theme`}
            title={label}
            className={[
              dim,
              'flex items-center justify-center rounded-[var(--radius-sm)]',
              'transition-colors duration-[var(--dur-fast)] ease-[var(--ease-out-expo)]',
              active
                ? 'bg-[var(--color-brand-soft)] text-[var(--color-brand-strong)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
            ].join(' ')}
          >
            <Icon className={icon} strokeWidth={1.8} />
          </button>
        )
      })}
    </div>
  )
}
