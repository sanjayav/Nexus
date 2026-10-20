import { Check } from 'lucide-react'
import clsx from 'clsx'
import { motion } from 'motion/react'
import { fmt, useStrings } from '@/lib/i18n'
import { spring } from '@/components/ui'
import { dataImportStrings, type StepId } from '@/features/data-import/dataImport.strings'

/**
 * Four-step progress header. Completed steps are clickable to go back; the
 * active step's pill slides between items. Below `sm` it compresses to
 * "Step 2 of 4 · Map columns" over a segmented bar.
 */
export function Stepper({
  steps,
  current,
  done,
  onSelect,
}: {
  steps: StepId[]
  current: number
  done: boolean
  onSelect: (i: number) => void
}) {
  const s = useStrings(dataImportStrings)
  const reached = (i: number) => done || i < current

  return (
    <nav aria-label={s.title}>
      {/* Mobile */}
      <div className="sm:hidden">
        <div className="text-[13px] text-zinc-500">
          <span className="tabular">{fmt(s.stepOf, { n: Math.min(current + 1, steps.length), total: steps.length })}</span>
          <span className="mx-1.5 text-zinc-300">·</span>
          <span className="font-medium text-zinc-900">{s.steps[steps[current]]}</span>
        </div>
        <div className="mt-2.5 grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((id, i) => (
            <span
              key={id}
              className={clsx(
                'h-1 rounded-full transition-colors duration-200',
                reached(i) || i === current ? 'bg-zinc-900' : 'bg-zinc-900/10',
              )}
            />
          ))}
        </div>
      </div>

      {/* sm and up */}
      <ol className="hidden sm:flex items-center gap-1">
        {steps.map((id, i) => {
          const active = i === current && !done
          const complete = reached(i)
          const clickable = complete && !done
          return (
            <li key={id} className="flex items-center gap-1 min-w-0 flex-1 last:flex-none">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onSelect(i)}
                aria-current={active ? 'step' : undefined}
                className={clsx(
                  'relative h-9 pl-1.5 pr-3 rounded-[10px] inline-flex items-center gap-2 text-[13px] font-medium whitespace-nowrap transition-colors duration-150 min-w-0',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40',
                  active ? 'text-zinc-900' : complete ? 'text-zinc-700 hover:text-zinc-900' : 'text-zinc-400',
                  clickable ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="import-step"
                    transition={spring}
                    className="absolute inset-0 rounded-[10px] bg-white shadow-card ring-1 ring-zinc-900/[0.06]"
                  />
                )}
                <span
                  className={clsx(
                    'relative w-6 h-6 rounded-full flex items-center justify-center text-[11px] tabular shrink-0 transition-colors duration-200',
                    complete ? 'bg-zinc-900 text-white' : active ? 'bg-zinc-900 text-white' : 'bg-zinc-900/[0.06] text-zinc-500',
                  )}
                >
                  {complete ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : i + 1}
                </span>
                <span className="relative truncate">{s.steps[id]}</span>
              </button>
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={clsx('h-px flex-1 min-w-3 transition-colors duration-200', complete ? 'bg-zinc-900/40' : 'bg-zinc-900/10')}
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
