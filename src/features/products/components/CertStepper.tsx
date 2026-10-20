import clsx from 'clsx'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { softSpring } from '@/components/ui'
import { CERT_STAGES, type CertStage } from '@/features/products/data'

/**
 * Certification pipeline: 未申请 → 申请中 → 现场审核 → 已获证.
 * The filled connector grows to the current step on a spring.
 */
export function CertStepper({ stage, labels }: { stage: CertStage; labels: Record<CertStage, string> }) {
  const idx = CERT_STAGES.indexOf(stage)
  const last = CERT_STAGES.length - 1
  return (
    <div className="relative" role="list">
      {/* Connector runs between the first and last dot centres (columns are equal width). */}
      <div
        className="absolute top-[9px] h-0.5 rounded-full bg-zinc-900/[0.08]"
        style={{ left: `${50 / CERT_STAGES.length}%`, right: `${50 / CERT_STAGES.length}%` }}
      >
        <motion.div
          className="h-full rounded-full bg-emerald-500 origin-left"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: idx / last }}
          transition={softSpring}
        />
      </div>
      <div className="relative grid" style={{ gridTemplateColumns: `repeat(${CERT_STAGES.length}, minmax(0, 1fr))` }}>
        {CERT_STAGES.map((st, i) => {
          const done = i < idx || (i === idx && i === last)
          const current = i === idx && !done
          return (
            <div
              key={st}
              role="listitem"
              aria-current={i === idx ? 'step' : undefined}
              className="flex flex-col items-center gap-1.5 min-w-0"
            >
              <motion.span
                initial={false}
                animate={{ scale: i === idx ? 1 : 0.86 }}
                transition={softSpring}
                className={clsx(
                  'w-5 h-5 rounded-full flex items-center justify-center ring-1 ring-inset transition-colors duration-200',
                  done && 'bg-emerald-500 ring-emerald-500 text-white',
                  current && 'bg-white ring-emerald-500 ring-2',
                  !done && !current && 'bg-white ring-zinc-900/[0.12]',
                )}
              >
                {done ? (
                  <Check className="w-3 h-3" strokeWidth={3} />
                ) : current ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ) : null}
              </motion.span>
              <span
                className={clsx('text-[11px] leading-tight text-center px-0.5', i <= idx ? 'text-zinc-800 font-medium' : 'text-zinc-400')}
              >
                {labels[st]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
