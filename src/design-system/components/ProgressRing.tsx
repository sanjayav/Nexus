import { useId } from 'react'
import { useTranslation } from 'react-i18next'

interface ProgressRingProps {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  label?: string
  className?: string
}

export default function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  color,
  trackColor = 'var(--bg-tertiary)',
  label,
  className = '',
}: ProgressRingProps) {
  const { t } = useTranslation()
  const gradId = `ring-${useId().replace(/:/g, '')}`
  const stroke = color ?? `url(#${gradId})`
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(value, 100) / 100) * circumference

  return (
    <div className={`inline-flex flex-col items-center gap-3 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent-700)" />
              <stop offset="100%" stopColor="var(--accent-400)" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.9s var(--ease-out)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="type-figure text-[length:var(--text-3xl)] text-[var(--text-primary)] leading-none">
            {Math.round(value)}
          </span>
          <span className="text-caption text-[var(--text-tertiary)] font-medium mt-0.5">{t('ui.percent')}</span>
        </div>
      </div>
      {label && (
        <span className="text-small text-[var(--text-secondary)] font-medium">{label}</span>
      )}
    </div>
  )
}
