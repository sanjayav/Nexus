import { ReactNode, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { HelpCircle } from 'lucide-react'
import { useStrings } from '@/lib/i18n'
import { useL10n } from '@/features/workspace/WorkspaceContext'
import { useDismiss } from '@/lib/hooks/useDismiss'
import { GLOSSARY, type GlossaryKey } from '@/lib/i18n/glossary'
import { helpStrings } from './help.strings'

/**
 * Jargon with an explanation on hover, focus or tap. Readers who know the term
 * lose nothing; readers who don't get a plain-language definition in place.
 */
export function Term({ id, children }: { id: GlossaryKey; children?: ReactNode }) {
  const s = useStrings(helpStrings)
  const l10n = useL10n()
  const entry = GLOSSARY[id]
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const tipId = useId()
  useDismiss(ref, open, () => setOpen(false))

  return (
    <span ref={ref} className="relative inline-flex items-center" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-describedby={open ? tipId : undefined}
        className="inline-flex items-center gap-1 underline decoration-dotted decoration-zinc-400 underline-offset-[3px] hover:decoration-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded-sm"
      >
        {children ?? l10n(entry.term)}
        <HelpCircle className="w-3 h-3 text-zinc-400" aria-label={s.whatIsThis} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.span
            id={tipId}
            role="tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 top-full mt-2 z-50 w-72 max-w-[80vw] rounded-xl bg-zinc-900 text-white p-3 shadow-pop text-left font-normal normal-case tracking-normal"
          >
            <span className="block text-[12px] font-semibold text-white">{l10n(entry.term)}</span>
            <span className="block mt-1 text-[12.5px] leading-relaxed text-zinc-200">{l10n(entry.plain)}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
