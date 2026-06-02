import NexusBrand from './NexusBrand'

interface NexusBrandCardProps {
  industry?: string | null
  collapsed?: boolean
  variant?: 'light' | 'dark'
}

export default function NexusBrandCard({ industry, collapsed = false, variant = 'dark' }: NexusBrandCardProps) {
  const industryLabel = (industry || 'SUSTAINABILITY').toUpperCase()

  if (collapsed) {
    return (
      <div className="flex items-center justify-center">
        <NexusBrand size="sm" layout="horizontal" animated={false} showAttribution={false} variant={variant} />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 min-w-0">
      <NexusBrand size="md" layout="horizontal" animated={false} showAttribution={false} variant={variant} />
      <div className="flex flex-col leading-none min-w-0 ml-1">
        <span
          className="text-[8.5px] font-medium tracking-[0.15em] uppercase"
          style={{ color: variant === 'light' ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.45)' }}
        >
          by Aeiforo
        </span>
        <span
          className="block mt-1.5 h-px w-8"
          style={{ background: variant === 'light' ? 'rgba(15,23,42,0.15)' : 'rgba(255,255,255,0.12)' }}
        />
        <span
          className="text-[8.5px] font-semibold tracking-[0.14em] uppercase mt-1.5 truncate"
          style={{ color: variant === 'light' ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.55)' }}
          title={`${industryLabel} · ESG REPORTING`}
        >
          {industryLabel} · ESG
        </span>
      </div>
    </div>
  )
}
