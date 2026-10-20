import { AnimatePresence, motion } from 'motion/react'
import { Badge, spring, type Tone } from '@/components/ui'
import { useStrings } from '@/lib/i18n'
import type { DataStatus, Risk } from '@/features/suppliers/data'
import { suppliersStrings } from '@/features/suppliers/suppliers.strings'

export const STATUS_TONE: Record<DataStatus, Tone> = {
  notInvited: 'neutral',
  invited: 'info',
  filling: 'warning',
  submitted: 'info',
  verified: 'success',
}
export const RISK_TONE: Record<Risk, Tone> = { high: 'danger', medium: 'warning', low: 'success' }
export const STATUS_ORDER: DataStatus[] = ['notInvited', 'invited', 'filling', 'submitted', 'verified']

export const compactSelect =
  'h-9 pl-3 pr-8 rounded-[10px] bg-white border border-line text-[13px] text-zinc-800 shadow-card hover:border-zinc-300 focus:outline-none focus:ring-[3px] focus:ring-brand-500/20 focus:border-brand-600 max-w-full truncate'

/** Status badge that pops when the status changes (not on first render). */
export function StatusBadge({ status }: { status: DataStatus }) {
  const s = useStrings(suppliersStrings)
  return (
    <span className="inline-flex">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          className="inline-flex"
          initial={{ opacity: 0, scale: 0.85, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={spring}
        >
          <Badge tone={STATUS_TONE[status]} dot>
            {s.status[status]}
          </Badge>
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
