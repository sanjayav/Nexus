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
  color = 'url(#ring-gradient)',
  trackColor = 'var(--bg-tertiary)',
  label,
  className = '',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(value, 100) / 100) * circumference

  return (
    <div className={`inline-flex flex-col items-center gap-3 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent-teal)" />
              <stop offset="100%" stopColor="#10B981" />
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
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[var(--text-3xl)] font-bold text-[var(--text-primary)] leading-none tracking-tight tabular-nums">
            {Math.round(value)}
          </span>
          <span className="text-[11px] text-[var(--text-tertiary)] font-medium mt-0.5">percent</span>
        </div>
      </div>
      {label && (
        <span className="text-[var(--text-sm)] text-[var(--text-secondary)] font-medium">{label}</span>
      )}
    </div>
  )
}
